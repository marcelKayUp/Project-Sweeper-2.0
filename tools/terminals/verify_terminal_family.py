"""Independent Blender reimport of the static prop deliveries and editable sources."""
import importlib.util
import json
import math
import sys
from copy import deepcopy
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "assets/generated/props/terminals"


def main():
    manifest = json.loads((BUNDLE / "manifest.json").read_text(encoding="utf-8"))
    checks = []
    for form in ("pedestal", "console", "wall"):
        asset = next(a for a in manifest["assets"] if a["spec"]["form"] == form and a["spec"]["size"] == "standard" and a["spec"]["organization"] == "daeyang")
        for kind, extension in (("glb", "glb"), ("source", "blend")):
            file = BUNDLE / kind / f"{asset['id']}.{extension}"
            bpy.ops.wm.read_factory_settings(use_empty=True)
            if extension == "glb":
                bpy.ops.import_scene.gltf(filepath=str(file))
            else:
                bpy.ops.wm.open_mainfile(filepath=str(file), load_ui=False, use_scripts=False)
            meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
            assert len(meshes) == 5
            assert not any(o.type in ("CAMERA", "LIGHT", "ARMATURE") for o in bpy.context.scene.objects)
            bpy.context.view_layer.update()
            points = [o.matrix_world @ vertex.co for o in meshes for vertex in o.data.vertices]
            assert all(all(math.isfinite(v) for v in point) for point in points)
            minimum = [min(p[i] for p in points) for i in range(3)]
            maximum = [max(p[i] for p in points) for i in range(3)]
            dimensions = [maximum[i] - minimum[i] for i in range(3)]
            assert abs(minimum[2]) < .00001
            assert all(abs(a - b) < .00001 for a, b in zip(dimensions, asset["stats"]["dimensions"]))
            images = [image for image in bpy.data.images if image.type == "IMAGE" and image.name != "Render Result"]
            assert len(images) == 1 and tuple(images[0].size) == (128, 128)
            assert images[0].packed_file is not None, "Editable blend must embed its display"
            checks.append({"id": asset["id"], "format": extension, "meshObjects": len(meshes), "dimensions": dimensions, "bottom": minimum[2], "packedDisplay": True})
    spec = importlib.util.spec_from_file_location("terminal_builder", ROOT / "tools/terminals/build_terminal_family.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    recipe = json.loads((ROOT / "assets/specs/props/terminal-family.json").read_text())
    rejected = []
    for name in ("negative-seed", "boolean-seed", "invalid-scale", "unknown-form", "invalid-color", "unknown-field"):
        candidate = deepcopy(recipe)
        if name == "negative-seed": candidate["seed"] = -1
        if name == "boolean-seed": candidate["seed"] = True
        if name == "invalid-scale": candidate["sizes"]["compact"] = 1000
        if name == "unknown-form": candidate["forms"] = ["unknown"]
        if name == "invalid-color": candidate["palettes"]["daeyang"]["accent"] = "javascript:unknown"
        if name == "unknown-field": candidate["script"] = "must not execute"
        try:
            module.validate(candidate)
        except ValueError:
            rejected.append(name)
        else:
            raise AssertionError(f"Accepted {name}")
    output = ROOT / "artifacts/terminals/blender-check.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    report = {"passed": True, "blender": bpy.app.version_string, "reimports": checks, "invalidRecipesRejected": rejected}
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("NC_TERMINAL_VERIFY " + json.dumps({"passed": True, "reimports": len(checks), "invalidRecipesRejected": len(rejected)}))


if __name__ == "__main__":
    main()
