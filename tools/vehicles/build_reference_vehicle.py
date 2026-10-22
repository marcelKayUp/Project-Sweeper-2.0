"""Build an editable low-poly vehicle from the explicit single-image assumptions.

Run in a separate Blender background process. Never touches interactive scenes.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]


def local(value):
    result=(ROOT/value).resolve()
    if result==ROOT or not result.is_relative_to(ROOT): raise ValueError("Output outside project")
    return result


def linear(color):
    rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    return [v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]


def material(name,color,metallic=0,roughness=.5,emission=0):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    node=mat.node_tree.nodes["Principled BSDF"]
    node.inputs["Base Color"].default_value=(*linear(color),1)
    node.inputs["Metallic"].default_value=metallic
    node.inputs["Roughness"].default_value=roughness
    if emission:
        node.inputs["Emission Color"].default_value=(*linear(color),1)
        node.inputs["Emission Strength"].default_value=emission
    return mat


def mesh(name,vertices,faces,mat):
    data=bpy.data.meshes.new(name)
    data.from_pydata(vertices,[],faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


def box(name,size,position,mat,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position)
    obj=bpy.context.object; obj.name=name; obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    if bevel:
        modifier=obj.modifiers.new("Low-poly chamfer","BEVEL")
        modifier.width=min(bevel,min(size)/3); modifier.segments=1
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    return obj


def profile(name,xz,widths,mat):
    # Symmetric variable-width shell. Its near-side vertices are back-projected
    # from annotated image corners; hidden side and width taper are assumptions.
    count=len(xz)
    verts=[(x,side*w,max(z,.08)) for side in (-1,1) for (x,z),w in zip(xz,widths)]
    faces=[tuple(reversed(range(count))),tuple(range(count,count*2))]
    for i in range(count):
        j=(i+1)%count; faces.append((i,j,j+count,i+count))
    return mesh(name,verts,faces,mat)


def plane_panel(name,xz,widths,mat,side=-1,offset=.01):
    verts=[(x,side*(w+offset),z) for (x,z),w in zip(xz,widths)]
    return mesh(name,verts,[tuple(range(len(verts)))],mat)


def tube(name,points,radius,mat,sides=6):
    vertices=[]
    for i,p in enumerate(points):
        p=Vector(p)
        tangent=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])
        tangent.normalize()
        axis=tangent.cross(Vector((0,0,1)))
        if axis.length<.001: axis=tangent.cross(Vector((0,1,0)))
        axis.normalize(); second=tangent.cross(axis).normalized()
        for k in range(sides):
            angle=2*math.pi*k/sides
            vertices.append(tuple(p+radius*(axis*math.cos(angle)+second*math.sin(angle))))
    faces=[tuple(reversed(range(sides))),tuple(range((len(points)-1)*sides,len(points)*sides))]
    for i in range(len(points)-1):
        for k in range(sides):
            j=(k+1)%sides; faces.append((i*sides+k,i*sides+j,(i+1)*sides+j,(i+1)*sides+k))
    return mesh(name,vertices,faces,mat)


def wheel_data(mat):
    vertices=[]; faces=[]; segments=16
    # Wheel axis is local Y, geometry normalized and linked across all six tires.
    for y,r in [(-.22,.84),(-.17,1),(.17,1),(.22,.84)]:
        vertices.extend([(r*math.cos(i*math.tau/segments),y,r*math.sin(i*math.tau/segments)) for i in range(segments)])
    faces=[tuple(reversed(range(segments))),tuple(range(3*segments,4*segments))]
    for ring in range(3):
        for i in range(segments):
            j=(i+1)%segments; faces.append((ring*segments+i,ring*segments+j,(ring+1)*segments+j,(ring+1)*segments+i))
    return mesh("Tire geometry",vertices,faces,mat)


def camera(name,position,target=None,analysis=None):
    data=bpy.data.cameras.new(name); obj=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(obj); obj.location=position
    data.clip_start=.1; data.clip_end=500; data.sensor_width=36; data.sensor_fit="HORIZONTAL"
    if analysis:
        yaw,pitch=map(math.radians,(analysis["azimuthDeg"],analysis["elevationDeg"]))
        right=Vector((math.sin(yaw),math.cos(yaw),0))
        forward=Vector((-math.cos(yaw)*math.cos(pitch),math.sin(yaw)*math.cos(pitch),-math.sin(pitch)))
        up=right.cross(forward)
        obj.rotation_euler=Matrix((right,up,-forward)).transposed().to_euler()
        data.lens=analysis["focalPixels"]*36/596
    else:
        obj.rotation_euler=(Vector(target)-obj.location).to_track_quat("-Z","Y").to_euler()
        data.type="ORTHO"; data.ortho_scale=17
    return obj


def render(scene,cam,path,width=1192,height=670):
    if scene.get("skipPreview",False): return
    scene.camera=cam
    scene.render.resolution_x=width; scene.render.resolution_y=height
    scene.render.resolution_percentage=100
    scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--analysis",default="artifacts/reference-truck/analysis.json")
    parser.add_argument("--out",default="assets/generated/vehicles/reference-truck")
    parser.add_argument("--artifacts",default="artifacts/reference-truck")
    parser.add_argument("--no-render",action="store_true")
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    analysis_path=local(args.analysis); analysis=json.loads(analysis_path.read_text())
    out=local(args.out); artifacts=local(args.artifacts)
    out.mkdir(parents=True,exist_ok=True); artifacts.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene
    scene["skipPreview"]=args.no_render
    scene.unit_settings.system="METRIC"; scene.unit_settings.scale_length=1
    scene.render.engine="CYCLES"; scene.cycles.device="CPU"; scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.render.image_settings.file_format="PNG"; scene.render.image_settings.color_mode="RGBA"
    scene.render.film_transparent=True
    scene.world=bpy.data.worlds.new("Studio world"); scene.world.use_nodes=True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value=(.4,.5,.65,1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value=.6
    scene.view_settings.view_transform="AgX"
    palette=analysis["palette"]
    mats={key:material(key,value,.45 if key in ("body","trim","panel") else .03,.42 if key!="dark" else .78,.8 if key=="accent" else 0) for key,value in palette.items()}
    root=bpy.data.objects.new("Reference truck — approximate",None); scene.collection.objects.link(root)
    root["sourceStatus"]="User reference, rights unspecified. Locally authored approximation."
    root["geometryVersion"]="reference-truck/2" if analysis.get("surfaceRefinement") else "reference-truck/1"
    if analysis.get("surfaceRefinement"):
        root["surfaceRefinementSha256"]=analysis["surfaceRefinement"]["reportSha256"]
    root["referenceSha256"]=analysis["referenceSha256"]
    root["cameraFitRmsPixels"]=analysis["fit"]["rmsPixels"]
    profiles=analysis["profilesXZ"]; widths=analysis["profileHalfWidths"]
    mirror_flags=(analysis.get("surfaceRefinement") or {}).get("profileMirroring",{})
    profile("Cargo shell",profiles["cargo"],widths["cargo"],mats["body"])
    for side in (-1,1):
        if side==-1 or mirror_flags.get("sideInset",True):
            plane_panel("Inset side panel",profiles["sideInset"],widths["sideInset"],mats["panel"],side,.025)
        if side==-1 or mirror_flags.get("sideBlackBand",True):
            plane_panel("Black equipment recess",profiles["sideBlackBand"],widths["sideBlackBand"],mats["dark"],side,.04)
        # Lower fairings split around the middle and front wheels rather than filling their arches.
        for xa,xb in [(-7.95,-7.85),(-6.7,-.8),(.65,3.55)]:
            if side==-1 and xb-xa>.2:
                profile("Lower fairing",[(xa,.18),(xa,1.02),(xb,1.20),(xb,.18)],[1.17]*4,mats["body"])
        for xa,xb in [(-6.5,-1.0),(.8,3.35)]:
            y=side*1.20
            tube("Fairing seam",[(xa,y,.26),(xb,y,.26),(xb,y,1.12)],.018,mats["dark"],4)
        if side==-1 or mirror_flags.get("sideInset",True):
            rim=[(x,side*(w+.055),z) for (x,z),w in zip(profiles["sideInset"],widths["sideInset"])]
            tube("Panel perimeter",rim+[rim[0]],.035,mats["dark"],4)
            x,z=profiles["sideInset"][3]
            tube("Vertical cyan marker",[(x+.12,side*1.06,z+.15),(x+.12,side*1.06,z+1.15)],.025,mats["accent"],4)
    # Central underframe and low autonomous tractor, all dimensions explicitly assumed.
    box("Underframe",(14.3,1.8,.25),(-.75,0,.65),mats["dark"],.04)
    profile("Coupling support",[(-.2,.72),(-.2,1.40),(2.8,1.48),(4.75,1.85),(4.75,.72)],[.78,.78,.82,.48,.48],mats["dark"])
    nose_xz=[(3.2,.43),(3.2,1.58),(4.65,1.34),(5.9,1.23),(6.3,1.13),(6.3,.2),(4.9,.18)]
    profile("Low tractor body",nose_xz,[1.1,1.07,1.16,1.22,1.28,1.28,1.13],mats["body"])
    box("Front dark fascia",(.06,2.34,.75),(6.335,0,.65),mats["dark"],.025)
    box("Front upper edge",(.08,2.44,.055),(6.36,0,1.075),mats["trim"],.01)
    box("Front lower edge",(.09,2.35,.04),(6.36,0,.24),mats["trim"],.008)
    for side in (-1,1):
        box("Headlamp surround",(.085,.23,.56),(6.38,side*1.01,.66),mats["trim"],.02)
        box("Headlamp",(.10,.13,.42),(6.39,side*1.01,.66),mats["accent"],.015)
        box("Front indicator",(.09,.23,.04),(6.39,side*.57,.31),mats["accent"],.008)
    # Abstract identity mark; no reference logos, photographs or words are baked into textures.
    box("Front center marker",(.1,.16,.16),(6.40,-.42,.72),mats["accent"],.01)
    for i in range(7):
        box("Fascia vent",(.085,.12,.022),(6.39,-.23+i*.16,.67),mats["trim"],0)
    tire=wheel_data(mats["dark"])
    tire.data.name="shared-tire-mesh"
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=1,depth=1)
    alloy_template=bpy.context.object; alloy_template.data.materials.append(mats["panel"])
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=1,depth=1)
    hub_template=bpy.context.object; hub_template.data.materials.append(mats["accent"])
    wheel_data_blocks={tire.data,alloy_template.data,hub_template.data}
    for axle_index,axle in enumerate(analysis["wheelAxles"]):
        for side in (-1,1):
            r=axle["radius"]
            obj=bpy.data.objects.new(f"Tire {axle_index} {side}",tire.data)
            scene.collection.objects.link(obj); obj.location=(axle["x"],side*1.23,r); obj.scale=(r,r,r)
            rim=bpy.data.objects.new("Wheel alloy",alloy_template.data); scene.collection.objects.link(rim)
            rim.location=(axle["x"],side*(1.23+.225*r),r); rim.rotation_euler.x=math.pi/2; rim.scale=(r*.70,r*.70,.035)
            hub=bpy.data.objects.new("Wheel center",hub_template.data); scene.collection.objects.link(hub)
            hub.location=(axle["x"],side*(1.25+.225*r),r); hub.rotation_euler.x=math.pi/2; hub.scale=(r*.24,r*.24,.05)
    bpy.data.objects.remove(tire,do_unlink=True)
    bpy.data.objects.remove(alloy_template,do_unlink=True)
    bpy.data.objects.remove(hub_template,do_unlink=True)
    # Merge static body pieces by material, retaining the three shared wheel components.
    for mat in mats.values():
        objects=[o for o in scene.objects if o.type=="MESH" and o.data not in wheel_data_blocks and o.data.materials[0]==mat]
        if not objects: continue
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
        obj=bpy.context.object; obj.name="Body "+mat.name
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    for obj in list(scene.objects):
        if obj.type=="MESH": obj.parent=root
    meshes=[o for o in scene.objects if o.type=="MESH"]
    for data in {o.data for o in meshes}:
        # Modify each unique datablock once, preserving shared wheel geometry.
        bm=bmesh.new(); bm.from_mesh(data)
        bmesh.ops.triangulate(bm,faces=list(bm.faces)); bm.to_mesh(data); bm.free(); data.update()
        while data.uv_layers: data.uv_layers.remove(data.uv_layers[0])
    triangles=sum(len(o.data.polygons) for o in meshes)
    assert triangles<=analysis["budgets"]["triangles"],"Triangle budget exceeded"
    assert len({mat for obj in meshes for mat in obj.data.materials})==5,"Unexpected materials"
    for obj in meshes:
        assert all(math.isfinite(v) for vertex in obj.data.vertices for v in vertex.co)
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in meshes: obj.select_set(True)
    glb=out/"reference-truck.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_cameras=False,export_lights=False,export_animations=False,export_extras=True)
    assert glb.stat().st_size<=analysis["budgets"]["glbBytes"],"GLB budget exceeded"
    cam=camera("Fitted reference camera",analysis["camera"]["position"],analysis=analysis["camera"])
    # Verify projection conventions against Blender's actual camera, not only our NumPy equations.
    scene.camera=cam; scene.render.resolution_x=596; scene.render.resolution_y=335
    bpy.context.view_layer.update()
    projection_errors=[]
    for item in analysis["landmarks"]:
        coord=world_to_camera_view(scene,cam,Vector(item["world"]))
        actual=np.array([coord.x*596,(1-coord.y)*335])
        projection_errors.append(float(np.linalg.norm(actual-np.array(item["projected"]))))
    assert max(projection_errors)<.02,"NumPy and Blender projection disagree"
    for name,position,energy,size in [("Key",(9,-11,15),2300,9),("Fill",(-6,-3,8),1400,7),("Rim",(2,8,11),1900,7)]:
        data=bpy.data.lights.new(name,"AREA"); data.energy=energy; data.shape="DISK"; data.size=size
        obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj); obj.location=position
        obj.rotation_euler=(Vector((0,0,2))-obj.location).to_track_quat("-Z","Y").to_euler()
    render(scene,cam,artifacts/"reference-view.png")
    # Two independent views expose guessed hidden geometry and the long side profile.
    side_cam=camera("Side inspection",(-.9,-24,4.4),target=(-.9,0,2.2)); side_cam.data.ortho_scale=16.5
    render(scene,side_cam,artifacts/"side-view.png",1192,536)
    rear_cam=camera("Rear inspection",(-18,13,9),target=(-.8,0,2.0)); rear_cam.data.ortho_scale=17
    render(scene,rear_cam,artifacts/"rear-view.png",1192,670)
    scene.camera=cam
    scene.render.resolution_x=1192; scene.render.resolution_y=670
    bpy.ops.wm.save_as_mainfile(filepath=str(out/"reference-truck.blend"))
    # Independent GLB reimport in this background process, after all renders are written.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    imported=[o for o in bpy.context.scene.objects if o.type=="MESH"]
    actual_triangles=sum(len(o.data.polygons) for o in imported)
    assert actual_triangles==triangles,"GLB reimport triangle mismatch"
    corners=np.array([tuple(o.matrix_world@Vector(v)) for o in imported for v in o.bound_box])
    dimensions=corners.max(axis=0)-corners.min(axis=0)
    report={"schemaVersion":1,"generator":"reference-truck/1","referenceSha256":analysis["referenceSha256"],"generatorSha256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),"analysisSha256":hashlib.sha256(analysis_path.read_bytes()).hexdigest(),"blenderVersion":bpy.app.version_string,"triangles":triangles,"materials":5,"meshObjects":len(imported),"glbBytes":glb.stat().st_size,"glbSha256":hashlib.sha256(glb.read_bytes()).hexdigest(),"blenderDimensionsMetersXYZ":dimensions.tolist(),"sourceScale":"assumed, not measured","cameraProjectionMaxDifferencePixels":max(projection_errors),"reimport":"passed","referenceImageNotEmbedded":True,"sharedTireGeometry":True,"fit":analysis["fit"],"provenance":analysis["provenance"]}
    report["surfaceRefinement"]=analysis.get("surfaceRefinement")
    if report["surfaceRefinement"]: report["generator"]="reference-truck/2"
    (out/"manifest.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("NC_REFERENCE "+json.dumps(report))


if __name__=="__main__": main()
