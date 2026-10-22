#!/usr/bin/env python3
"""Export the original Quaternius modular male library as a reusable GLB.

Run from any working directory with Blender 5.2:
  blender --background --python tools/characters/export_modular_master.py

The source blend is only read. Blender works on local object copies in a new
scene so the hidden source parts can all be exported together without editing
the library file or the interactive Blender session.
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
import struct
import traceback
from collections import Counter
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/source/characters/quaternius/Humans_Master.blend"
OUTPUT_DIR = ROOT / "apps/client/public/assets/characters/quaternius"
GLB = OUTPUT_DIR / "master.glb"
CATALOG = OUTPUT_DIR / "catalog.json"
ARTIFACTS = ROOT / "artifacts/characters/modular"
LOG = ARTIFACTS / "master-export.log"
AUDIT = ARTIFACTS / "master-export-audit.json"
EXPECTED_SOURCE_SHA256 = "0e57cc03b9ef01a63251f087fe031bbc340704051a84216a45fb0e2dc31971a9"

VARIANTS = (
    "Adventurer", "Beach", "Casual", "Casual2", "Farmer", "King",
    "Punk", "SpaceSuit", "Suit", "Swat", "Worker",
)
SLOTS = ("head", "body", "legs", "feet")
SLOT_SUFFIX = {"head": "Head", "body": "Body", "legs": "Legs", "feet": "Feet"}
EQUIPMENT = {"none": None, "pistol": "Pistol", "sword": "Sword", "backpack": "Backpack"}
EXPECTED_ACTIONS = (
    "Death", "Gun_Shoot", "HitRecieve", "HitRecieve_2", "Idle", "Idle_Gun",
    "Idle_Gun_Pointing", "Idle_Gun_Shoot", "Idle_Neutral", "Idle_Sword",
    "Interact", "Kick_Left", "Kick_Right", "Punch_Left", "Punch_Right", "Roll",
    "Run", "Run_Back", "Run_Left", "Run_Right", "Run_Shoot", "Sword_Slash",
    "Walk", "Wave",
)
LICENSE = "CC0-1.0"
SOURCE_URL = "https://quaternius.com/packs/ultimatemodularcharacters.html"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def glb_document(path: Path):
    with path.open("rb") as stream:
        magic, version, total_length = struct.unpack("<III", stream.read(12))
        json_length, json_type = struct.unpack("<II", stream.read(8))
        if magic != 0x46546C67 or version != 2 or total_length != path.stat().st_size or json_type != 0x4E4F534A:
            raise RuntimeError("Invalid GLB header or JSON chunk")
        return json.loads(stream.read(json_length).decode("utf-8"))


def validate_exported_glb(path: Path, expected_parts, expected_clips):
    """Independently import and sample the written GLB, including skinned poses."""
    document = glb_document(path)
    scene_nodes = [document["nodes"][index] for index in document["scenes"][document.get("scene", 0)]["nodes"]]
    mesh_nodes = [node for node in scene_nodes if "mesh" in node]
    skinned_nodes = [node for node in mesh_nodes if "skin" in node]
    mesh_names = sorted(node["name"] for node in mesh_nodes)
    missing_parts = sorted(set(expected_parts) - set(mesh_names))
    extra_parts = sorted(set(mesh_names) - set(expected_parts))
    animations = sorted(animation["name"] for animation in document.get("animations", []))
    skins = document.get("skins", [])
    pbr_materials = [material for material in document.get("materials", []) if isinstance(material.get("pbrMetallicRoughness"), dict)]
    triangle_count = sum(
        document["accessors"][primitive["indices"]]["count"] // 3
        for mesh in document.get("meshes", [])
        for primitive in mesh.get("primitives", [])
        if primitive.get("mode", 4) == 4 and "indices" in primitive
    )
    if missing_parts or extra_parts or animations != sorted(expected_clips):
        raise RuntimeError(f"GLB structure mismatch: missing={missing_parts} extra={extra_parts} clips={animations}")
    if len(mesh_nodes) != len(expected_parts) or len(skinned_nodes) != len(expected_parts):
        raise RuntimeError(f"Expected {len(expected_parts)} skinned mesh nodes; got {len(mesh_nodes)} / {len(skinned_nodes)}")
    if len(skins) != 1 or len(skins[0].get("joints", [])) != 62:
        raise RuntimeError("GLB skin does not contain the expected 62 joints")
    if len(pbr_materials) != len(document.get("materials", [])):
        raise RuntimeError("One or more exported materials lack PBR metallic-roughness values")

    # Reimport in an empty Blender scene so defaults from the source .blend
    # cannot affect this check. Sample Casual2 as the source-height reference.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported_scene = bpy.context.scene
    rig = next((obj for obj in imported_scene.objects if obj.type == "ARMATURE"), None)
    helper_collections = {"glTF_not_exported"}
    imported_meshes = [
        obj for obj in imported_scene.objects
        if obj.type == "MESH" and not any(collection.name in helper_collections for collection in obj.users_collection)
    ]
    if rig is None or len(rig.data.bones) != 62 or len(imported_meshes) != len(expected_parts):
        raise RuntimeError(f"Imported GLB rig/mesh mismatch: rig={rig is not None}, meshes={len(imported_meshes)}")
    reference_names = {name for name in expected_parts if name.startswith("Casual2_")}
    reference_meshes = sorted((obj for obj in imported_meshes if obj.name in reference_names), key=lambda obj: obj.name)
    if len(reference_meshes) != 4:
        raise RuntimeError("Imported GLB does not contain all four Casual2 reference meshes")

    def mesh_points(objects):
        depsgraph = bpy.context.evaluated_depsgraph_get()
        points = []
        for obj in objects:
            evaluated = obj.evaluated_get(depsgraph)
            mesh = evaluated.to_mesh()
            try:
                points.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
            finally:
                evaluated.to_mesh_clear()
        return points

    animation_data = rig.animation_data_create()
    for track in animation_data.nla_tracks:
        track.mute = True
    animation_data.action = None
    rig.data.pose_position = "REST"
    imported_scene.frame_set(0)
    bpy.context.view_layer.update()
    rest_points = mesh_points(reference_meshes)
    rest_height = max(point.z for point in rest_points) - min(point.z for point in rest_points)
    deformations = {}
    actual_actions = {action.name: action for action in bpy.data.actions}
    for clip in expected_clips:
        action = actual_actions.get(clip)
        if action is None or not action.slots:
            raise RuntimeError(f"Imported GLB action/slot missing for {clip}")
        rig.data.pose_position = "POSE"
        animation_data.action = action
        animation_data.action_slot = action.slots[0]
        start, end = action.frame_range
        if end <= start:
            raise RuntimeError(f"Imported GLB action is empty: {clip}")
        displacement = 0.0
        for fraction in (0.0, 0.25, 0.5, 0.75, 1.0):
            frame = start + (end - start) * fraction
            imported_scene.frame_set(math.floor(frame), subframe=frame % 1.0)
            bpy.context.view_layer.update()
            points = mesh_points(reference_meshes)
            if len(points) != len(rest_points):
                raise RuntimeError(f"Vertex count changed while sampling {clip}")
            displacement = max(displacement, max((a - b).length for a, b in zip(points, rest_points)))
        if displacement < 0.002:
            raise RuntimeError(f"Imported GLB clip has no visible skinned deformation: {clip} ({displacement})")
        deformations[clip] = displacement

    return {
        "meshNodeCount": len(mesh_nodes),
        "skinnedMeshNodeCount": len(skinned_nodes),
        "skinJointCount": len(skins[0]["joints"]),
        "clipCount": len(animations),
        "clipsWithSkinnedDeformation": len(deformations),
        "clipMaxVertexDisplacement": deformations,
        "pbrMaterialCount": len(pbr_materials),
        "pbrMaterialNames": sorted(material.get("name", "") for material in pbr_materials),
        "materialCount": len(document.get("materials", [])),
        "triangleCount": triangle_count,
        "casual2RestHeight": rest_height,
    }


def part_name(slot: str, variant: str) -> str:
    suffix = SLOT_SUFFIX[slot]
    if slot == "legs" and variant == "Farmer":
        suffix = "Pants"
    return f"{variant}_{suffix}"


def object_bounds_height(objects, depsgraph):
    z_values = []
    for obj in objects:
        evaluated = obj.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        try:
            z_values.extend((evaluated.matrix_world @ vertex.co).z for vertex in mesh.vertices)
        finally:
            evaluated.to_mesh_clear()
    if not z_values:
        raise RuntimeError("Could not measure Casual2 reference height")
    return max(z_values) - min(z_values)


def mesh_stats(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        mesh.calc_loop_triangles()
        return {
            "vertices": len(mesh.vertices),
            "triangles": len(mesh.loop_triangles),
            "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
            "vertexGroups": len(obj.vertex_groups),
            "armatureModifiers": [m.object.name for m in obj.modifiers if m.type == "ARMATURE" and m.object],
            "modifierTypes": [m.type for m in obj.modifiers],
        }
    finally:
        evaluated.to_mesh_clear()


def make_pbr_material(source_material):
    """Translate the artist's native diffuse swatch into a glTF-friendly node."""
    material = source_material.copy()
    material.name = f"{source_material.name}_PBR_TMP"
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (300, 0)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (0, 0)
    # The source uses Diffuse BSDF nodes; its material swatch is the artist's
    # authoritative color. Use it directly as linear glTF baseColorFactor.
    shader.inputs["Base Color"].default_value = tuple(source_material.diffuse_color)
    shader.inputs["Alpha"].default_value = source_material.diffuse_color[3]
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = 0.8
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def run_export():
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    if not SOURCE.is_file():
        raise FileNotFoundError(SOURCE)
    source_hash = sha256(SOURCE)
    if source_hash != EXPECTED_SOURCE_SHA256:
        raise RuntimeError(f"Source blend SHA-256 mismatch: {source_hash}")
    if bpy.app.version < (5, 2, 0):
        raise RuntimeError(f"Blender 5.2 or newer required; got {bpy.app.version_string}")

    # Opening the .blend as the startup file loads its linked library datablocks
    # but not its intentionally empty scene. Make only local object copies and a
    # fresh local scene; the source file on disk remains untouched.
    source_objects = {obj.name: obj for obj in bpy.data.objects}
    rig_source = source_objects.get("CharacterArmature")
    if rig_source is None or rig_source.type != "ARMATURE":
        raise RuntimeError("CharacterArmature not found in source datablocks")
    if len(rig_source.data.bones) != 62 or sum(bone.use_deform for bone in rig_source.data.bones) != 62:
        raise RuntimeError("Expected the original 62-bone fully deforming rig")

    slot_map = {
        slot: {variant: part_name(slot, variant) for variant in VARIANTS}
        for slot in SLOTS
    }
    for variant, mapped in slot_map["legs"].items():
        if mapped not in source_objects:
            if variant == "Farmer" and "Farmer_Pants" in source_objects:
                slot_map["legs"][variant] = "Farmer_Pants"
            else:
                raise RuntimeError(f"Missing source part {mapped}")
    part_names = [slot_map[slot][variant] for slot in SLOTS for variant in VARIANTS]
    part_names.extend(EQUIPMENT[key] for key in ("pistol", "sword", "backpack"))
    missing = sorted(set(part_names) - source_objects.keys())
    if missing:
        raise RuntimeError(f"Missing source meshes: {missing}")
    if "Horse_Head" in part_names:
        raise RuntimeError("Horse_Head must remain excluded")
    actions = {action.name: action for action in bpy.data.actions}
    missing_actions = sorted(set(EXPECTED_ACTIONS) - actions.keys())
    if missing_actions:
        raise RuntimeError(f"Missing source actions: {missing_actions}")

    source_meshes = [source_objects[name] for name in part_names]
    source_meshes += [obj for obj in bpy.data.objects if obj.type == "MESH" and obj.name == "Horse_Head"]
    source_materials = sorted(
        {slot.material for obj in source_meshes for slot in obj.material_slots if slot.material},
        key=lambda material: material.name,
    )
    material_copies = {material: make_pbr_material(material) for material in source_materials}
    material_copy_names = {copy: source.name for source, copy in material_copies.items()}
    material_color_audit = [
        {"name": source.name, "diffuseRGBA": list(source.diffuse_color)}
        for source in source_materials
    ]
    source_stats = {obj.name: mesh_stats(obj, bpy.context.evaluated_depsgraph_get()) for obj in source_meshes if obj.name != "Horse_Head"}

    # Reuse and clear the process-local scene loaded by this background Blender
    # process. The source remains on disk; the scene is never saved.
    export_scene = bpy.context.scene
    export_scene.name = "Quaternius_Modular_Export"
    export_collection = bpy.data.collections.new("Quaternius_Modular_Characters")
    export_scene.collection.children.link(export_collection)

    rig = rig_source.copy()
    rig.data = rig_source.data.copy()
    export_collection.objects.link(rig)
    rig.animation_data_clear()
    rig.animation_data_create()
    rig.animation_data.action = None
    # The exporter samples actions by assigning each Action slot to this rig.
    # Its evaluator only produces posed bone matrices in POSE mode. The GLB
    # still uses rest-pose joints as its neutral skin bind pose below.
    rig.data.pose_position = "POSE"
    rig["sourceAuthor"] = "Quaternius"
    rig["sourceLicense"] = LICENSE
    rig["sourceUrl"] = SOURCE_URL
    rig["sourceBlend"] = SOURCE.name

    copies = []
    for source_obj in source_meshes:
        if source_obj.name == "Horse_Head":
            continue
        obj = source_obj.copy()
        # Give each local object its own mesh datablock before replacing
        # materials, so the source mesh data remains untouched.
        obj.data = source_obj.data.copy()
        for index, source_material in enumerate(source_obj.data.materials):
            if source_material:
                obj.data.materials[index] = material_copies[source_material]
        export_collection.objects.link(obj)
        obj.hide_set(False, view_layer=export_scene.view_layers[0])
        obj.hide_render = False
        for modifier in obj.modifiers:
            if modifier.type == "ARMATURE":
                modifier.object = rig
        obj["sourceAuthor"] = "Quaternius"
        obj["sourceLicense"] = LICENSE
        obj["sourceUrl"] = SOURCE_URL
        obj["sourceObject"] = source_obj.name
        copies.append(obj)

    # Local object copies initially receive Blender's .001 suffix because the
    # source datablocks still reserve their original names. Remove only the
    # in-memory source object IDs after copying (never save the blend), then
    # restore the exact public names expected by the catalogue.
    source_mesh_data_blocks = {obj.data for obj in source_meshes if obj.data}
    for source_obj in [rig_source] + source_meshes:
        bpy.data.objects.remove(source_obj, do_unlink=True)
    for source_mesh_data in source_mesh_data_blocks:
        if source_mesh_data.users == 0:
            bpy.data.meshes.remove(source_mesh_data)
    for source_material in source_materials:
        if source_material.users == 0:
            bpy.data.materials.remove(source_material)
    for copied_material, source_name in material_copy_names.items():
        copied_material.name = source_name
    for other_obj in list(export_scene.objects):
        if other_obj != rig and other_obj not in copies:
            bpy.data.objects.remove(other_obj, do_unlink=True)
    rig.name = "CharacterArmature"
    for obj in copies:
        obj.name = obj.get("sourceObject")

    # Measure the catalogue reference with the original rest pose. Then switch
    # back to POSE before action sampling; the exporter writes the rest bind pose.
    rig.data.pose_position = "REST"
    export_scene.frame_set(0)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    height_objects = [next(obj for obj in copies if obj.get("sourceObject") == slot_map[slot]["Casual2"]) for slot in SLOTS]
    height = object_bounds_height(height_objects, depsgraph)
    evaluated_stats = {obj.name: mesh_stats(obj, depsgraph) for obj in copies}
    tri_count = sum(value["triangles"] for value in evaluated_stats.values())
    rig.data.pose_position = "POSE"
    bpy.context.view_layer.update()
    rig_report = {"name": rig.name, "bones": len(rig.data.bones), "deformBones": sum(b.use_deform for b in rig.data.bones)}
    action_frame_ranges = {name: [float(actions[name].frame_range[0]), float(actions[name].frame_range[1])] for name in EXPECTED_ACTIONS}

    # Preserve action references on the local armature. Blender's ACTIONS mode
    # exports all compatible actions, one glTF animation per source action.
    bpy.ops.export_scene.gltf(
            filepath=str(GLB),
            check_existing=False,
            export_format="GLB",
            use_active_scene=True,
            use_selection=False,
            use_visible=False,
            export_animations=True,
            export_animation_mode="ACTIONS",
            export_nla_strips=False,
            export_skins=True,
            export_rest_position_armature=True,
            export_apply=True,
            export_gn_mesh=True,
            export_extras=True,
            export_copyright=f"Quaternius; {LICENSE}; {SOURCE_URL}",
            export_materials="EXPORT",
            export_image_format="AUTO",
            export_yup=True,
            export_frame_range=False,
            export_optimize_animation_size=False,
            export_optimize_animation_keep_anim_armature=True,
            export_optimize_animation_keep_anim_object=True,
            # Blender 5.2's exporter only initializes its loglevel on the default
            # negative value (a positive explicit value currently raises KeyError).
            export_loglevel=-1,
    )
    if not GLB.is_file() or GLB.stat().st_size < 100_000:
        raise RuntimeError("GLB export is missing or unexpectedly small")

    catalog = {
        "schemaVersion": 1,
        "sourceId": "quaternius-modular-men-v1",
        "assetFile": "master.glb",
        "assetSha256": sha256(GLB),
        "sourceBlendSha256": source_hash,
        "author": "Quaternius",
        "license": LICENSE,
        "sourceUrl": SOURCE_URL,
        "variants": list(VARIANTS),
        "slots": slot_map,
        "equipment": EQUIPMENT,
        "clips": list(EXPECTED_ACTIONS),
        "rig": {"name": "CharacterArmature", "bones": 62},
        "height": round(height, 6),
    }
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    glb_validation = validate_exported_glb(GLB, part_names, EXPECTED_ACTIONS)

    report = {
        "sourceFile": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "sourceBlendSha256": source_hash,
        "blender": bpy.app.version_string,
        "exportFile": str(GLB.relative_to(ROOT)).replace("\\", "/"),
        "exportBytes": GLB.stat().st_size,
        "exportSha256": catalog["assetSha256"],
        "catalogFile": str(CATALOG.relative_to(ROOT)).replace("\\", "/"),
        "sourcePartCount": len(part_names),
        "exportPartNames": part_names,
        "excluded": ["Horse_Head"],
        "partRootNames": part_names,
        "rig": rig_report,
        "animationNames": list(EXPECTED_ACTIONS),
        "actionFrameRanges": action_frame_ranges,
        "height": height,
        "triangleCountEvaluated": tri_count,
        "sourceDiffuseMaterialColors": material_color_audit,
        "glbValidation": glb_validation,
        "sourceMeshStats": source_stats,
        "exportMeshStats": evaluated_stats,
        "catalog": catalog,
        "rnaExportProperties": sorted(p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties),
    }
    AUDIT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"EXPORT_OK bytes={GLB.stat().st_size} sha256={catalog['assetSha256']}")
    print(f"QA parts={len(part_names)} rigBones={rig_report['bones']} clips={len(EXPECTED_ACTIONS)} triangles={tri_count} height={height:.6f}")
    print(f"FILES glb={GLB} catalog={CATALOG} audit={AUDIT}")


if __name__ == "__main__":
    try:
        run_export()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
