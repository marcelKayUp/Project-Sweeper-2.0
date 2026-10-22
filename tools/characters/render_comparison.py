"""Render an imported character with a fixed neutral review setup (no asset edits)."""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]


def local(value):
    result = Path(value).resolve()
    if not result.is_relative_to(ROOT):
        raise ValueError("Review files must stay in the project")
    return result


def vertices(objects):
    graph = bpy.context.evaluated_depsgraph_get()
    result = []
    for obj in objects:
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        result.extend(evaluated.matrix_world @ vertex.co for vertex in mesh.vertices)
        evaluated.to_mesh_clear()
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--output", required=True)
    parser.add_argument("--action", default="idle")
    parser.add_argument("--phase", type=float, default=0.5)
    parser.add_argument("--views", default="front,iso,side,back")
    arguments = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    source, output = local(arguments.source), local(arguments.output)
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    scene = bpy.context.scene
    imported = list(scene.objects)
    meshes = [obj for obj in imported if obj.type == "MESH" and not any(c.name == "glTF_not_exported" for c in obj.users_collection)]
    armatures = [obj for obj in imported if obj.type == "ARMATURE"]
    for armature in armatures:
        armature.data.pose_position = "REST"
        if armature.animation_data:
            armature.animation_data.action = None
            for track in armature.animation_data.nla_tracks:
                track.mute = True
    bpy.context.view_layer.update()
    points = vertices(meshes)
    low = [min(p[axis] for p in points) for axis in range(3)]
    high = [max(p[axis] for p in points) for axis in range(3)]
    height = high[2] - low[2]
    if height <= 0:
        raise AssertionError("Empty character")
    normalizer = bpy.data.objects.new("Review normalization", None)
    scene.collection.objects.link(normalizer)
    for obj in imported:
        if obj.parent is None:
            obj.parent = normalizer
    scale = 1.05 / height
    normalizer.scale = (scale,) * 3
    normalizer.location = (-(low[0] + high[0]) / 2 * scale, -(low[1] + high[1]) / 2 * scale, -low[2] * scale)
    actions = list(bpy.data.actions)
    selected = next((action for action in actions if action.name.lower() == arguments.action.lower()), None)
    if selected is None:
        selected = next((action for action in actions if arguments.action.lower() in action.name.lower()), None)
    if selected:
        for armature in armatures:
            armature.data.pose_position = "POSE"
            armature.animation_data_create()
            armature.animation_data.action = selected
            if len(selected.slots):
                armature.animation_data.action_slot = selected.slots[0]
        start, end = selected.frame_range
        frame = start + (end - start) * arguments.phase
        scene.frame_set(math.floor(frame), subframe=frame % 1)
    bpy.context.view_layer.update()
    # Recenter the currently visible pose horizontally, preserving its floor height.
    pose_points = vertices(meshes)
    center_x = (min(p.x for p in pose_points) + max(p.x for p in pose_points)) / 2
    center_y = (min(p.y for p in pose_points) + max(p.y for p in pose_points)) / 2
    normalizer.location.x -= center_x
    normalizer.location.y -= center_y
    floor = min(p.z for p in pose_points)
    normalizer.location.z -= floor
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.006))
    material = bpy.data.materials.new("Review floor")
    material.use_nodes = True
    material.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.045, 0.055, 0.07, 1)
    material.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    bpy.context.object.data.materials.append(material)
    scene.world = bpy.data.worlds.new("Review world")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.18, 0.22, 0.28, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5
    target = Vector((0, 0, 0.52))
    for name, location, energy, size in [("Key", (2, -3, 4), 180, 3), ("Fill", (-2, -1, 2), 90, 2), ("Rim", (0, 2, 3), 200, 2)]:
        light = bpy.data.lights.new(name, "AREA")
        light.energy, light.shape, light.size = energy, "DISK", size
        obj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(obj)
        obj.location = location
        obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("Review camera")
    camera = bpy.data.objects.new("Review camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 1.38
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 800
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    cameras = {"front": (0, -4, 0.52), "iso": (2.5, -3.5, 1.9), "side": (4, 0, 0.52), "back": (0, 4, 0.52)}
    for view in arguments.views.split(","):
        camera.location = cameras[view]
        camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(output / f"{view}.png")
        bpy.ops.render.render(write_still=True)
    report = {"source": str(source.relative_to(ROOT)), "blender": bpy.app.version_string, "normalizedHeight": 1.05, "originalHeight": height, "meshes": len(meshes), "triangles": sum(sum(len(p.vertices) - 2 for p in mesh.data.polygons) for mesh in meshes), "bones": [len(armature.data.bones) for armature in armatures], "actions": [action.name for action in actions], "selectedAction": selected.name if selected else "REST", "phase": arguments.phase, "poseFloorBeforeReviewNormalization": floor, "views": arguments.views.split(","), "normalization": "uniform 1.05 height from rest bounds; horizontal center and visible pose floor; no geometry, skin or material edits"}
    (output / "render.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
