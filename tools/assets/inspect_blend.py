"""Read-only asset inventory, run with Blender --background --disable-autoexec.

Only generated JSON, logs and review thumbnails are written inside the project.
Never saves a loaded blend file. Source texts and drivers are not executed.
"""
import argparse
import hashlib
import json
import math
import re
import struct
import sys
import time
import traceback
from collections import Counter, defaultdict
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
VERSION = "1.0.0"
RENDER = {"width": 240, "height": 200, "samples": 4, "style": "neutral review; diffuse material swatches; uniform framing; no asset edits saved"}
COMPONENT_PREFIXES = ("Barrel", "Bayonet", "Bipod", "Body", "Cylinder", "Flashlight", "Grip", "Handguard", "Magazine", "Scope", "Sight", "Silencer", "Stock", "Tripod")


def digest(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def encoded_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def opened(path):
    bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False, use_scripts=False)
    scene = bpy.context.scene
    visibility = {obj.name: {"hideViewport": obj.hide_viewport, "hideRender": obj.hide_render, "hideLocal": obj.hide_get()} for obj in scene.objects}
    def enable_collection(layer):
        layer.exclude = False
        layer.hide_viewport = False
        layer.collection.hide_viewport = False
        for child in layer.children:
            enable_collection(child)
    enable_collection(bpy.context.view_layer.layer_collection)
    for obj in scene.objects:
        obj.hide_viewport = False
        obj.hide_set(False)
    for rig in [o for o in scene.objects if o.type == "ARMATURE"]:
        rig.data.pose_position = "REST"
        if rig.animation_data:
            rig.animation_data.action = None
            for track in rig.animation_data.nla_tracks:
                track.mute = True
    bpy.context.view_layer.update()
    return scene, visibility


def coordinates(objects):
    graph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in objects:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        try:
            points.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    return points


def bounds(points):
    if not points:
        return None
    low = [min(p[i] for p in points) for i in range(3)]
    high = [max(p[i] for p in points) for i in range(3)]
    return {"min": low, "max": high, "size": [high[i] - low[i] for i in range(3)]}


def rig_record(rig):
    return {"name": rig.name, "objectMatrix": [round(v, 7) for row in rig.matrix_world for v in row], "bones": [
        {"name": bone.name, "parent": bone.parent.name if bone.parent else None, "deform": bone.use_deform,
         "restMatrix": [round(v, 7) for row in bone.matrix_local for v in row]}
        for bone in sorted(rig.data.bones, key=lambda b: b.name)]}


def curves(action):
    if hasattr(action, "fcurves"):
        return list(action.fcurves)
    return [curve for layer in action.layers for strip in layer.strips for bag in strip.channelbags for curve in bag.fcurves]


def action_record(action):
    entries = []
    moving = 0
    for curve in curves(action):
        keys = [[round(float(v), 6) for v in (*point.co, *point.handle_left, *point.handle_right)] + [point.interpolation] for point in curve.keyframe_points]
        values = [float(point.co.y) for point in curve.keyframe_points]
        moving += bool(values and max(values) - min(values) > 0.000001)
        entries.append([curve.data_path, curve.array_index, curve.extrapolation, keys])
    return {"name": action.name, "frames": [float(v) for v in action.frame_range], "curves": len(entries), "movingCurves": moving,
            "curveHash": encoded_hash(sorted(entries, key=lambda c: (c[0], c[1]))), "probe": "curves-only"}


def groups_for(meshes):
    groups = defaultdict(dict)
    for obj in meshes:
        match = re.fullmatch(r"(.+)_(Head|Body|Legs|Pants|Feet)", obj.name)
        if match:
            groups[match[1]][{"Head": "head", "Body": "body", "Legs": "legs", "Pants": "legs", "Feet": "feet"}[match[2]]] = obj.name
    aliases = []
    # Source spelling is retained; this alias is explicitly reported for review.
    if "Formal" in groups and "head" not in groups["Formal"] and groups.get("Formad", {}).get("head"):
        groups["Formal"]["head"] = groups["Formad"].pop("head")
        aliases.append({"source": "Formad_Head", "group": "Formal", "purpose": "review grouping only; source name unchanged"})
    return {name: parts for name, parts in sorted(groups.items()) if parts}, aliases


def probe_animations(scene, rigs, groups, actions):
    if not rigs or not groups:
        return
    full = [parts for parts in groups.values() if len(parts) == 4]
    if not full:
        return
    selected = next((parts for name, parts in groups.items() if name in ("Casual2", "Casual") and len(parts) == 4), full[0])
    meshes = [scene.objects[name] for name in selected.values()]
    rest = coordinates(meshes)
    rig = rigs[0]
    for record in actions:
        action = bpy.data.actions[record["name"]]
        rig.data.pose_position = "POSE"
        rig.animation_data_create()
        rig.animation_data.action = action
        if len(action.slots):
            rig.animation_data.action_slot = action.slots[0]
        start, end = action.frame_range
        displacement, temporal, floor, first = [], [], [], None
        for fraction in (0, 0.25, 0.5, 0.75, 1):
            frame = start + (end - start) * fraction
            scene.frame_set(math.floor(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            points = coordinates(meshes)
            if len(points) != len(rest):
                record.update({"probe": "topology-changes", "sampleParts": list(selected.values())})
                break
            displacement.append(max(((a - b).length for a, b in zip(points, rest)), default=0))
            if first is None:
                first = points
            temporal.append(max(((a - b).length for a, b in zip(points, first)), default=0))
            floor.append(min((p.z for p in points), default=0))
        else:
            record.update({"probe": "five-frame-skin-sample", "sampleParts": list(selected.values()), "maxVertexDisplacement": max(displacement), "temporalVertexMotion": max(temporal), "floorRange": [min(floor), max(floor)]})
    rig.animation_data.action = None
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()


def dependency_record(raw, source, allowed):
    path = Path(bpy.path.abspath(raw)).resolve()
    # Do not follow arbitrary source references outside the two authorized roots.
    if not any(path.is_relative_to(root) for root in allowed):
        return {"path": str(path), "state": "outside-inspected-roots"}
    if not path.is_file():
        return {"path": str(path), "state": "missing"}
    return {"path": str(path), "state": "present", "sha256": digest(path)}


def inspect(path, relative, allowed):
    scene, visibility = opened(path)
    meshes = sorted([o for o in scene.objects if o.type == "MESH"], key=lambda o: o.name)
    rigs = sorted([o for o in scene.objects if o.type == "ARMATURE"], key=lambda o: o.name)
    bone_names = {bone.name for rig in rigs for bone in rig.data.bones}
    graph = bpy.context.evaluated_depsgraph_get()
    records, all_points = [], []
    for obj in meshes:
        skinned = any(m.type == "ARMATURE" and m.object for m in obj.modifiers)
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            points = [v.co.copy() for v in mesh.vertices]
            all_points.extend(evaluated.matrix_world @ point for point in points)
            center = Vector((0, 0, 0))
            if points:
                for i in range(3):
                    center[i] = (min(p[i] for p in points) + max(p[i] for p in points)) / 2
            shape = hashlib.sha256()
            for point in points:
                shape.update(struct.pack("<3q", *(round(float(v) * 1_000_000) for v in point - center)))
            for triangle in mesh.loop_triangles:
                shape.update(struct.pack("<3I", *triangle.vertices))
            unweighted, over_four, worst = 0, 0, 0
            for vertex in obj.data.vertices:
                weights = [g.weight for g in vertex.groups if obj.vertex_groups[g.group].name in bone_names and g.weight > 0.000001]
                if skinned:
                    unweighted += not weights
                    over_four += len(weights) > 4
                    worst = max(worst, abs(sum(weights) - 1))
            records.append({"name": obj.name, "vertices": len(mesh.vertices), "triangles": len(mesh.loop_triangles), "shapeHash": shape.hexdigest(),
                            "materials": [m.name for m in obj.data.materials if m], "modifiers": [m.type for m in obj.modifiers], "sourceVisibility": visibility[obj.name],
                            "bounds": bounds([evaluated.matrix_world @ p for p in points]), "finite": all(math.isfinite(v) for p in points for v in p),
                            "skin": {"unweightedVertices": unweighted, "overFourInfluences": over_four, "maxWeightSumDeviation": worst} if skinned else None})
        finally:
            evaluated.to_mesh_clear()
    materials = sorted({m for obj in meshes for m in obj.data.materials if m}, key=lambda m: m.name)
    used_images = {n.image for m in materials if m.use_nodes and m.node_tree for n in m.node_tree.nodes if n.type == "TEX_IMAGE" and n.image}
    images = []
    dependencies = []
    for image in sorted(bpy.data.images, key=lambda i: i.name):
        if image.source != "FILE":
            continue
        dep = None if image.packed_file else dependency_record(image.filepath, path, allowed)
        if dep:
            dependencies.append(dep)
        images.append({"name": image.name, "usedByMaterial": image in used_images, "packed": bool(image.packed_file), "dependency": dep})
    for library in bpy.data.libraries:
        dependencies.append(dependency_record(library.filepath, path, allowed))
    groups, aliases = groups_for(meshes)
    actions = [action_record(action) for action in sorted(bpy.data.actions, key=lambda a: a.name)]
    probe_animations(scene, rigs, groups, actions)
    category = "characters" if rigs else "components" if path.stem.split("_")[0] in COMPONENT_PREFIXES else "weapons"
    flags = []
    if aliases:
        flags.append("source-name-alias")
    if any(not mesh["finite"] for mesh in records):
        flags.append("non-finite-geometry")
    if any(mesh["triangles"] == 0 for mesh in records):
        flags.append("empty-mesh")
    if any(i["usedByMaterial"] and i["dependency"] and i["dependency"]["state"] != "present" for i in images):
        flags.append("unresolved-used-texture")
    if any(a["movingCurves"] > 0 and a.get("temporalVertexMotion", 1) < 0.000001 for a in actions):
        flags.append("static-animation")
    if any(m["skin"] and m["skin"]["maxWeightSumDeviation"] > 0.001 for m in records):
        flags.append("raw-skin-weights-not-normalized")
    if any(m["skin"] and m["skin"]["overFourInfluences"] > 0 for m in records):
        flags.append("raw-skin-over-four-influences")
    return {"path": relative, "category": category, "status": "ok", "sceneUnits": {"system": scene.unit_settings.system, "scaleLength": scene.unit_settings.scale_length},
            "evaluation": "All source objects and collections temporarily enabled in this background process; rest-pose modifiers evaluated; original visibility recorded; source never saved.",
            "objects": len(scene.objects), "meshes": records, "triangles": sum(m["triangles"] for m in records), "bounds": bounds(all_points),
            "materials": [{"name": m.name, "diffuseColor": list(m.diffuse_color), "nodeTypes": sorted({n.type for n in m.node_tree.nodes}) if m.use_nodes and m.node_tree else []} for m in materials],
            "images": images, "dependencies": dependencies, "rigs": [rig_record(rig) for rig in rigs], "actions": actions,
            "groups": groups, "aliases": aliases, "flags": flags, "textBlockNames": sorted(t.name for t in bpy.data.texts), "thumbnails": []}


def render_thumbnail(record, names, label, destination):
    source_scene = bpy.context.scene
    objects = [source_scene.objects[name] for name in names]
    rigs = [o for o in source_scene.objects if o.type == "ARMATURE"]
    if rigs and "Idle_Neutral" in bpy.data.actions:
        rig = rigs[0]
        action = bpy.data.actions["Idle_Neutral"]
        rig.data.pose_position = "POSE"
        rig.animation_data_create()
        rig.animation_data.action = action
        if len(action.slots):
            rig.animation_data.action_slot = action.slots[0]
        source_scene.frame_set(round(sum(action.frame_range) / 2))
        bpy.context.view_layer.update()
    # Snapshot evaluated visible geometry into a separate scene. Review geometry
    # is presentation-only, never written back into the source blend.
    graph = bpy.context.evaluated_depsgraph_get()
    snapshots = []
    for obj in objects:
        evaluated = obj.evaluated_get(graph)
        mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=graph)
        copy = bpy.data.objects.new("Review_" + obj.name, mesh)
        copy.matrix_world = evaluated.matrix_world.copy()
        snapshots.append(copy)
    scene = bpy.data.scenes.new("Asset Review")
    for obj in snapshots:
        scene.collection.objects.link(obj)
    points = [obj.matrix_world @ v.co for obj in snapshots for v in obj.data.vertices]
    box = bounds(points)
    if not box or max(box["size"]) <= 0:
        raise ValueError("No renderable geometry")
    center = Vector(tuple((a + b) / 2 for a, b in zip(box["min"], box["max"])))
    scale = 1.5 / max(box["size"])
    for obj in snapshots:
        obj.location = (obj.location - center) * scale
        obj.scale *= scale
    copies = {}
    for obj in snapshots:
        for index, material in enumerate(obj.data.materials):
            if material is None:
                continue
            if material.name not in copies:
                swatch = bpy.data.materials.new("Review_" + material.name)
                swatch.use_nodes = True
                node = swatch.node_tree.nodes.get("Principled BSDF")
                node.inputs["Base Color"].default_value = material.diffuse_color
                node.inputs["Roughness"].default_value = 0.8
                copies[material.name] = swatch
            obj.data.materials[index] = copies[material.name]
    scene.world = bpy.data.worlds.new("Asset review world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.18, 0.21, 0.25, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.65
    for location, energy, size in [((2, -3, 4), 180, 3), ((-2, -1, 2), 90, 2)]:
        light = bpy.data.lights.new("Review light", "AREA")
        light.energy, light.shape, light.size = energy, "DISK", size
        obj = bpy.data.objects.new("Review light", light)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (-obj.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("Review camera")
    camera = bpy.data.objects.new("Review camera", camera_data)
    scene.collection.objects.link(camera)
    camera.location = (2, -4, 1.7) if record["category"] == "characters" or box["size"][0] >= box["size"][1] else (4, -2, 1.7)
    camera.rotation_euler = (-camera.location).to_track_quat("-Z", "Y").to_euler()
    camera_data.type, camera_data.ortho_scale = "ORTHO", 2.15
    scene.camera = camera
    scene.render.engine = "CYCLES"
    scene.cycles.device, scene.cycles.samples = "CPU", RENDER["samples"]
    scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = RENDER["width"], RENDER["height"]
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(destination)
    scene.view_settings.view_transform = "AgX"
    bpy.ops.render.render(write_still=True, scene=scene.name)
    bpy.data.scenes.remove(scene)
    # Restore the source rig so the next thumbnail starts from known state.
    for rig in rigs:
        rig.animation_data.action = None
        rig.data.pose_position = "REST"
    bpy.context.view_layer.update()


def render_record(record, output, key):
    jobs = [(name, list(parts.values())) for name, parts in record["groups"].items() if len(parts) == 4]
    if not jobs:
        jobs = [(Path(record["path"]).stem, [m["name"] for m in record["meshes"]])]
    for index, (label, names) in enumerate(jobs):
        filename = f"thumbs/{key}-{index}.png"
        target = output / filename
        target.parent.mkdir(exist_ok=True)
        try:
            render_thumbnail(record, names, label, target)
            record["thumbnails"].append({"label": label, "file": filename, "category": record["category"], "parts": names,
                                         "triangles": sum(m["triangles"] for m in record["meshes"] if m["name"] in names)})
        except Exception as error:
            record.setdefault("renderErrors", []).append(str(error))


def compare_rig(record, baseline):
    if not record["rigs"] or not baseline["rigs"]:
        return None
    candidate, target = record["rigs"][0], baseline["rigs"][0]
    a, b = {bone["name"]: bone for bone in candidate["bones"]}, {bone["name"]: bone for bone in target["bones"]}
    shared = sorted(a.keys() & b.keys())
    parents = [name for name in shared if a[name]["parent"] != b[name]["parent"]]
    deform = [name for name in shared if a[name]["deform"] != b[name]["deform"]]
    differences = [{"bone": name, "maxMatrixDelta": max(abs(x - y) for x, y in zip(a[name]["restMatrix"], b[name]["restMatrix"]))} for name in shared]
    rest = [value for value in differences if value["maxMatrixDelta"] > 0.00001]
    matrix_delta = max(abs(x - y) for x, y in zip(candidate["objectMatrix"], target["objectMatrix"]))
    baseline_actions = {action["name"]: action for action in baseline["actions"]}
    matched = [a["name"] for a in record["actions"] if a["name"] in baseline_actions and a["curveHash"] == baseline_actions[a["name"]]["curveHash"]]
    return {"boneCount": len(a), "baselineBoneCount": len(b), "missingBones": sorted(b.keys() - a.keys()), "extraBones": sorted(a.keys() - b.keys()),
            "parentDifferences": parents, "deformFlagDifferences": deform, "restDifferences": rest, "objectMatrixDelta": matrix_delta,
            "sameBindContract": a.keys() == b.keys() and not parents and not deform and not rest and matrix_delta <= 0.00001,
            "matchingAnimationCurves": matched, "newClipNames": sorted({a["name"] for a in record["actions"]} - baseline_actions.keys()),
            "note": "Exact bone-name/parent/rest-matrix check; this is not an imported/exported game animation acceptance."}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--out", default="artifacts/asset-inspection")
    parser.add_argument("--baseline", default="assets/source/characters/quaternius/Humans_Master.blend")
    parser.add_argument("--no-thumbnails", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    source, output, baseline_path = Path(args.source).resolve(), (ROOT / args.out).resolve(), (ROOT / args.baseline).resolve()
    if not source.is_dir() or not baseline_path.is_file():
        raise ValueError("Source directory and baseline must exist")
    if not output.is_relative_to(ROOT) or output.is_relative_to(source):
        raise ValueError("Outputs must stay in the project and outside the inspected source folder")
    output.mkdir(parents=True, exist_ok=True)
    cache = output / "cache"
    cache.mkdir(exist_ok=True)
    script_key = encoded_hash({"script": digest(__file__), "blender": bpy.app.version_string, "version": VERSION, "render": RENDER})
    allowed = (source, ROOT)
    files = sorted((p for p in source.rglob("*") if p.is_file() and p.suffix.lower() == ".blend" and not p.is_symlink()), key=lambda p: p.relative_to(source).as_posix())
    if not files:
        raise ValueError("No .blend files in the selected source directory")
    original_hashes = {path: digest(path) for path in [baseline_path, *files]}
    started = time.monotonic()
    counts = {"cacheHits": 0, "inspected": 0, "errors": 0}

    def get(path, relative, thumbnails):
        key = encoded_hash({"file": original_hashes[path], "inspector": script_key, "dependencyBase": str(path.parent)})
        cache_file = cache / f"{key}.json"
        if cache_file.is_file():
            record = json.loads(cache_file.read_text(encoding="utf-8"))
            deps_valid = all(dep == dependency_record(dep["path"], path, allowed) for dep in record.get("dependencies", []) if dep["state"] != "outside-inspected-roots")
            thumbs_valid = not thumbnails or (record.get("thumbnails") and all((output / image["file"]).is_file() for image in record["thumbnails"]))
            if record.get("status") == "ok" and deps_valid and thumbs_valid:
                counts["cacheHits"] += 1
                return {**record, "path": relative}
        try:
            record = inspect(path, relative, allowed)
            if thumbnails:
                render_record(record, output, key)
            record.update({"fileSha256": original_hashes[path], "bytes": path.stat().st_size, "inspectorKey": script_key})
            write_json(cache_file, record)
            counts["inspected"] += 1
            return record
        except Exception as error:
            counts["errors"] += 1
            traceback.print_exc()
            return {"path": relative, "status": "error", "error": str(error), "fileSha256": original_hashes[path], "bytes": path.stat().st_size}

    baseline = get(baseline_path, str(baseline_path.relative_to(ROOT)), False)
    if baseline["status"] != "ok":
        raise RuntimeError("Baseline inspection failed")
    records = []
    for number, path in enumerate(files, 1):
        record = get(path, path.relative_to(source).as_posix(), not args.no_thumbnails)
        if record["status"] == "ok":
            record["rigComparison"] = compare_rig(record, baseline)
        records.append(record)
        if number % 20 == 0 or number == len(files):
            print("NC_ASSET_PROGRESS " + json.dumps({"done": number, "files": len(files), **counts}), flush=True)
    shapes = defaultdict(list)
    for record in [baseline, *records]:
        for mesh in record.get("meshes", []):
            shapes[mesh["shapeHash"]].append({"file": record["path"], "mesh": mesh["name"]})
    duplicates = [instances for instances in shapes.values() if len(instances) > 1]
    identical = defaultdict(list)
    for record in records:
        identical[record["fileSha256"]].append(record["path"])
    source_changes = [str(path) for path, before in original_hashes.items() if not path.is_file() or digest(path) != before]
    licenses = sorted(p.relative_to(source).as_posix() for p in source.rglob("*") if p.is_file() and re.search(r"license|licence|copyright|credits|readme|attribution", p.name, re.I))
    compact = {"files": len(files), "bytes": sum(record["bytes"] for record in records), **counts, "categories": dict(Counter(r.get("category", "error") for r in records)),
               "renderErrors": sum(len(r.get("renderErrors", [])) for r in records),
               "sourceUnchanged": not source_changes, "sourceChanges": source_changes, "licenseFiles": licenses,
               "duplicateFileGroups": [paths for paths in identical.values() if len(paths) > 1], "duplicateGeometryGroups": len(duplicates),
               "triangles": {category: {"min": min(values), "max": max(values)} for category in ("weapons", "components") if (values := [r["triangles"] for r in records if r.get("category") == category])},
               "thumbnails": sum(len(r.get("thumbnails", [])) for r in records), "elapsedSeconds": round(time.monotonic() - started, 2)}
    report = {"schemaVersion": 1, "inspectorVersion": VERSION, "blender": bpy.app.version_string, "sourceRoot": str(source), "render": RENDER, "summary": compact,
              "baseline": baseline, "assets": records, "duplicateGeometry": duplicates,
              "fingerprintMethod": "Ordered evaluated local vertices, centered by bounds and rounded to 1e-6; triangle indices included, materials/names ignored. Conservative shape matches, not proof of equal rig/materials.",
              "limitations": ["Five frames per native clip, not exhaustive animation collision/floor validation.", "Rig comparison includes name, parent and rest matrices, not a game runtime test.", "Material swatches and uniform framing in thumbnails are for visual review only.", "No license inferred from filenames, embedded text, or similarity to existing assets."]}
    write_json(output / "report.json", report)
    write_json(output / "summary.json", compact)
    print("NC_ASSET_RESULT " + json.dumps(compact), flush=True)
    if counts["errors"] or source_changes or compact["renderErrors"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
