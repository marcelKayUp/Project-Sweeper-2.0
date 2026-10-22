"""Small, explicit single-image fitting experiment. Requires NumPy and Pillow.

Annotations are supplied data, not automatically detected semantic geometry.
The fitted camera is conditional on the annotated world-space assumptions.
"""
import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]


def local(value):
    result = (ROOT / value).resolve()
    if not result.is_relative_to(ROOT) or result == ROOT:
        raise ValueError("Path must remain in this project")
    return result


def basis(p):
    yaw, pitch = np.radians(p[3:5])
    right = np.array([math.sin(yaw), math.cos(yaw), 0])
    forward = np.array([-math.cos(yaw)*math.cos(pitch), math.sin(yaw)*math.cos(pitch), -math.sin(pitch)])
    up = np.cross(right, forward)
    return right, up, forward


def project(points, p, center):
    right, up, forward = basis(p)
    delta = np.asarray(points) - p[:3]
    depth = delta @ forward
    if np.any(depth <= .1):
        raise ValueError("Camera intersects annotated geometry")
    return np.column_stack([center[0] + p[5]*(delta@right)/depth, center[1] - p[5]*(delta@up)/depth])


def fit(world, pixels, initial, center):
    p = np.array(initial, dtype=float)
    damping = .01
    steps = [1e-4,1e-4,1e-4,1e-3,1e-3,1e-2]
    lower = np.array([8,-35,1,8,1,220])
    upper = np.array([45,-2,15,65,35,1800])
    for _ in range(250):
        residual = (project(world,p,center)-pixels).ravel()
        jacobian = np.empty((len(residual),6))
        for i, step in enumerate(steps):
            other = p.copy(); other[i] += step
            jacobian[:,i] = ((project(world,other,center)-pixels).ravel()-residual)/step
        a = jacobian.T@jacobian
        change = np.linalg.solve(a + damping*np.diag(np.maximum(np.diag(a),1e-6)), -jacobian.T@residual)
        candidate = np.clip(p+change,lower,upper)
        if np.sum((project(world,candidate,center)-pixels)**2) < np.sum(residual**2):
            p = candidate; damping = max(damping/2,1e-8)
            if np.linalg.norm(change) < 1e-7: break
        else:
            damping = min(damping*4,1e12)
    return p


def unproject_to_side(pixels, p, center, y):
    right, up, forward = basis(p)
    points = []
    for index,(u,v) in enumerate(pixels):
        ray = forward + right*((u-center[0])/p[5]) - up*((v-center[1])/p[5])
        side_y = y[index] if isinstance(y,list) else y
        distance = (side_y-p[1])/ray[1]
        if distance <= 0: raise ValueError("Side-plane intersection behind camera")
        point = p[:3]+ray*distance
        points.append([round(float(point[0]),6), round(float(point[2]),6)])
    return points


def font(size):
    for path in (Path("C:/Windows/Fonts/segoeui.ttf"),Path("C:/Windows/Fonts/arial.ttf")):
        if path.exists(): return ImageFont.truetype(str(path),size)
    return ImageFont.load_default()


def apply_refinement(spec,spec_path,refinement_path,size):
    report=json.loads(refinement_path.read_text(encoding="utf-8"))
    digest=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    if report.get("schemaVersion")!=1 or report.get("sourceRecipeSha256")!=digest(spec_path) or report.get("referenceSha256")!=digest(local(spec["reference"])):
        raise ValueError("Stale surface report: recipe/reference hash mismatch")
    if report.get("analyzerSha256")!=digest(ROOT/"tools/reference-analysis/analyze.py"):
        raise ValueError("Stale surface report: analyzer changed")
    semantics_path=ROOT/"tools/reference-analysis/semantics.py"
    if report.get("semanticsSha256")!=digest(semantics_path): raise ValueError("Stale symmetry policy")
    module_spec=importlib.util.spec_from_file_location("reference_symmetry",semantics_path)
    policy=importlib.util.module_from_spec(module_spec); module_spec.loader.exec_module(policy)
    if report.get("classification",{}).get("category")!="vehicle": raise ValueError("Truck template requires vehicle classification")
    plan=report.get("symmetryPlan",[])
    body=[item for item in plan if item.get("scope")=="main-body" and item.get("activeForGeometry") and item.get("type")=="bilateral" and item.get("plane")=="XZ" and item.get("status") in ("assumed","supported")]
    if len(body)!=1:
        raise ValueError("Truck template requires an explicitly active bilateral main-body assumption")
    mirror_flags={name:policy.mirror_allowed(plan,"main-body/"+name) for name in spec["profiles"]}
    if not mirror_flags["cargo"]: raise ValueError("Truck template cannot build an asymmetric cargo shell")
    wheel_plan=[item for item in plan if item.get("scope")=="wheels" and item.get("type")=="repetition" and item.get("useForGeometry") is True and item.get("activeForGeometry") and item.get("status") in ("assumed","supported")]
    if len(wheel_plan)!=1 or wheel_plan[0].get("exceptions"):
        raise ValueError("Truck template requires an explicit repeated-wheel plan without missing-wheel exceptions")
    applied={}
    for name,patch in report.get("profiles",{}).items():
        if patch.get("modelEligible") is not True: continue
        if name not in spec["profiles"] or patch.get("review")!="accepted":
            raise ValueError("Unknown/unreviewed geometry binding")
        original=np.array(spec["profiles"][name],dtype=float)
        anchors=np.array(patch["originalPoints"],dtype=float)
        refined=np.array(patch["points"],dtype=float)
        if anchors.shape!=original.shape or refined.shape!=original.shape or not np.allclose(original,anchors,atol=1e-5) or not np.isfinite(refined).all():
            raise ValueError("Invalid geometry patch points")
        movement=np.linalg.norm(refined-original,axis=1)
        if movement.max()>max(4,round(max(size)*.012))*1.6+.01 or np.any(refined<0) or np.any(refined[:,0]>=size[0]) or np.any(refined[:,1]>=size[1]):
            raise ValueError("Geometry patch exceeds bounded refinement")
        kinds=patch["boundaryKinds"]
        if len(kinds)!=len(original): raise ValueError("Invalid boundary-kind count")
        for index in np.nonzero(movement>1e-5)[0]:
            if kinds[index] not in ("silhouette","crease") or kinds[index-1] not in ("silhouette","crease"):
                raise ValueError("Appearance/lighting/unknown boundary cannot alter geometry")
        spec["profiles"][name]=refined.tolist()
        applied[name]={"movedVertices":int(np.count_nonzero(movement>.15)),"maxShiftPixels":float(movement.max())}
    return {"reportSha256":digest(refinement_path),"analysisCacheKey":report["analysisCacheKey"],"symmetryPlan":plan,"profileMirroring":mirror_flags,"appliedProfiles":applied}


def analyze(spec_path, out, refinement_path=None):
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    if spec.get("schemaVersion") != 1 or spec.get("id") != "reference-truck":
        raise ValueError("Unsupported pilot recipe")
    source = local(spec["reference"])
    image = Image.open(source).convert("RGB")
    width,height = image.size
    if (width,height) != (596,335): raise ValueError("Annotations target the supplied 596x335 image")
    refinement=apply_refinement(spec,spec_path,refinement_path,image.size) if refinement_path else None
    out.mkdir(parents=True,exist_ok=True)
    center = np.array([width/2,height/2])
    world = np.array([x["world"] for x in spec["landmarks"]],dtype=float)
    observed = np.array([x["pixel"] for x in spec["landmarks"]],dtype=float)
    if world.ndim!=2 or world.shape[1]!=3 or observed.shape!=(len(world),2) or len(world)<6:
        raise ValueError("At least six matching world/image points required")
    if not np.isfinite(world).all() or not np.isfinite(observed).all():
        raise ValueError("Landmarks must be finite")
    for name,points in spec["profiles"].items():
        points=np.asarray(points,dtype=float)
        halfwidths=np.asarray(spec["profileHalfWidths"][name],dtype=float)
        if points.ndim!=2 or points.shape[1]!=2 or len(points)<3 or halfwidths.shape!=(len(points),):
            raise ValueError("Profile/width annotation mismatch: "+name)
        if not np.isfinite(points).all() or not np.isfinite(halfwidths).all() or np.any(halfwidths<=0) or np.any(halfwidths>2):
            raise ValueError("Invalid profile values: "+name)
    c = spec["cameraInitial"]
    initial = c["position"]+[c["azimuthDeg"],c["elevationDeg"],c["focalPixels"]]
    p = fit(world,observed,initial,center)
    predicted = project(world,p,center)
    errors = np.linalg.norm(predicted-observed,axis=1)

    # Brightness gradients after light smoothing; these also include reflections/shadows.
    gray = np.asarray(image.convert("L").filter(ImageFilter.GaussianBlur(1)),dtype=float)/255
    gy,gx = np.gradient(gray)
    gradient = np.hypot(gx,gy)
    mask_image = Image.new("L",image.size)
    ImageDraw.Draw(mask_image).polygon([tuple(x) for x in spec["silhouette"]],fill=255)
    mask = np.asarray(mask_image)>0
    threshold = float(np.quantile(gradient[mask],.86))
    edges = (gradient >= threshold) & mask
    Image.fromarray((edges*255).astype(np.uint8)).save(out/"edges.png")
    mask_image.save(out/"annotated-mask.png")
    overlay = image.copy()
    draw = ImageDraw.Draw(overlay)
    draw.line([tuple(x) for x in spec["silhouette"]]+[tuple(spec["silhouette"][0])],fill="#57e5dd",width=2)
    ys,xs = np.nonzero(edges)
    fitted_lines = []
    for guide in spec["guideSegments"]:
        a,b = np.array(guide["points"],dtype=float)
        direction = b-a; length = np.linalg.norm(direction); unit = direction/length
        delta = np.column_stack([xs,ys])-a
        along = delta@unit
        across = np.abs(delta[:,0]*unit[1]-delta[:,1]*unit[0])
        selected = (along>=0)&(along<=length)&(across<=4)
        points = np.column_stack([xs[selected],ys[selected]])
        if len(points)>=5:
            weights = gradient[ys[selected],xs[selected]]
            mean = np.average(points,axis=0,weights=weights)
            relative = points-mean
            _,vectors = np.linalg.eigh((relative*weights[:,None]).T@relative)
            axis = vectors[:,-1]
            if axis@unit<0: axis = -axis
            lo,hi = np.quantile(relative@axis,[.03,.97])
            endpoints = [mean+axis*lo,mean+axis*hi]
            draw.line([tuple(x) for x in endpoints],fill="#ffce62",width=2)
            fitted_lines.append({"id":guide["id"],"edgeSamples":len(points),"endpoints":[x.tolist() for x in endpoints],"status":"Image line fitted inside an annotated search band; not a verified 3D edge"})
    for index,(actual,estimate) in enumerate(zip(observed,predicted)):
        x,y=actual; u,v=estimate
        draw.line([tuple(actual),tuple(estimate)],fill="#ff6577",width=1)
        draw.ellipse((x-3,y-3,x+3,y+3),outline="#ffe29d",width=1)
        draw.ellipse((u-2,v-2,u+2,v+2),fill="#4af0ee")
        draw.text((x+4,y-9),str(index+1),font=font(10),fill="#ffe29d",stroke_width=1,stroke_fill="#15202a")
    overlay.resize((1192,670)).save(out/"guides.png")
    result = {
        "schemaVersion":1,"id":spec["id"],"referenceSha256":hashlib.sha256(source.read_bytes()).hexdigest(),
        "referenceSize":[width,height],"assumptions":spec["assumptions"],"provenance":spec["provenance"],
        "camera":{"position":p[:3].tolist(),"azimuthDeg":float(p[3]),"elevationDeg":float(p[4]),"focalPixels":float(p[5]),"horizontalFovDeg":math.degrees(2*math.atan(width/(2*p[5]))),"principalPoint":center.tolist(),"rollDeg":0},
        "fit":{"landmarks":len(world),"rmsPixels":float(np.sqrt(np.mean(errors**2))),"maxPixels":float(max(errors)),"initialRmsPixels":float(np.sqrt(np.mean(np.sum((project(world,initial,center)-observed)**2,axis=1)))),"atFocalSearchBoundary":bool(p[5]>=1799.99 or p[5]<=220.01),"warning":"Focal length is weakly constrained; this is one compatible modeling camera, not recovered lens metadata.","status":"Fit to manually annotated landmarks with assumed world coordinates; not camera ground truth"},
        "landmarks":[dict(item,projected=estimate.tolist(),errorPixels=float(error)) for item,estimate,error in zip(spec["landmarks"],predicted,errors)],
        "edges":{"method":"Smoothed luminance gradient, threshold inside manually annotated silhouette","threshold":threshold,"edgePixels":int(edges.sum()),"silhouetteStatus":"Manually annotated, not an automatic segmentation result"},
        "fittedLines":fitted_lines,
        "sidePlaneY":-1.28,
        "profilesXZ":{name:unproject_to_side(points,p,center,[-w for w in spec["profileHalfWidths"][name]]) for name,points in spec["profiles"].items()},
        "profileHalfWidths":spec["profileHalfWidths"],
        "palette":spec["palette"],"wheelAxles":spec["wheelAxles"],"budgets":spec["budgets"],
        "surfaceRefinement":refinement
    }
    (out/"analysis.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"camera":result["camera"],"fit":result["fit"],"profiles":result["profilesXZ"],"fittedLines":len(fitted_lines)},indent=2))


def compose(out, source):
    reference = Image.open(source).convert("RGB").resize((894,503))
    rendered = Image.open(out/"reference-view.png").convert("RGBA").resize((894,503))
    backdrop = Image.new("RGBA",rendered.size,"#24313d")
    backdrop.alpha_composite(rendered)
    board = Image.new("RGB",(1824,583),"#101922")
    board.paste(reference,(12,55)); board.paste(backdrop.convert("RGB"),(918,55))
    draw = ImageDraw.Draw(board)
    draw.text((16,13),"REFERENZBILD",font=font(23),fill="#f0f5f8")
    draw.text((922,13),"PARAMETRISCHER LOW-POLY-ENTWURF",font=font(23),fill="#7fe2df")
    draw.text((16,560),"Kamera und Proportionen angenaehert; verdeckte Geometrie ergaenzt. Keine automatische Vollrekonstruktion.",font=font(14),fill="#9cb1bf")
    board.save(out/"comparison.png")
    # Actual rendered silhouette comparison. Ignore ground/shadows by using transparent alpha.
    raw = Image.open(out/"reference-view.png").convert("RGBA").resize((596,335))
    predicted = np.asarray(raw)[:,:,3] > 127
    actual = np.asarray(Image.open(out/"annotated-mask.png"))>0
    union = np.logical_or(predicted,actual).sum()
    score = float(np.logical_and(predicted,actual).sum()/union) if union else 0
    overlay = np.zeros((335,596,4),dtype=np.uint8)
    overlay[actual & ~predicted]=[255,191,72,140]
    overlay[predicted & ~actual]=[235,87,121,140]
    overlay[actual & predicted]=[69,220,205,80]
    base = Image.open(source).convert("RGBA")
    base.alpha_composite(Image.fromarray(overlay))
    base.resize((1192,670)).save(out/"silhouette-overlay.png")
    (out/"silhouette-check.json").write_text(json.dumps({"iou":score,"referenceMask":"manual annotation","modelMask":"actual Blender render alpha","status":"Diagnostic score against a single annotated view; no 3D accuracy claim"},indent=2)+"\n")
    print(json.dumps({"silhouetteIoU":score,"comparison":str(out/"comparison.png")}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec",default="assets/specs/vehicles/reference-truck.json")
    parser.add_argument("--out",default="artifacts/reference-truck")
    parser.add_argument("--compose",action="store_true")
    parser.add_argument("--refinement")
    args=parser.parse_args()
    spec_path=local(args.spec); out=local(args.out)
    if args.compose:
        spec=json.loads(spec_path.read_text(encoding="utf-8")); compose(out,local(spec["reference"]))
    else: analyze(spec_path,out,local(args.refinement) if args.refinement else None)
