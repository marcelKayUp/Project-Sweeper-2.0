"""Convert the CC0 Quaternius casual reference into a CharacterGeometry template.

Run with Blender 5.2.2:
  blender --background --factory-startup --python tools/characters/prepare_quaternius_template.py

The output is a review artifact, not a production asset. It keeps source form,
neutral-pose normals and skinning, while reducing the source to the local
19-joint, five-palette-role CharacterGeometry contract.
"""
from __future__ import annotations

import bpy
import hashlib
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "artifacts/characters/gauntlet/reference/quaternius-casual.glb"
PROVENANCE = ROOT / "artifacts/characters/gauntlet/reference/provenance.json"
OUT = ROOT / "artifacts/characters/gauntlet/template"
OUT.mkdir(parents=True, exist_ok=True)
JSON_OUT = OUT / "quaternius-casual.character.json"
GLB_OUT = OUT / "quaternius-casual-19joint.glb"
REPORT_OUT = OUT / "report.json"

JOINTS = [
    "Hips", "Spine", "Chest", "Neck", "Head",
    "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand",
    "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand",
    "LeftUpperLeg", "LeftLowerLeg", "LeftFoot",
    "RightUpperLeg", "RightLowerLeg", "RightFoot",
]
JOINT_SOURCE = {
    "Hips": "Hips", "Spine": "Torso", "Chest": "Chest", "Neck": "Neck", "Head": "Head",
    "LeftShoulder": "Shoulder.L", "LeftUpperArm": "UpperArm.L", "LeftLowerArm": "LowerArm.L", "LeftHand": "Wrist.L",
    "RightShoulder": "Shoulder.R", "RightUpperArm": "UpperArm.R", "RightLowerArm": "LowerArm.R", "RightHand": "Wrist.R",
    "LeftUpperLeg": "UpperLeg.L", "LeftLowerLeg": "LowerLeg.L", "LeftFoot": "Foot.L",
    "RightUpperLeg": "UpperLeg.R", "RightLowerLeg": "LowerLeg.R", "RightFoot": "Foot.R",
}
JOINT_PARENT = {
    "Hips": None,
    "Spine": "Hips", "Chest": "Spine", "Neck": "Chest", "Head": "Neck",
    "LeftShoulder": "Chest", "LeftUpperArm": "LeftShoulder", "LeftLowerArm": "LeftUpperArm", "LeftHand": "LeftLowerArm",
    "RightShoulder": "Chest", "RightUpperArm": "RightShoulder", "RightLowerArm": "RightUpperArm", "RightHand": "RightLowerArm",
    "LeftUpperLeg": "Hips", "LeftLowerLeg": "LeftUpperLeg", "LeftFoot": "LeftLowerLeg",
    "RightUpperLeg": "Hips", "RightLowerLeg": "RightUpperLeg", "RightFoot": "RightLowerLeg",
}

def source_bone_role(name: str) -> str:
    """Fold every source bone into exactly one of the target 19 joints."""
    if name in {"Root", "Body", "Hips"}:
        return "Hips"
    if name in {"Abdomen", "Torso"}:
        return "Spine"
    if name == "Chest":
        return "Chest"
    if name == "Neck":
        return "Neck"
    if name == "Head":
        return "Head"
    side = "Left" if name.endswith(".L") else "Right" if name.endswith(".R") else None
    if side is None:
        raise ValueError(f"Unmapped source bone: {name}")
    short = name.rsplit(".", 1)[0]
    table = {
        "Shoulder": "Shoulder", "UpperArm": "UpperArm", "LowerArm": "LowerArm", "Wrist": "Hand",
        "Index1": "Hand", "Index2": "Hand", "Index3": "Hand", "Index4": "Hand",
        "Middle1": "Hand", "Middle2": "Hand", "Middle3": "Hand", "Middle4": "Hand",
        "Ring1": "Hand", "Ring2": "Hand", "Ring3": "Hand", "Ring4": "Hand",
        "Pinky1": "Hand", "Pinky2": "Hand", "Pinky3": "Hand", "Pinky4": "Hand",
        "Thumb1": "Hand", "Thumb2": "Hand", "Thumb3": "Hand",
        "UpperLeg": "UpperLeg", "LowerLeg": "LowerLeg", "Foot": "Foot", "PT": "Foot",
    }
    if short not in table:
        raise ValueError(f"Unmapped source bone: {name}")
    return side + table[short]

def role_for_material(material_name: str) -> str:
    name = material_name.casefold()
    if "skin" in name:
        return "skin"
    if "hair" in name or "eyebrow" in name:
        return "hair"
    if "eye" in name:
        return "accent"
    if name in {"white", "red_dark"} or "armor" in name or "metal" in name:
        return "armor"
    # LightBlue, LightBrown and the shirt's neutral greys are garment colors.
    return "cloth"

def rgb_to_hex(rgb):
    def linear_to_srgb(c):
        c = max(0.0, min(1.0, float(c)))
        return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1.0 / 2.4)) - 0.055
    return "#" + "".join(f"{round(linear_to_srgb(c) * 255):02X}" for c in rgb[:3])

def mesh_color(material):
    if material and material.use_nodes:
        principled = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if principled:
            return tuple(principled.inputs["Base Color"].default_value[:3])
    if material:
        return tuple(material.diffuse_color[:3])
    return (0.5, 0.5, 0.5)

def normalized_point(point, x_center, z_min, scale):
    # Blender's glTF importer presents this Y-up asset in Blender Z-up space.
    # x,z,-y is a right-handed quarter turn that makes the face point +Z.
    return ((point.x - x_center) * scale, (point.z - z_min) * scale, -point.y * scale)

def main():
    provenance = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    source_hash = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    if source_hash.lower() != provenance["sha256"].lower():
        raise RuntimeError(f"Reference SHA-256 mismatch: {source_hash}")

    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    armature = next((obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"), None)
    if armature is None or len(armature.data.bones) != 62:
        raise RuntimeError("Expected the verified 62-bone Quaternius armature")
    action = next((a for a in bpy.data.actions if "Idle_Neutral" in a.name), None)
    if action is None:
        raise RuntimeError("Source action CharacterArmature|Idle_Neutral is missing")
    armature.animation_data_create()
    armature.animation_data.action = action
    bpy.context.scene.frame_set(round((action.frame_range[0] + action.frame_range[1]) * 0.5))
    bpy.context.view_layer.update()

    source_meshes = [o for o in bpy.context.scene.objects if o.type == "MESH" and o.name.startswith("Casual2_")]
    if len(source_meshes) != 4:
        raise RuntimeError(f"Expected 4 character meshes, found {len(source_meshes)}")

    # Spend almost all simplification on the large shirt/upper-body surface.
    # Head, feet and legs retain a much higher fraction to protect face/hands/feet.
    ratios = {"Casual2_Body": 0.66, "Casual2_Head": 1.0, "Casual2_Legs": 0.98, "Casual2_Feet": 1.0}
    for obj in source_meshes:
        decimate = obj.modifiers.new("ReviewTemplateTriangleBudget", "DECIMATE")
        decimate.ratio = ratios[obj.name]
        decimate.decimate_type = "COLLAPSE"
        # Place simplification before skinning so the actual source weights survive.
        arm_mod = next((i for i, mod in enumerate(obj.modifiers) if mod.type == "ARMATURE"), None)
        if arm_mod is not None:
            while obj.modifiers.find(decimate.name) > arm_mod:
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.modifier_move_up(modifier=decimate.name)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=decimate.name)

    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = []
    bounds = []
    for obj in source_meshes:
        ev_obj = obj.evaluated_get(depsgraph)
        mesh = ev_obj.to_mesh(preserve_all_data_layers=True, depsgraph=depsgraph)
        mesh.calc_loop_triangles()
        world = ev_obj.matrix_world
        evaluated.append((obj, ev_obj, mesh, world))
        for vertex in mesh.vertices:
            bounds.append(world @ vertex.co)
    if not bounds:
        raise RuntimeError("No evaluated source vertices")
    z_min = min(p.z for p in bounds)
    z_max = max(p.z for p in bounds)
    x_center = (min(p.x for p in bounds) + max(p.x for p in bounds)) * 0.5
    height = z_max - z_min
    scale = 1.05 / height

    # Positions of target joint anchors in the baked neutral pose, in target space.
    arm_ev = armature.evaluated_get(depsgraph)
    anchors = {}
    for joint, source_name in JOINT_SOURCE.items():
        pose_bone = arm_ev.pose.bones.get(source_name)
        if pose_bone is None:
            raise RuntimeError(f"Missing target anchor source bone {source_name}")
        point = arm_ev.matrix_world @ pose_bone.head
        anchors[joint] = normalized_point(point, x_center, z_min, scale)
    joints = []
    joint_index = {name: i for i, name in enumerate(JOINTS)}
    for name in JOINTS:
        parent = JOINT_PARENT[name]
        p = anchors[name]
        pp = anchors[parent] if parent else (0.0, 0.0, 0.0)
        joints.append({
            "id": name,
            "parentIndex": joint_index[parent] if parent else None,
            "position": [round(p[i] - pp[i], 7) for i in range(3)],
        })

    roles = ["skin", "hair", "cloth", "armor", "accent"]
    raw_by_role = {role: {"positions": [], "normals": [], "indices": [], "joints": [], "weights": [], "triangles": 0} for role in roles}
    color_area = {role: [0.0, 0.0, 0.0] for role in roles}
    role_area = Counter()
    source_materials = {}
    source_group_mapping = {}
    source_bone_names = [bone.name for bone in armature.data.bones]
    for bone_name in source_bone_names:
        source_group_mapping[bone_name] = source_bone_role(bone_name)

    for obj, ev_obj, mesh, world in evaluated:
        group_names = {group.index: group.name for group in ev_obj.vertex_groups}
        mapped_groups = {index: source_bone_role(name) for index, name in group_names.items()}
        material_role = {}
        for mat_index, material in enumerate(obj.data.materials):
            if not material:
                continue
            role = role_for_material(material.name)
            material_role[mat_index] = role
            source_materials[material.name] = {"role": role, "linearBaseColor": list(mesh_color(material))}
        # Face corners are deliberately duplicated: the contract has flat, explicit
        # arrays and this keeps the source's split/flat normals intact in JSON/GLB.
        for triangle in mesh.loop_triangles:
            poly = mesh.polygons[triangle.polygon_index]
            role = material_role.get(poly.material_index, "cloth")
            bucket = raw_by_role[role]
            material = obj.data.materials[poly.material_index] if poly.material_index < len(obj.data.materials) else None
            rgb = mesh_color(material)
            points = [world @ mesh.vertices[vi].co for vi in triangle.vertices]
            area = (points[1] - points[0]).cross(points[2] - points[0]).length * 0.5
            color_area[role] = [color_area[role][c] + rgb[c] * area for c in range(3)]
            role_area[role] += area
            bucket["triangles"] += 1
            for corner, vertex_index, loop_index, point in zip(range(3), triangle.vertices, triangle.loops, points):
                vertex = mesh.vertices[vertex_index]
                normal = (world.to_3x3().inverted_safe().transposed() @ mesh.loops[loop_index].normal).normalized()
                position = normalized_point(point, x_center, z_min, scale)
                normal_target = Vector((normal.x, normal.z, -normal.y)).normalized()
                bucket["positions"].extend(round(v, 7) for v in position)
                bucket["normals"].extend(round(v, 7) for v in normal_target)
                combined = defaultdict(float)
                for group in vertex.groups:
                    target = mapped_groups.get(group.group)
                    if target:
                        combined[joint_index[target]] += max(0.0, float(group.weight))
                ranked = sorted(combined.items(), key=lambda item: (-item[1], item[0]))[:4]
                total = sum(weight for _, weight in ranked)
                if total <= 1e-8:
                    ranked, total = [(joint_index["Hips"], 1.0)], 1.0
                idx = [index for index, _ in ranked]
                weights = [weight / total for _, weight in ranked]
                idx += [joint_index["Hips"]] * (4 - len(idx))
                weights += [0.0] * (4 - len(weights))
                bucket["joints"].extend(idx)
                bucket["weights"].extend(round(v, 7) for v in weights)
                bucket["indices"].append(len(bucket["indices"]))

    # Complete semantic palette, weighted by original source face area.
    defaults = {
        "skin": (0.62, 0.39, 0.26), "hair": (0.10, 0.07, 0.05),
        "cloth": (0.18, 0.24, 0.30), "armor": (0.55, 0.55, 0.55), "accent": (0.08, 0.12, 0.16),
    }
    palette = {}
    linear_palette = {}
    for role in roles:
        total = role_area[role]
        linear = tuple(color_area[role][i] / total for i in range(3)) if total else defaults[role]
        linear_palette[role] = linear
        palette[role] = rgb_to_hex(linear)

    parts = []
    for role in roles:
        bucket = raw_by_role[role]
        if not bucket["triangles"]:
            continue
        parts.append({
            "id": f"quaternius-{role}", "material": role,
            "positions": bucket["positions"], "normals": bucket["normals"],
            "indices": bucket["indices"], "joints": bucket["joints"], "weights": bucket["weights"],
        })
    triangles = sum(part["triangles"] for part in raw_by_role.values())
    if triangles > 5000:
        raise RuntimeError(f"Triangle budget exceeded after conservatively weighted decimation: {triangles}")

    spec = {
        "schemaVersion": 1, "id": "quaternius-casual-cc0-template", "seed": 0,
        "body": "standard", "stature": 1.0, "hair": "crop", "outfit": "runner", "accessory": "none", "palette": palette,
    }
    geometry = {
        "spec": spec,
        "joints": joints,
        "parts": parts,
        "stats": {"triangles": triangles, "vertices": sum(len(p["positions"]) // 3 for p in parts), "materials": len(parts), "bones": 19, "height": round((z_max-z_min)*scale, 7)},
        "baseColors": {role: {"hex": palette[role], "sourceLinearAreaAverage": [round(c, 7) for c in linear_palette[role]], "sampledSurfaceArea": round(role_area[role], 7)} for role in roles},
        "sourceMetadata": {
            "creator": provenance["creator"], "reference": provenance["reference"], "license": provenance["license"],
            "licenseUrl": provenance["licenseUrl"], "officialPage": provenance["officialPage"],
            "creatorModelPage": provenance["creatorModelPage"], "sourceFile": SOURCE.name, "sourceSha256": source_hash,
            "transformation": "Quaternius CC0 casual source; Idle_Neutral frame 20 baked; source materials area-averaged into 5 semantic roles; no external textures; bone influences merged to local 19-joint rig; source geometry simplified; coordinates converted to Y-up, +Z-front, sole Y=0, height 1.05.",
        },
    }
    JSON_OUT.write_text(json.dumps(geometry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Build a separately inspectable, skinned GLB with the identical neutral-pose mesh.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    arm_data = bpy.data.armatures.new("QuaterniusCC0_CharacterRig")
    target_arm = bpy.data.objects.new("QuaterniusCC0_CharacterRig", arm_data)
    bpy.context.collection.objects.link(target_arm)
    bpy.context.view_layer.objects.active = target_arm
    target_arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit = {}
    for name in JOINTS:
        bone = arm_data.edit_bones.new(name)
        edit[name] = bone
        head = anchors[name]
        # Align bone display axis to child when available, otherwise to local up.
        bone.head = head
        child = next((child_name for child_name in JOINTS if JOINT_PARENT[child_name] == name), None)
        tail = anchors[child] if child else (head[0], head[1] + 0.04, head[2])
        direction = Vector(tail) - Vector(head)
        if direction.length < 0.015:
            direction = Vector((0, 0.04, 0))
        bone.tail = Vector(head) + direction.normalized() * max(0.025, min(0.07, direction.length))
        parent = JOINT_PARENT[name]
        if parent:
            bone.parent = edit[parent]
            bone.use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")

    for part in parts:
        role = part["material"]
        positions = [tuple(part["positions"][i:i+3]) for i in range(0, len(part["positions"]), 3)]
        faces = [tuple(part["indices"][i:i+3]) for i in range(0, len(part["indices"]), 3)]
        mesh_data = bpy.data.meshes.new(part["id"] + "Mesh")
        mesh_data.from_pydata(positions, [], faces)
        mesh_data.update()
        obj = bpy.data.objects.new(part["id"], mesh_data)
        bpy.context.collection.objects.link(obj)
        # Smooth flags + loop custom normals reproduce the source's split normals.
        for poly in mesh_data.polygons:
            poly.use_smooth = True
        mesh_data.normals_split_custom_set([tuple(part["normals"][loop.vertex_index*3:loop.vertex_index*3+3]) for loop in mesh_data.loops])
        for joint in JOINTS:
            obj.vertex_groups.new(name=joint)
        for vertex_index in range(len(positions)):
            base = vertex_index * 4
            for slot in range(4):
                weight = part["weights"][base + slot]
                if weight > 0:
                    obj.vertex_groups[joint_by_index(part["joints"][base + slot])].add([vertex_index], weight, "REPLACE")
        modifier = obj.modifiers.new("CharacterSkin", "ARMATURE")
        modifier.object = target_arm
        obj.parent = target_arm
        material = bpy.data.materials.new("Palette_" + role)
        material.diffuse_color = (*linear_palette[role], 1.0)
        material.use_nodes = True
        principled = next(n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        principled.inputs["Base Color"].default_value = (*linear_palette[role], 1.0)
        mesh_data.materials.append(material)

    # Metadata is explicit in the sidecar; custom properties keep the GLB provenance too.
    target_arm["source_creator"] = provenance["creator"]
    target_arm["source_license"] = provenance["license"]
    target_arm["source_sha256"] = source_hash
    target_arm["asset_status"] = "CC0-derived review template; do not label as original production"
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.resolution_x = 800
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.055, 0.065, 0.08)
    bpy.ops.object.select_all(action="DESELECT")
    target_arm.select_set(True)
    bpy.context.view_layer.objects.active = target_arm
    bpy.ops.export_scene.gltf(filepath=str(GLB_OUT), export_format="GLB", use_selection=True, export_animations=False, export_skins=True, export_apply=False)

    source_bone_to_target = {name: source_bone_role(name) for name in source_bone_names}
    mesh_stats = {"sourceMeshes": {obj.name: {"sourceTriangles": sum(len(poly.vertices)-2 for poly in obj.data.polygons), "decimateRatio": ratios[obj.name]} for obj in source_meshes}}
    mesh_stats["sourceMaterials"] = source_materials
    mesh_stats["sourceBoneToTarget"] = source_bone_to_target
    mesh_stats["sourceBoneMappingSummary"] = dict(Counter(source_bone_to_target.values()))
    mesh_stats["paletteSampling"] = {role: {"color": palette[role], "surfaceArea": round(role_area[role], 7), "linearAverage": [round(c, 7) for c in linear_palette[role]]} for role in roles}
    mesh_stats["quality"] = {
        "triangleCount": triangles, "vertexCount": geometry["stats"]["vertices"], "height": geometry["stats"]["height"],
        "nonzeroNormalCount": sum(1 for part in parts for i in range(0, len(part["normals"]), 3) if math.sqrt(sum(x*x for x in part["normals"][i:i+3])) > 0.99),
        "normalCount": sum(len(part["normals"]) // 3 for part in parts),
        "allNormalsFinite": all(math.isfinite(v) for part in parts for v in part["normals"]),
        "fourWeightsPerVertex": all(len(part["joints"]) == 4 * (len(part["positions"]) // 3) and len(part["weights"]) == len(part["joints"]) for part in parts),
        "weightMinSum": min(sum(part["weights"][i:i+4]) for part in parts for i in range(0, len(part["weights"]), 4)),
        "weightMaxSum": max(sum(part["weights"][i:i+4]) for part in parts for i in range(0, len(part["weights"]), 4)),
        "closedMeshCount": 0,
        "closedMeshNote": "Source parts contain intentional open garment/skin surfaces and are split by palette role; watertightness is not a contract requirement.",
    }
    mesh_stats["rig"] = {"jointOrder": JOINTS, "jointParents": JOINT_PARENT, "jointSourceAnchors": JOINT_SOURCE, "sourceBoneCount": len(source_bone_names), "targetBoneCount": 19, "poseBaked": action.name, "poseFrame": bpy.context.scene.frame_current}
    mesh_stats["source"] = {"file": SOURCE.name, "sha256": source_hash, "license": provenance["license"], "creator": provenance["creator"], "provenance": str(PROVENANCE.relative_to(ROOT))}
    REPORT_OUT.write_text(json.dumps(mesh_stats, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Release evaluated Blender meshes before rendering; report already contains the source data.
    # (The temporary scene at this point consists of the target only.)
    render_review()

def joint_by_index(index):
    return JOINTS[index]

def render_review():
    # A plain orthographic review setup. Presentation helpers are only in the GLB-free
    # report renders and are intentionally not selected/exported with the character.
    scene = bpy.context.scene
    world = scene.world
    if world:
        world.use_nodes = True
        world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.055, 0.065, 0.08, 1.0)
        world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    center = (0, 0.525, 0)
    cam_data = bpy.data.cameras.new("ReviewCamera")
    cam = bpy.data.objects.new("ReviewCamera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0, 0.525, 3.7)
    cam.rotation_euler = (0, 0, 0)
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 1.35
    scene.camera = cam
    # Place camera looking toward -Z with +Y up.
    cam.rotation_euler = (0, 0, 0)
    def point_at(obj, target):
        obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    point_at(cam, center)
    lights = []
    for name, loc, power, size in [
        ("Key", (2.3, 2.5, 3.0), 450, 2.2), ("Fill", (-2.2, 1.3, 2.0), 260, 2.5), ("Rim", (0.3, 2.2, -2.0), 360, 1.8),
    ]:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = power
        data.shape = "DISK"
        data.size = size
        obj = bpy.data.objects.new(name, data)
        scene.collection.objects.link(obj)
        obj.location = loc
        point_at(obj, center)
        lights.append(obj)
    target = bpy.context.scene.camera
    scene.render.filepath = str(OUT / "target-front.png")
    bpy.ops.render.render(write_still=True)
    cam.location = (2.7, 1.65, 2.7)
    point_at(cam, center)
    scene.render.filepath = str(OUT / "target-iso.png")
    bpy.ops.render.render(write_still=True)
    scene.render.filepath = str(OUT / "target-side.png")
    cam.location = (3.5, 1.5, 0)
    point_at(cam, center)
    bpy.ops.render.render(write_still=True)

main()
