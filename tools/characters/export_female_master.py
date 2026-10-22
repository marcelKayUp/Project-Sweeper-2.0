#!/usr/bin/env python3
"""Export the user-provided female character library as an independent GLB.

Run with Blender 5.2 in background mode. The source is copied in memory only;
neither the source blend nor an interactive Blender session is modified.
"""
from __future__ import annotations

import hashlib
import json
import math
import struct
import sys
import traceback
from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/source/characters/women/Humans_Master.blend"
OUTPUT_DIR = ROOT / "apps/client/public/assets/characters/women"
GLB = OUTPUT_DIR / "master.glb"
CATALOG = OUTPUT_DIR / "catalog.json"
PROVENANCE = ROOT / "assets/source/characters/women/provenance.json"
ARTIFACTS = ROOT / "artifacts/characters/female"
AUDIT = ARTIFACTS / "master-export-audit.json"
LOG = ARTIFACTS / "master-export.log"
EXPECTED_SOURCE_SHA256 = "e478c764a329f5ba8a425df865e2b9061bba42add8afe8e7324cc2cb257fc8de"

VARIANTS = ("Adventurer", "Casual", "Formal", "Medieval", "Punk", "SciFi", "Soldier", "Suit", "Witch", "Worker")
SLOTS = ("head", "body", "legs", "feet")
SLOT_SUFFIX = {"head": "Head", "body": "Body", "legs": "Legs", "feet": "Feet"}
EQUIPMENT = {"none": None, "pistol": "Pistol", "sword": "Sword", "backpack": None}
EXPECTED_ACTIONS = (
    "Death", "Gun_Shoot", "HitRecieve", "HitRecieve_2", "Idle", "Idle_Gun",
    "Idle_Gun_Pointing", "Idle_Gun_Shoot", "Idle_Neutral", "Idle_Sword",
    "Interact", "Kick_Left", "Kick_Right", "Punch_Left", "Punch_Right", "Roll",
    "Run", "Run_Back", "Run_Left", "Run_Right", "Run_Shoot", "Sword_Slash",
    "Walk", "Wave",
)
SOURCE_AUTHOR = "Unverified (user-provided)"
SOURCE_LICENSE = "LicenseRef-UserProvided-Unverified"


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


def part_name(slot: str, variant: str) -> str:
    if slot == "head" and variant == "Formal":
        return "Formad_Head"
    return f"{variant}_{SLOT_SUFFIX[slot]}"


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
        raise RuntimeError("Could not measure Casual rest height")
    return max(z_values) - min(z_values)


def mesh_stats(obj, depsgraph):
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
    try:
        mesh.calc_loop_triangles()
        return {
            "vertices": len(mesh.vertices),
            "triangles": len(mesh.loop_triangles),
            "modifierTypes": [modifier.type for modifier in obj.modifiers],
            "armatureModifiers": [modifier.object.name for modifier in obj.modifiers if modifier.type == "ARMATURE" and modifier.object],
        }
    finally:
        evaluated.to_mesh_clear()


def make_pbr_material(source_material):
    material = source_material.copy()
    material.name = f"{source_material.name}_PBR_TMP"
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = tuple(source_material.diffuse_color)
    shader.inputs["Alpha"].default_value = source_material.diffuse_color[3]
    shader.inputs["Metallic"].default_value = 0.0
    shader.inputs["Roughness"].default_value = 0.8
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


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


def validate_exported_glb(path: Path, expected_parts):
    """Check GLB structure, reimport skin/attachments, and sample actual motion."""
    document = glb_document(path)
    nodes = document["nodes"]
    scene_nodes = [nodes[index] for index in document["scenes"][document.get("scene", 0)]["nodes"]]
    mesh_nodes = [node for node in nodes if "mesh" in node]
    mesh_names = sorted(node["name"] for node in mesh_nodes)
    expected_meshes = sorted(expected_parts + ["Pistol", "Sword"])
    animations = sorted(animation["name"] for animation in document.get("animations", []))
    if mesh_names != expected_meshes or animations != sorted(EXPECTED_ACTIONS):
        raise RuntimeError(f"GLB structure mismatch: meshes={mesh_names}, clips={animations}")
    skinned = [node for node in mesh_nodes if "skin" in node]
    if len(skinned) != 40 or len(document.get("skins", [])) != 1 or len(document["skins"][0].get("joints", [])) != 62:
        raise RuntimeError("Expected exactly 40 skinned clothing meshes and one 62-joint skin")
    pbr_materials = [m for m in document.get("materials", []) if isinstance(m.get("pbrMetallicRoughness"), dict)]
    if len(pbr_materials) != len(document.get("materials", [])):
        raise RuntimeError("One or more exported materials lack PBR metallic-roughness values")
    triangle_count = sum(
        document["accessors"][primitive["indices"]]["count"] // 3
        for mesh in document.get("meshes", [])
        for primitive in mesh.get("primitives", [])
        if primitive.get("mode", 4) == 4 and "indices" in primitive
    )

    # Reimport into an empty scene: this checks the written GLB, not source IDs.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    scene = bpy.context.scene
    rig = next((obj for obj in scene.objects if obj.type == "ARMATURE"), None)
    # Blender's importer creates two non-delivery helper meshes for custom
    # bone shapes in this source. The GLB scene itself was already checked to
    # contain exactly the 42 public mesh nodes above.
    meshes = [obj for obj in scene.objects if obj.type == "MESH" and obj.name in expected_meshes]
    if rig is None or len(rig.data.bones) != 62 or len(meshes) != 42:
        raise RuntimeError(f"GLB reimport mismatch: rig={rig is not None}, bones={len(rig.data.bones) if rig else 0}, delivery meshes={len(meshes)}")
    imported = {obj.name: obj for obj in meshes}
    if any(name not in imported for name in expected_meshes):
        raise RuntimeError("One or more expected female/equipment meshes are absent after GLB reimport")
    weight_vertices = 0
    max_vertex_influences = 0
    weight_sums = []
    for name in expected_parts:
        obj = imported[name]
        if not any(modifier.type == "ARMATURE" and modifier.object == rig for modifier in obj.modifiers):
            raise RuntimeError(f"Reimported clothing mesh is not skinned to CharacterArmature: {name}")
        for vertex in obj.data.vertices:
            influences = [group for group in vertex.groups if group.weight > 1e-6]
            total = sum(group.weight for group in influences)
            if len(influences) > 4 or abs(total - 1.0) > 0.015:
                raise RuntimeError(f"GLB skin weights are not <=4 normalized influences: {name} vertex {vertex.index} sum={total}")
            weight_vertices += 1
            max_vertex_influences = max(max_vertex_influences, len(influences))
            weight_sums.append(total)

    gear = {}
    for name in ("Pistol", "Sword"):
        obj = imported[name]
        if obj.parent != rig or obj.parent_type != "BONE" or obj.parent_bone != "Middle1.R":
            raise RuntimeError(f"{name} lost its native CharacterArmature/Middle1.R bone attachment on GLB reimport: parent={obj.parent}, type={obj.parent_type}, bone={obj.parent_bone}")
        if any(modifier.type == "ARMATURE" for modifier in obj.modifiers):
            raise RuntimeError(f"{name} unexpectedly became skinned")
        gear[name] = {"parent": obj.parent.name, "parentType": obj.parent_type, "parentBone": obj.parent_bone, "armatureModifiers": 0}

    reference_names = {part_name(slot, "Casual") for slot in SLOTS}
    reference = [imported[name] for name in reference_names]
    animation_data = rig.animation_data_create()
    for track in animation_data.nla_tracks:
        track.mute = True
    animation_data.action = None
    rig.data.pose_position = "REST"
    scene.frame_set(0)
    bpy.context.view_layer.update()
    rest_points = mesh_points(reference)
    rest_height = max(point.z for point in rest_points) - min(point.z for point in rest_points)
    deformations = {}
    actions = {action.name: action for action in bpy.data.actions}
    for clip in EXPECTED_ACTIONS:
        action = actions.get(clip)
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
            scene.frame_set(math.floor(frame), subframe=frame % 1.0)
            bpy.context.view_layer.update()
            points = mesh_points(reference)
            displacement = max(displacement, max((a - b).length for a, b in zip(points, rest_points)))
        if displacement < 0.002:
            raise RuntimeError(f"Imported GLB clip has no visible mesh deformation: {clip} ({displacement})")
        deformations[clip] = displacement
    return {
        "meshNodeCount": len(mesh_nodes), "skinnedClothingMeshCount": len(skinned),
        "weightVerticesChecked": weight_vertices, "maxVertexInfluences": max_vertex_influences,
        "weightSumRange": [min(weight_sums), max(weight_sums)],
        "gearBoneAttachments": gear, "skinJointCount": len(document["skins"][0]["joints"]),
        "clipCount": len(animations), "clipsWithSkinnedMeshDeformation": len(deformations),
        "clipMaxVertexDisplacement": deformations, "pbrMaterialCount": len(pbr_materials),
        "materialCount": len(document.get("materials", [])), "triangleCount": triangle_count,
        "casualRestHeight": rest_height,
    }


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

    # Explicitly load the source in this isolated background process.
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE), load_ui=False)
    source_objects = {obj.name: obj for obj in bpy.data.objects}
    rig_source = source_objects.get("CharacterArmature")
    if rig_source is None or rig_source.type != "ARMATURE" or len(rig_source.data.bones) != 62:
        raise RuntimeError("Expected original CharacterArmature with 62 bones")
    slot_map = {slot: {variant: part_name(slot, variant) for variant in VARIANTS} for slot in SLOTS}
    part_names = [slot_map[slot][variant] for slot in SLOTS for variant in VARIANTS]
    if len(set(part_names)) != 40:
        raise RuntimeError("Female catalogue must contain 40 distinct outfit meshes")
    missing = sorted((set(part_names) | {"Pistol", "Sword"}) - source_objects.keys())
    if missing:
        raise RuntimeError(f"Missing source objects: {missing}")
    for name in ("Pistol", "Sword"):
        gear = source_objects[name]
        if gear.parent != rig_source or gear.parent_type != "BONE" or gear.parent_bone != "Middle1.R" or any(m.type == "ARMATURE" for m in gear.modifiers):
            raise RuntimeError(f"Source {name} is not the expected unskinned Middle1.R bone child")
    actions = {action.name: action for action in bpy.data.actions}
    if sorted(set(EXPECTED_ACTIONS) - actions.keys()):
        raise RuntimeError(f"Missing source actions: {sorted(set(EXPECTED_ACTIONS) - actions.keys())}")

    source_meshes = [source_objects[name] for name in part_names + ["Pistol", "Sword"]]
    source_visibility = {obj.name: {"hide_viewport": obj.hide_viewport, "hide_render": obj.hide_render} for obj in source_meshes}
    # Source delivery is intentionally hidden. Only these process-local IDs
    # are made active below so modifiers and animation can be sampled.
    for obj in source_meshes:
        obj.hide_viewport = True
        obj.hide_render = True
    for collection in bpy.data.collections:
        collection.hide_viewport = True
    for obj in source_meshes:
        obj.hide_viewport = False
        obj.hide_render = False
        obj.hide_set(False)
    source_collections = list(bpy.data.collections)
    collection_visibility = {collection.name: collection.hide_viewport for collection in source_collections}
    for collection in source_collections:
        collection.hide_viewport = False

    source_materials = sorted({slot.material for obj in source_meshes for slot in obj.material_slots if slot.material}, key=lambda m: m.name)
    material_copies = {material: make_pbr_material(material) for material in source_materials}
    material_copy_names = {copy: source.name for source, copy in material_copies.items()}
    material_color_audit = [{"name": m.name, "diffuseRGBA": list(m.diffuse_color)} for m in source_materials]
    source_stats = {obj.name: mesh_stats(obj, bpy.context.evaluated_depsgraph_get()) for obj in source_meshes}

    source_scene = bpy.context.scene
    source_scene.name = "Female_Modular_Export"
    export_collection = bpy.data.collections.new("Female_Modular_Characters")
    source_scene.collection.children.link(export_collection)
    rig = rig_source.copy()
    rig.data = rig_source.data.copy()
    export_collection.objects.link(rig)
    rig.animation_data_clear()
    rig.animation_data_create()
    rig.animation_data.action = None
    rig.data.pose_position = "POSE"
    rig["sourceAuthor"] = SOURCE_AUTHOR
    rig["sourceLicense"] = SOURCE_LICENSE
    rig["sourceUrl"] = ""
    rig["sourceBlend"] = SOURCE.name

    copies = []
    for source_obj in source_meshes:
        obj = source_obj.copy()
        obj.data = source_obj.data.copy()
        for index, material in enumerate(source_obj.data.materials):
            if material:
                obj.data.materials[index] = material_copies[material]
        export_collection.objects.link(obj)
        obj.hide_set(False, view_layer=source_scene.view_layers[0])
        obj.hide_viewport = False
        obj.hide_render = False
        for modifier in obj.modifiers:
            if modifier.type == "ARMATURE":
                modifier.object = rig
        if source_obj.name in {"Pistol", "Sword"}:
            # Preserve the source bone attachment and its inverse transform.
            obj.parent = rig
            obj.parent_type = "BONE"
            obj.parent_bone = source_obj.parent_bone
            obj.matrix_parent_inverse = source_obj.matrix_parent_inverse.copy()
        obj["sourceAuthor"] = SOURCE_AUTHOR
        obj["sourceLicense"] = SOURCE_LICENSE
        obj["sourceUrl"] = ""
        obj["sourceObject"] = source_obj.name
        copies.append(obj)

    # Free public names in this process after copying; never save source IDs.
    source_mesh_data = {obj.data for obj in source_meshes if obj.data}
    for obj in [rig_source] + source_meshes:
        bpy.data.objects.remove(obj, do_unlink=True)
    for data in source_mesh_data:
        if data.users == 0:
            bpy.data.meshes.remove(data)
    for material in source_materials:
        if material.users == 0:
            bpy.data.materials.remove(material)
    for copied, source_name in material_copy_names.items():
        copied.name = source_name
    for other in list(source_scene.objects):
        if other != rig and other not in copies:
            bpy.data.objects.remove(other, do_unlink=True)
    rig.name = "CharacterArmature"
    for obj in copies:
        obj.name = obj.get("sourceObject")

    # The source collection is kept hidden as an explicit guard. Export uses
    # only the active export collection and its local, visible copies.
    for collection in source_collections:
        collection.hide_viewport = True
    for obj in source_scene.objects:
        if obj in copies or obj == rig:
            obj.hide_viewport = False
            obj.hide_set(False)
    bpy.context.view_layer.update()

    rig.data.pose_position = "REST"
    source_scene.frame_set(0)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    height_objects = [next(obj for obj in copies if obj.name == slot_map[slot]["Casual"]) for slot in SLOTS]
    height = object_bounds_height(height_objects, depsgraph)
    evaluated_stats = {obj.name: mesh_stats(obj, depsgraph) for obj in copies}
    triangle_count = sum(item["triangles"] for item in evaluated_stats.values())
    rig_bone_count = len(rig.data.bones)
    rig.data.pose_position = "POSE"
    bpy.context.view_layer.update()
    frame_ranges = {name: [float(actions[name].frame_range[0]), float(actions[name].frame_range[1])] for name in EXPECTED_ACTIONS}

    bpy.ops.export_scene.gltf(
        filepath=str(GLB), check_existing=False, export_format="GLB", use_active_scene=True,
        use_selection=False, use_visible=False, export_animations=True, export_animation_mode="ACTIONS",
        export_nla_strips=False, export_skins=True, export_rest_position_armature=True,
        export_apply=True, export_gn_mesh=True, export_extras=True,
        export_copyright=f"{SOURCE_AUTHOR}; {SOURCE_LICENSE}; user-provided source",
        export_materials="EXPORT", export_image_format="AUTO", export_yup=True,
        export_frame_range=False, export_optimize_animation_size=False,
        export_optimize_animation_keep_anim_armature=True,
        export_optimize_animation_keep_anim_object=True, export_loglevel=-1,
    )
    if not GLB.is_file() or GLB.stat().st_size < 100_000:
        raise RuntimeError("GLB export is missing or unexpectedly small")

    catalog = {
        "schemaVersion": 1, "sourceId": "modular-women-v1", "assetFile": "master.glb",
        "assetSha256": sha256(GLB), "sourceBlendSha256": source_hash,
        "author": SOURCE_AUTHOR, "license": SOURCE_LICENSE, "sourceUrl": "",
        "variants": list(VARIANTS), "slots": slot_map, "equipment": EQUIPMENT,
        "clips": list(EXPECTED_ACTIONS), "rig": {"name": "CharacterArmature", "bones": 62},
        "height": round(height, 6),
        "provenance": {"status": "unverified", "sourceFile": "assets/source/characters/women/Humans_Master.blend"},
    }
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    PROVENANCE.write_text(json.dumps({
        "author": SOURCE_AUTHOR,
        "license": SOURCE_LICENSE,
        "sourceUrl": "",
        "status": "unverified; no license grant or author identity was established",
        "file": "Humans_Master.blend",
        "sha256": source_hash,
        "bytes": SOURCE.stat().st_size,
        "userProvidedSource": "C:/Users/kaup/Desktop/Zeitalter Probierbereich/Models&Animations/All together.blend",
        "copyMethod": "byte-for-byte copy; verified against the user-provided SHA-256",
        "library": "apps/client/public/assets/characters/women/master.glb",
        "catalog": "apps/client/public/assets/characters/women/catalog.json",
        "recipe": "tools/characters/export_female_master.py",
        "adaptations": [
            "Export 40 original outfit meshes plus the native Pistol and Sword bone attachments.",
            "Keep an independent copy of the original CharacterArmature and its 24 source actions.",
            "Translate local diffuse swatches to PBR material copies; preserve the source blend bytes.",
            "Evaluate modifiers and let the glTF exporter reduce/normalize skin weights to four influences."
        ],
        "openItems": ["author and license verification", "human art and animation acceptance", "tactical game integration"]
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    validation = validate_exported_glb(GLB, part_names)
    source_after = sha256(SOURCE)
    if source_after != source_hash:
        raise RuntimeError(f"Source blend changed during export: before={source_hash}, after={source_after}")
    report = {
        "sourceFile": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "sourceBlendSha256Before": source_hash, "sourceBlendSha256After": source_after,
        "blender": bpy.app.version_string, "exportFile": str(GLB.relative_to(ROOT)).replace("\\", "/"),
        "exportBytes": GLB.stat().st_size, "exportSha256": catalog["assetSha256"],
        "catalogFile": str(CATALOG.relative_to(ROOT)).replace("\\", "/"),
        "provenanceFile": str(PROVENANCE.relative_to(ROOT)).replace("\\", "/"),
        "sourcePartCount": len(part_names), "outfitMeshCount": len(part_names),
        "equipmentMeshes": ["Pistol", "Sword"], "sourceVisibility": source_visibility,
        "sourceMeshHandling": {"count": len(source_meshes), "hiddenBeforeProcessActivation": len(source_meshes), "activatedForExport": len(source_meshes), "sourceBlendSaved": False},
        "sourceCollectionsBefore": collection_visibility,
        "rig": {"name": "CharacterArmature", "bones": rig_bone_count},
        "animationNames": list(EXPECTED_ACTIONS), "actionFrameRanges": frame_ranges,
        "height": height, "triangleCountEvaluated": triangle_count,
        "sourceDiffuseMaterialColors": material_color_audit, "glbValidation": validation,
        "sourceMeshStats": source_stats, "exportMeshStats": evaluated_stats, "catalog": catalog,
    }
    AUDIT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    LOG.write_text(
        f"EXPORT_OK bytes={GLB.stat().st_size} sha256={catalog['assetSha256']}\n"
        f"QA outfits=40 gear=2 rigBones=62 clips={validation['clipCount']} "
        f"deformed={validation['clipsWithSkinnedMeshDeformation']} triangles={triangle_count} height={height:.6f}\n",
        encoding="utf-8",
    )
    print(f"EXPORT_OK bytes={GLB.stat().st_size} sha256={catalog['assetSha256']}")
    print(f"QA outfits=40 gear=2 rigBones=62 clips={validation['clipCount']} deformed={validation['clipsWithSkinnedMeshDeformation']} triangles={triangle_count} height={height:.6f}")
    print(f"FILES glb={GLB} catalog={CATALOG} audit={AUDIT}")


if __name__ == "__main__":
    try:
        run_export()
    except Exception:
        traceback.print_exc()
        sys.exit(1)
