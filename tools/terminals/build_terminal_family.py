"""Run in background Blender. Builds only the explicitly selected output bundle."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import re
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
VERSION = "terminal-family/1"
FORMS = ("pedestal", "console", "wall")
FORM_LABELS = {"pedestal": "Standterminal", "console": "Pult", "wall": "Wandterminal"}
SIZE_LABELS = {"compact": "Kompakt", "standard": "Standard"}
DEFAULT_RECIPE = "assets/specs/props/terminal-family.json"
DEFAULT_OUT = "assets/generated/props/terminals"
LIMITS = {"triangles": 2400, "materials": 5, "glbBytes": 200000}


def local(value):
    resolved = (ROOT / value).resolve()
    if not resolved.is_relative_to(ROOT) or resolved == ROOT:
        raise ValueError("Path must be a child of the project")
    return resolved


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def fields(value, expected, label):
    if not isinstance(value, dict) or set(value) != set(expected):
        raise ValueError(f"{label}: expected fields {expected}")


def validate(recipe):
    fields(recipe, ("schemaVersion", "family", "seed", "forms", "sizes", "palettes", "budgets", "source"), "recipe")
    if recipe["schemaVersion"] != 1 or recipe["family"] != "neon-terminal":
        raise ValueError("Unknown terminal recipe")
    if type(recipe["seed"]) is not int or not 0 <= recipe["seed"] <= 0xFFFFFFFF:
        raise ValueError("seed must be uint32")
    forms = recipe["forms"]
    if not isinstance(forms, list) or not forms or len(forms) != len(set(forms)) or any(f not in FORMS for f in forms):
        raise ValueError("Invalid forms")
    sizes = recipe["sizes"]
    if not isinstance(sizes, dict) or not sizes or set(sizes) - {"compact", "standard"}:
        raise ValueError("Invalid sizes")
    for scale in sizes.values():
        if type(scale) not in (float, int) or not math.isfinite(scale) or not 0.65 <= scale <= 1.25:
            raise ValueError("size scale outside 0.65..1.25")
    palettes = recipe["palettes"]
    if not isinstance(palettes, dict) or not 1 <= len(palettes) <= 8:
        raise ValueError("Expected 1..8 palettes")
    for key, palette in palettes.items():
        if not re.fullmatch(r"[a-z][a-z0-9-]{0,47}", key):
            raise ValueError("Invalid palette ID")
        fields(palette, ("label", "body", "trim", "accent"), "palette")
        if not isinstance(palette["label"], str) or not 1 <= len(palette["label"]) <= 64:
            raise ValueError("Invalid palette label")
        if any(not isinstance(palette[r], str) or not re.fullmatch(r"#[0-9A-Fa-f]{6}", palette[r]) for r in ("body", "trim", "accent")):
            raise ValueError("Invalid palette color")
    fields(recipe["budgets"], LIMITS, "budgets")
    if any(type(v) is not int or not 0 < v <= LIMITS[k] for k, v in recipe["budgets"].items()):
        raise ValueError("Budget exceeds pilot limit")
    if not isinstance(recipe["source"], str) or not 1 <= len(recipe["source"]) <= 1000:
        raise ValueError("Invalid provenance")


def rgb(hex_color):
    return np.array([int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32)


def linear(hex_color):
    c = rgb(hex_color)
    return tuple(np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))


def material(name, color, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = (*linear(color), 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = 0.63
    return mat


def display_material(asset_id, palette, seed, texture_path):
    # Original geometric interface: no fonts, copied logos or external image data.
    width = height = 128
    pixels = np.empty((height, width, 4), dtype=np.float32)
    pixels[:] = (*rgb("#08131F"), 1)
    accent = rgb(palette["accent"])
    ink = rgb("#D8E9EC")
    pixels[8:12, 8:120, :3] = accent
    pixels[21:67, 8:70, :3] = rgb("#142B3B")
    pixels[25:28, 12:63, :3] = ink
    rng = np.random.Generator(np.random.PCG64(seed))
    for row, length in enumerate(rng.integers(20, 52, size=5)):
        y = 34 + row * 6
        pixels[y:y + 2, 12:12 + int(length), :3] = accent
    yy, xx = np.mgrid[0:height, 0:width]
    radius = np.sqrt((xx - 96) ** 2 + (yy - 43) ** 2)
    pixels[(radius >= 16) & (radius < 19), :3] = accent
    pixels[40:46, 86:106, :3] = ink
    for i in range(3):
        pixels[80:94, 8 + i * 38:40 + i * 38, :3] = accent * (0.5 + i * 0.2)
        pixels[102:105, 8 + i * 38:35 + i * 38, :3] = ink
    pixels[116:119, 8:120, :3] = rgb("#29404C")
    image = bpy.data.images.new(f"{asset_id}-display", width=width, height=height, alpha=True)
    image.pixels.foreach_set(pixels[::-1].ravel())
    image.filepath_raw = str(texture_path)
    image.file_format = "PNG"
    image.save()
    image.pack()
    mat = material("Display", "#FFFFFF")
    shader = mat.node_tree.nodes["Principled BSDF"]
    shader.inputs["Roughness"].default_value = 0.88
    shader.inputs["Emission Strength"].default_value = 0.65
    node = mat.node_tree.nodes.new("ShaderNodeTexImage")
    node.image = image
    node.interpolation = "Closest"
    mat.node_tree.links.new(node.outputs["Color"], shader.inputs["Base Color"])
    mat.node_tree.links.new(node.outputs["Color"], shader.inputs["Emission Color"])
    return mat


def make_mesh(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(np.asarray(vertices, dtype=float).tolist(), [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    return obj


def chamfer_ring(width, depth, chamfer, z):
    x, y, c = width / 2, depth / 2, chamfer
    return np.array([(-x + c, -y, z), (x - c, -y, z), (x, -y + c, z), (x, y - c, z), (x - c, y, z), (-x + c, y, z), (-x, y - c, z), (-x, -y + c, z)])


def hull(name, rings, mat):
    vertices = np.concatenate([chamfer_ring(w, d, c, z) for z, w, d, c in rings])
    faces = [tuple(reversed(range(8))), tuple(range((len(rings) - 1) * 8, len(rings) * 8))]
    for level in range(len(rings) - 1):
        for i in range(8):
            j = (i + 1) % 8
            faces.append((level * 8 + i, level * 8 + j, (level + 1) * 8 + j, (level + 1) * 8 + i))
    return make_mesh(name, vertices, faces, mat)


def box(name, dimensions, center, mat, bevel=0.008):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("One-segment chamfer", "BEVEL")
        mod.width = min(bevel, min(dimensions) * 0.25)
        mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def panel(name, width, height, center, angle, frame_mat, screen_mat):
    # A local upright panel faces Blender -Y. Its tilt is around X.
    frame = box(name + " frame", (width, 0.035, height), center, frame_mat, 0.012)
    frame.rotation_euler.x = angle
    w, h = width / 2 - 0.024, height / 2 - 0.024
    corners = np.array([[-w, -0.020, -h], [w, -0.020, -h], [w, -0.020, h], [-w, -0.020, h]])
    cos, sin = math.cos(angle), math.sin(angle)
    rotate = np.array([[1, 0, 0], [0, cos, -sin], [0, sin, cos]])
    vertices = corners @ rotate.T + np.array(center)
    obj = make_mesh(name + " screen", vertices, [(0, 1, 2, 3)], screen_mat)
    uv = obj.data.uv_layers.new(name="DisplayUV")
    for loop, coord in zip(uv.data, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop.uv = coord


def combine_by_material(root):
    groups = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type == "MESH":
            groups.setdefault(obj.data.materials[0].name, []).append(obj)
    for name, objects in sorted(groups.items()):
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = name
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if name != "Display":
            # Solid swatches need no UV data. Blender's bevel UV interpolation
            # can differ by a float ULP between processes; exclude unused data.
            while obj.data.uv_layers:
                obj.data.uv_layers.remove(obj.data.uv_layers[0])
        obj.parent = root


def geometry(form, mats):
    shell, trim, accent, dark, screen = mats
    if form == "pedestal":
        hull("Foundation", [(0, .49, .42, .035), (.055, .49, .42, .035), (.085, .40, .34, .03)], dark)
        hull("Column", [(.055, .37, .31, .035), (.72, .36, .29, .035), (1.04, .48, .31, .04)], shell)
        panel("Main", .405, .285, (0, -.20, .865), math.radians(-8), trim, screen)
        panel("Controls", .29, .10, (0, -.172, .62), math.radians(-15), dark, screen)
        box("Accent crown", (.37, .026, .026), (0, -.174, 1.025), accent, .003)
        box("Badge", (.055, .015, .055), (0, -.162, .43), accent, .005)
        for i in range(4):
            box("Vent", (.20, .012, .012), (0, .159, .23 + i * .032), dark, .001)
    elif form == "console":
        hull("Base", [(0, .64, .46, .035), (.055, .64, .46, .035)], dark)
        hull("Supports", [(.04, .48, .32, .03), (.30, .48, .32, .03)], trim)
        hull("Housing", [(.27, .72, .49, .04), (.46, .72, .49, .04), (.58, .66, .40, .035)], shell)
        panel("Main", .60, .28, (0, -.16, .56), math.radians(-35), dark, screen)
        box("Side accent left", (.025, .32, .035), (-.34, -.01, .455), accent, .004)
        box("Side accent right", (.025, .32, .035), (.34, -.01, .455), accent, .004)
        for i in range(3):
            box("Vent", (.27, .012, .014), (0, .249, .33 + i * .035), dark, .001)
    else:
        box("Wall bracket", (.26, .07, .33), (0, .12, .24), dark, .008)
        hull("Housing", [(0, .36, .18, .025), (.49, .44, .20, .03)], shell)
        panel("Main", .355, .285, (0, -.111, .30), 0, trim, screen)
        box("Status bar", (.25, .016, .022), (0, -.104, .067), accent, .003)
        box("Scanner", (.08, .018, .025), (0, -.111, .12), dark, .002)


def statistics():
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    points = np.concatenate([np.array([tuple(o.matrix_world @ v.co) for v in o.data.vertices]) for o in meshes])
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        if any(poly.area <= 1e-12 for poly in obj.data.polygons):
            raise ValueError("Degenerate polygon")
    assert np.isfinite(points).all()
    bounds = {"min": points.min(axis=0).tolist(), "max": points.max(axis=0).tolist()}
    return {"triangles": triangles, "vertices": len(points), "materials": len({m.name for o in meshes for m in o.data.materials}), "meshObjects": len(meshes), "boundsBlender": bounds, "dimensions": (points.max(axis=0) - points.min(axis=0)).tolist()}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--recipe", default=DEFAULT_RECIPE)
    parser.add_argument("--out", default=DEFAULT_OUT)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--only")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    recipe_path, out = local(args.recipe), local(args.out)
    if recipe_path.stat().st_size > 32768:
        raise ValueError("Recipe exceeds 32KiB")
    recipe_bytes = recipe_path.read_bytes()
    recipe = json.loads(recipe_bytes)
    validate(recipe)
    code_sha = digest(Path(__file__).read_bytes())
    for directory in ("glb", "source", "textures", "recipes"):
        (out / directory).mkdir(parents=True, exist_ok=True)
    old = json.loads((out / "manifest.json").read_text()) if (out / "manifest.json").exists() else {}
    previous = {a["id"]: a for a in old.get("assets", [])}
    combinations = [(f, s, p) for f in recipe["forms"] for s in sorted(recipe["sizes"]) for p in sorted(recipe["palettes"])]
    known_ids = {f"terminal-{f}-{s}-{p}" for f, s, p in combinations}
    if args.only and args.only not in known_ids:
        raise ValueError("--only is not a recipe asset ID")
    assets, built = [], 0
    for form, size, palette_id in combinations:
        asset_id = f"terminal-{form}-{size}-{palette_id}"
        if args.only and asset_id != args.only:
            continue
        spec = {"schemaVersion": 1, "family": "neon-terminal", "id": asset_id, "form": form, "size": size, "scale": recipe["sizes"][size], "organization": palette_id, "palette": recipe["palettes"][palette_id], "seed": recipe["seed"]}
        build_hash = digest(canonical({"spec": spec, "budgets": recipe["budgets"], "generator": VERSION, "code": code_sha, "blender": bpy.app.version_string, "numpy": np.__version__}))
        cached = previous.get(asset_id)
        if not args.force and cached and cached.get("buildHash") == build_hash and all((out / f).resolve().is_relative_to(out) and (out / f).is_file() and digest((out / f).read_bytes()) == sha for f, sha in cached["files"].items()):
            assets.append(cached)
            print("NC_TERMINAL " + json.dumps({"id": asset_id, "cache": True}), flush=True)
            continue
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.preferences.filepaths.save_version = 0
        bpy.context.scene.unit_settings.system = "METRIC"
        bpy.context.scene.unit_settings.scale_length = 1
        palette = spec["palette"]
        mats = [material("Housing", palette["body"], .12), material("Trim", palette["trim"], .28), material("Identity", palette["accent"]), material("Rubber", "#111922"), display_material(asset_id, palette, spec["seed"], out / "textures" / f"{asset_id}.png")]
        root = bpy.data.objects.new(asset_id, None)
        bpy.context.collection.objects.link(root)
        geometry(form, mats)
        combine_by_material(root)
        root.scale = (spec["scale"],) * 3
        root["terminalRecipe"] = canonical(spec).decode("utf-8")
        root["generator"] = VERSION
        root["recipeHash"] = build_hash
        root["source"] = "Project-authored geometry and display; cosmetic palette from project concept"
        bpy.context.view_layer.update()
        stats = statistics()
        if stats["triangles"] > recipe["budgets"]["triangles"] or stats["materials"] > recipe["budgets"]["materials"]:
            raise ValueError(f"Budget exceeded: {asset_id}")
        if abs(stats["boundsBlender"]["min"][2]) > .0001:
            raise ValueError("Origin must lie at the bottom of the asset")
        glb_path = out / "glb" / f"{asset_id}.glb"
        blend_path = out / "source" / f"{asset_id}.blend"
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=True)
        bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format="GLB", use_selection=False, export_cameras=False, export_lights=False, export_extras=True, export_animations=False, export_materials="EXPORT", export_yup=True, export_image_format="AUTO")
        if glb_path.stat().st_size > recipe["budgets"]["glbBytes"]:
            raise ValueError("GLB byte budget exceeded")
        (out / "recipes" / f"{asset_id}.json").write_bytes(json.dumps(spec, indent=2, ensure_ascii=False).encode() + b"\n")
        files = [f"glb/{asset_id}.glb", f"source/{asset_id}.blend", f"textures/{asset_id}.png", f"recipes/{asset_id}.json"]
        record = {"id": asset_id, "label": f"{FORM_LABELS[form]} · {SIZE_LABELS[size]} · {palette['label']}", "spec": spec, "buildHash": build_hash, "bytes": glb_path.stat().st_size, "stats": stats, "files": {f: digest((out / f).read_bytes()) for f in files}}
        assets.append(record)
        built += 1
        print("NC_TERMINAL " + json.dumps({"id": asset_id, "cache": False, "triangles": stats["triangles"]}), flush=True)
    manifest = {"schemaVersion": 1, "generator": VERSION, "recipe": str(recipe_path.relative_to(ROOT)), "recipeSha256": digest(recipe_bytes), "codeSha256": code_sha, "toolVersions": {"blender": bpy.app.version_string, "python": sys.version.split()[0], "numpy": np.__version__}, "license": "LicenseRef-Project-Authored", "source": recipe["source"], "budgets": recipe["budgets"], "assets": assets, "lastRun": {"built": built, "cacheHits": len(assets) - built}, "humanArtAcceptance": "open", "missionIntegration": "not part of pilot"}
    (out / "manifest.json").write_bytes(json.dumps(manifest, indent=2, ensure_ascii=False).encode() + b"\n")
    catalog = {"schemaVersion": 1, "family": "neon-terminal", "generator": VERSION, "assets": [{"id": a["id"], "label": a["label"], "file": a["id"] + ".glb", "sha256": a["files"][f"glb/{a['id']}.glb"], "bytes": a["bytes"], "stats": a["stats"], "spec": a["spec"]} for a in assets]}
    (out / "catalog.json").write_bytes(json.dumps(catalog, indent=2, ensure_ascii=False).encode() + b"\n")
    print("NC_TERMINAL_RESULT " + json.dumps({"assets": len(assets), "built": built, "cacheHits": len(assets) - built, "output": str(out.relative_to(ROOT))}), flush=True)


if __name__ == "__main__":
    main()
