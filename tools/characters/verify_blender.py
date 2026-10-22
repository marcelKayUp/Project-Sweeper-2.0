"""Independently inspect a workshop GLB, save its editable Blend and render review views.

Run with Blender's Python: blender --background --factory-startup --python-exit-code 1
--python tools/characters/verify_blender.py -- artifacts/characters/runner.glb
All output stays in this project. No external assets, add-ons or services are used.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


CLIPS = ("idle", "walk", "crouch", "shoot", "reload", "hit", "death")
ROOT = Path(__file__).resolve().parents[2]


def project_path(value):
    result = Path(value).resolve()
    if not result.is_relative_to(ROOT):
        raise ValueError("Output and input must stay inside the project")
    return result


def mesh_points(objects):
    graph = bpy.context.evaluated_depsgraph_get()
    points = []
    for obj in objects:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        points.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        evaluated.to_mesh_clear()
    return points


def bounds(points):
    return {
        "min": [min(point[axis] for point in points) for axis in range(3)],
        "max": [max(point[axis] for point in points) for axis in range(3)],
    }


def select_action(armature, action):
    armature.data.pose_position = "POSE"
    armature.animation_data_create()
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.animation_data.action = action
    if action and len(action.slots):
        armature.animation_data.action_slot = action.slots[0]


def main():
    arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("glb")
    parser.add_argument("--output", default=str(ROOT / "artifacts/characters/blender"))
    parser.add_argument("--blend", default=str(ROOT / "assets/source/characters/neon-runner.blend"))
    args = parser.parse_args(arguments)
    source = project_path(args.glb)
    output = project_path(args.output)
    blend = project_path(args.blend)
    output.mkdir(parents=True, exist_ok=True)
    blend.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    armatures = [obj for obj in scene.objects if obj.type == "ARMATURE"]
    # Blender's glTF importer creates bone-display helper meshes in this collection.
    # These are not payload meshes and have no skin modifier.
    import_helpers = [obj for obj in scene.objects if any(collection.name == "glTF_not_exported" for collection in obj.users_collection)]
    meshes = [obj for obj in scene.objects if obj.type == "MESH" and obj not in import_helpers]
    if len(armatures) != 1 or not meshes:
        raise AssertionError(f"Expected one armature and meshes, got {len(armatures)}, {len(meshes)}")
    armature = armatures[0]
    if len(armature.data.bones) < 19:
        raise AssertionError("Missing humanoid bones")
    for mesh in meshes:
        if not any(modifier.type == "ARMATURE" for modifier in mesh.modifiers):
            raise AssertionError(f"{mesh.name}: no skin modifier")
        for vertex in mesh.data.vertices:
            total = sum(group.weight for group in vertex.groups)
            if abs(total - 1) > 0.001:
                raise AssertionError(f"{mesh.name}: unnormalized skin weights {total}")
    triangles = sum(sum(len(polygon.vertices) - 2 for polygon in mesh.data.polygons) for mesh in meshes)
    if triangles > 5000:
        raise AssertionError(f"Triangle budget exceeded: {triangles}")
    actions = {clip: next((a for a in bpy.data.actions if a.name == clip or a.name.startswith(clip + "_") or a.name.startswith(clip + ".")), None) for clip in CLIPS}
    if any(action is None for action in actions.values()):
        raise AssertionError(f"Missing clips: {[name for name, action in actions.items() if action is None]}; found {[a.name for a in bpy.data.actions]}")
    select_action(armature, None)
    armature.data.pose_position = "REST"
    bpy.context.view_layer.update()
    rest_points = mesh_points(meshes)
    rest = bounds(rest_points)
    height = rest["max"][2] - rest["min"][2]
    if not 0.8 < height < 1.4 or abs(rest["min"][2]) > 0.005:
        raise AssertionError(f"Unexpected rest dimensions/ground contact: {rest}")
    posed = {}
    for clip, action in actions.items():
        select_action(armature, action)
        start, end = action.frame_range
        if end <= start:
            raise AssertionError(f"Empty animation {clip}")
        scene.frame_set(int(start + (end - start) * 0.5))
        bpy.context.view_layer.update()
        points = mesh_points(meshes)
        posed[clip] = {
            "action": action.name,
            "frames": [float(start), float(end)],
            "bounds": bounds(points),
            "maxVertexDisplacement": max((a - b).length for a, b in zip(points, rest_points)),
        }
        if clip != "idle" and posed[clip]["maxVertexDisplacement"] < 0.002:
            raise AssertionError(f"{clip}: no visible skinned vertex deformation")
        duration = (end - start) / (scene.render.fps / scene.render.fps_base)
        samples = max(1, math.ceil(duration * 30))
        floor_heights = []
        for sample in range(samples + 1):
            frame = start + (end - start) * sample / samples
            scene.frame_set(math.floor(frame), subframe=frame % 1)
            bpy.context.view_layer.update()
            floor_heights.append(min(point.z for point in mesh_points(meshes)))
        posed[clip]["floorSamples"] = len(floor_heights)
        posed[clip]["floorRange"] = [min(floor_heights), max(floor_heights)]
        if any(abs(floor) > 0.005 for floor in floor_heights):
            raise AssertionError(f"{clip}: lost animated ground contact: {posed[clip]['floorRange']}")

    select_action(armature, None)
    armature.data.pose_position = "REST"
    scene.frame_set(0)
    stage = bpy.data.collections.new("Review stage — presentation only")
    scene.collection.children.link(stage)

    def stage_object(obj):
        for collection in list(obj.users_collection):
            collection.objects.unlink(obj)
        stage.objects.link(obj)
        return obj

    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.006))
    floor = stage_object(bpy.context.object)
    floor.name = "Review floor"
    material = bpy.data.materials.new("Review charcoal")
    material.diffuse_color = (0.035, 0.05, 0.07, 1)
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = material.diffuse_color
    material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
    floor.data.materials.append(material)
    scene.world = bpy.data.worlds.new("Review world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.18, 0.22, 0.28, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
    for name, location, energy, size in [
        ("Key", (2, -3, 4), 180, 3),
        ("Fill", (-2, -1, 2), 90, 2),
        ("Rim", (0, 2, 3), 200, 2),
    ]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.shape, light.size = energy, "DISK", size
        obj = bpy.data.objects.new(name, light)
        stage.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (Vector((0, 0, height * 0.5)) - obj.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("Review camera")
    camera = bpy.data.objects.new("Review camera", camera_data)
    stage.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = height * 1.55
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    renders = []
    for name, location in [("iso", (2.5, -3.5, 2.0)), ("front", (0, -4, height * 0.6)), ("back", (0, 4, height * 0.6))]:
        camera.location = location
        camera.rotation_euler = (Vector((0, 0, height * 0.47)) - camera.location).to_track_quat("-Z", "Y").to_euler()
        destination = output / f"{name}.png"
        scene.render.filepath = str(destination)
        bpy.ops.render.render(write_still=True)
        renders.append(str(destination.relative_to(ROOT)))
    select_action(armature, actions["walk"])
    scene.frame_set(int(sum(actions["walk"].frame_range) / 2))
    camera.location = (2.5, -3.5, 2.0)
    camera.rotation_euler = (Vector((0, 0, height * 0.47)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(output / "walk.png")
    bpy.ops.render.render(write_still=True)
    renders.append(str((output / "walk.png").relative_to(ROOT)))
    select_action(armature, actions["idle"])
    scene.frame_set(0)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
    report = {
        "blenderVersion": bpy.app.version_string,
        "source": str(source.relative_to(ROOT)),
        "blend": str(blend.relative_to(ROOT)),
        "meshCount": len(meshes),
        "importerHelperCount": len(import_helpers),
        "boneCount": len(armature.data.bones),
        "triangles": triangles,
        "restBounds": rest,
        "clips": posed,
        "renders": renders,
        "humanArtAcceptance": "open",
    }
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "report": str(output / "report.json"), "blend": str(blend)}))


if __name__ == "__main__":
    main()
