"""Independent Blender checks for a selected modular workshop GLB.

Default invocation keeps the original Quaternius male verification path:
  blender --background --factory-startup --python-exit-code 1 --python
  tools/characters/verify_modular.py -- artifacts/characters/modular/casual2.glb

Pass --catalog apps/client/public/assets/characters/women/catalog.json to
verify a female workshop export with its own rig and optional bone-parented gear.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from verify_blender import mesh_points, bounds, select_action


def local(value):
    target = Path(value).resolve()
    if not target.is_relative_to(ROOT):
        raise ValueError("All paths must remain in the project")
    return target


def near_name(name, base):
    """glTF may split one source object into named primitive mesh nodes."""
    return name == base or name.startswith(base + "_primitive")


def matrix_max_delta(first, current):
    return max(abs(first[row][column] - current[row][column]) for row in range(4) for column in range(4))


def bone_attachment_root(obj, armature):
    current = obj
    while current is not None:
        if current.parent == armature and current.parent_type == "BONE":
            return current
        current = current.parent
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    parser.add_argument("--output", default="artifacts/characters/modular/blender")
    parser.add_argument("--blend", default="assets/source/characters/quaternius/casual2-workshop.blend")
    parser.add_argument("--catalog", default="apps/client/public/assets/characters/quaternius/catalog.json")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    source, output, blend, catalog_path = local(args.glb), local(args.output), local(args.blend), local(args.catalog)
    output.mkdir(parents=True, exist_ok=True)
    blend.parent.mkdir(parents=True, exist_ok=True)
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    armatures = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in scene.objects if obj.type == "MESH" and not any(c.name == "glTF_not_exported" for c in obj.users_collection)]
    assert len(armatures) == 1 and meshes, "Expected one rig and selected meshes"
    armature = armatures[0]
    assert len(armature.data.bones) == 62, "Full original rig must survive"

    equipment = catalog.get("equipment", {})
    gear_bases = {name for name in equipment.values() if isinstance(name, str)}
    female = catalog.get("sourceId") == "modular-women-v1"
    gear_meshes = [obj for obj in meshes if any(near_name(obj.name, name) for name in gear_bases)]
    skinned = []
    native_unskinned_gear = []
    for obj in meshes:
        armature_modifiers = [modifier for modifier in obj.modifiers if modifier.type == "ARMATURE"]
        if armature_modifiers:
            assert all(modifier.object == armature for modifier in armature_modifiers), f"{obj.name}: skin targets a different rig"
            skinned.append(obj)
        else:
            is_catalog_gear = any(near_name(obj.name, name) for name in gear_bases)
            assert female and is_catalog_gear, f"{obj.name}: unrecognized unskinned outfit/equipment mesh"
            native_unskinned_gear.append(obj)
    assert skinned, "Expected at least one skinned outfit mesh"
    gear_roots = {}
    for base in gear_bases:
        matching = [obj for obj in native_unskinned_gear if near_name(obj.name, base)]
        if not matching:
            continue
        roots = {bone_attachment_root(obj, armature) for obj in matching}
        assert None not in roots and len(roots) == 1, f"{base}: primitives do not share one bone-parented root"
        root = next(iter(roots))
        assert root.parent_bone == "Middle1.R", f"{base}: expected Middle1.R attachment, got {root.parent_bone}"
        gear_roots[base] = root

    weight_report = {"verticesChecked": 0, "maxInfluences": 0, "sumRange": [float("inf"), 0.0]}
    for obj in skinned:
        for vertex in obj.data.vertices:
            assert all(math.isfinite(value) for value in vertex.co), f"{obj.name}: non-finite vertex position"
            weights = [group.weight for group in vertex.groups]
            assert all(math.isfinite(weight) and weight >= 0.0 for weight in weights), f"{obj.name}: non-finite or negative skin weight"
            active = [weight for weight in weights if weight > 1e-6]
            assert len(active) <= 4, f"{obj.name}: more than four skin influences"
            total = sum(active)
            assert abs(total - 1.0) < 0.001, f"{obj.name}: skin weights sum to {total}"
            weight_report["verticesChecked"] += 1
            weight_report["maxInfluences"] = max(weight_report["maxInfluences"], len(active))
            weight_report["sumRange"][0] = min(weight_report["sumRange"][0], total)
            weight_report["sumRange"][1] = max(weight_report["sumRange"][1], total)

    select_action(armature, None)
    armature.data.pose_position = "REST"
    scene.frame_set(0)
    bpy.context.view_layer.update()
    rest_points = mesh_points(skinned)
    rest = bounds(rest_points)
    height = rest["max"][2] - rest["min"][2]
    assert 0.9 < height < 1.4, f"Unexpected normalized figure height: {height}"
    assert abs(rest["min"][2]) < 0.005, f"Rest feet off the ground: {rest}"

    actual = list(bpy.data.actions)
    actions = {}
    for name in catalog["clips"]:
        match = next((action for action in actual if action.name == name), None)
        if match is None:
            match = next((action for action in actual if action.name.startswith(name + "_") or action.name.startswith(name + ".")), None)
        assert match is not None, f"Missing {name}; found {[action.name for action in actual]}"
        actions[name] = match

    animation = {}
    weapon_checks = {name: {"parentBone": root.parent_bone, "maxWorldMotion": 0.0, "maxAttachmentOffsetDrift": 0.0} for name, root in gear_roots.items()}
    for name, action in actions.items():
        select_action(armature, action)
        start, end = action.frame_range
        assert end > start, f"Empty animation: {name}"
        samples, floors, weapon_samples = [], [], {name: [] for name in gear_roots}
        for fraction in (0, 0.25, 0.5, 0.75, 1):
            frame = start + (end - start) * fraction
            scene.frame_set(math.floor(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            points = mesh_points(skinned)
            assert all(all(math.isfinite(value) for value in point) for point in points), f"{name}: non-finite deformed vertex"
            samples.append(points)
            floors.append(min(point.z for point in points))
            for gear_name, weapon in gear_roots.items():
                bone_world = armature.matrix_world @ armature.pose.bones[weapon.parent_bone].matrix
                relative = bone_world.inverted_safe() @ weapon.matrix_world
                weapon_samples[gear_name].append((weapon.matrix_world.copy(), relative))
        rest_displacement = max(max((point - base).length for point, base in zip(sample, rest_points)) for sample in samples)
        temporal_variation = max(max((point - base).length for point, base in zip(sample, samples[0])) for sample in samples[1:])
        assert rest_displacement > 0.002, f"No visible skinned mesh deformation: {name}"
        assert temporal_variation > 0.002, f"No actual temporal vertex variation across samples: {name}"
        for weapon_name in gear_roots:
            frames = weapon_samples[weapon_name]
            origin = frames[0][0].translation
            movement = max((sample[0].translation - origin).length for sample in frames[1:])
            offset_drift = max(matrix_max_delta(frames[0][1], sample[1]) for sample in frames[1:])
            weapon_checks[weapon_name]["maxWorldMotion"] = max(weapon_checks[weapon_name]["maxWorldMotion"], movement)
            weapon_checks[weapon_name]["maxAttachmentOffsetDrift"] = max(weapon_checks[weapon_name]["maxAttachmentOffsetDrift"], offset_drift)
        animation[name] = {
            "action": action.name, "frames": [float(start), float(end)],
            "maxRestVertexDisplacement": rest_displacement,
            "maxTemporalVertexVariation": temporal_variation,
            "sampledFloorRange": [min(floors), max(floors)],
        }
    for name, data in weapon_checks.items():
        assert data["maxWorldMotion"] > 0.005, f"{name} never followed moving hand poses"
        assert data["maxAttachmentOffsetDrift"] < 0.001, f"{name} drifted relative to Middle1.R: {data}"

    # Save only this imported, checked delivery as an editable review copy.
    select_action(armature, None)
    armature.data.pose_position = "REST"
    bpy.context.view_layer.update()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    report = {
        "passed": True, "source": str(source.relative_to(ROOT)), "catalog": str(catalog_path.relative_to(ROOT)),
        "sourceId": catalog.get("sourceId"), "blender": bpy.app.version_string,
        "bones": 62, "skinnedMeshObjects": len(skinned), "gearObjects": len(gear_meshes),
        "nativeUnskinnedGearObjects": len(native_unskinned_gear),
        "gearAttachments": weapon_checks, "weightValidation": weight_report,
        "triangles": sum(sum(len(poly.vertices) - 2 for poly in obj.data.polygons) for obj in meshes),
        "restBounds": rest, "height": height, "animations": animation,
        "blend": str(blend.relative_to(ROOT)),
        "note": "Five samples per native clip; each clip must change skinned vertex positions over time. Gear must remain a stable Middle1.R bone child and move with the hand. Human movement/art acceptance remains open.",
    }
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": True, "sourceId": catalog.get("sourceId"), "bones": 62, "skinnedMeshes": len(skinned), "gearMeshes": len(gear_meshes), "nativeUnskinnedGear": len(native_unskinned_gear), "clips": len(actions), "height": height, "report": str((output / "report.json").relative_to(ROOT))}))


if __name__ == "__main__":
    main()
