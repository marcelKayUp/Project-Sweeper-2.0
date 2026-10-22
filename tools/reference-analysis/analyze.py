"""Reusable CPU image measurement. Semantic labels/reviews are explicit inputs.

No image-classification model or network is called. 2D region/line candidates do
not prove 3D planarity; only reviewed geometric boundaries can emit mesh patches.
"""
import argparse
import hashlib
import json
import math
import platform
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from PIL import __version__ as pillow_version
from semantics import selected_symmetries, mirror_allowed

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "assets/specs/reference-analysis/classes.json"
OUTPUTS = ("report.json", "geometry-patches.json", "overlay.png", "edges.png")


def local(value):
    result = (ROOT / value).resolve()
    if not result.is_relative_to(ROOT) or result == ROOT:
        raise ValueError("Path must remain in project")
    return result


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(path):
    if path.stat().st_size > 1_000_000:
        raise ValueError("Recipe too large")
    return json.loads(path.read_text(encoding="utf-8"))


def points(value, size, minimum=3):
    value = np.asarray(value, dtype=float)
    if value.ndim != 2 or value.shape[1] != 2 or not minimum <= len(value) <= 256 or not np.isfinite(value).all():
        raise ValueError("Invalid point array")
    if np.any(value < 0) or np.any(value[:, 0] >= size[0]) or np.any(value[:, 1] >= size[1]):
        raise ValueError("Point outside image")
    return value


def symmetry_plan(items, catalog):
    if not isinstance(items, list) or len(items) > 32:
        raise ValueError("Invalid symmetry list")
    result = []
    for item in items:
        if not isinstance(item,dict): raise ValueError("Symmetry must be an object")
        if item.get("status") not in catalog["symmetryStatuses"] or item.get("type") not in ("bilateral", "rotational", "repetition", "none"):
            raise ValueError("Invalid symmetry type/status")
        if not isinstance(item.get("scope"), str) or not item["scope"] or type(item.get("useForGeometry", False)) is not bool:
            raise ValueError("Invalid symmetry scope/use flag")
        if item["type"] == "bilateral" and item.get("plane") not in ("XY", "XZ", "YZ"):
            raise ValueError("Bilateral symmetry requires an object-space plane")
        if item["type"] == "rotational" and item.get("axis") not in ("X", "Y", "Z"):
            raise ValueError("Rotational symmetry requires an object-space axis")
        exceptions = item.get("exceptions", [])
        if not isinstance(exceptions, list) or not all(isinstance(x, str) for x in exceptions):
            raise ValueError("Invalid symmetry exceptions")
        if item["status"] == "supported" and (item.get("origin") == "class-prior" or not item.get("evidence")):
            raise ValueError("Class prior is not symmetry evidence")
        if item.get("useForGeometry") and item["status"] in ("assumed", "supported") and not item.get("reason"):
            raise ValueError("Active symmetry requires a reason")
        result.append(dict(item, activeForGeometry=bool(item.get("useForGeometry") and item["status"] in ("assumed", "supported") and item["type"] != "none")))
    return result


def simple_polygon(polygon):
    if abs(cv2.contourArea(np.asarray(polygon,dtype=np.float32))) < 4:
        return False
    def orient(a,b,c):
        u,v=b-a,c-a
        return u[0]*v[1]-u[1]*v[0]
    for i,a in enumerate(polygon):
        b=polygon[(i+1)%len(polygon)]
        if np.linalg.norm(a-b)<.1: return False
        for j in range(i+1,len(polygon)):
            if j==i+1 or (i==0 and j==len(polygon)-1): continue
            c,d=polygon[j],polygon[(j+1)%len(polygon)]
            if orient(a,b,c)*orient(a,b,d)<-1e-6 and orient(c,d,a)*orient(c,d,b)<-1e-6:
                return False
    return True


def refine_boundary(anchors, edges, kinds, accepted, band, geometry_kinds):
    yy, xx = np.nonzero(edges)
    samples = np.column_stack((xx, yy)).astype(float)
    fitted = []
    for index, a in enumerate(anchors):
        b = anchors[(index + 1) % len(anchors)]
        direction = b-a; length = np.linalg.norm(direction)
        if length < 3:
            fitted.append(None); continue
        unit = direction / length
        delta = samples-a
        along = delta@unit
        distance = np.abs(delta[:, 0]*unit[1]-delta[:, 1]*unit[0])
        chosen = samples[(along >= 1) & (along <= length-1) & (distance <= band)]
        if len(chosen) < max(8, length*.12):
            fitted.append(None); continue
        # Prefer the long continuous edge nearest the coarse guide, not a distant
        # high-contrast decoration. OpenCV's robust line fit rejects small outliers.
        offsets = (chosen-a)@np.array([-unit[1], unit[0]])
        bins = np.arange(-band-.5, band+1.5, 1)
        histogram, _ = np.histogram(offsets, bins=bins)
        scores = histogram / (1 + .12*np.abs((bins[:-1]+bins[1:])/2))
        peak = (bins[np.argmax(scores)]+bins[np.argmax(scores)+1])/2
        chosen = chosen[np.abs(offsets-peak) <= 1.8]
        if len(chosen) < 8:
            fitted.append(None); continue
        vx, vy, cx, cy = cv2.fitLine(chosen.astype(np.float32), cv2.DIST_HUBER, 0, .01, .01).ravel()
        axis = np.array([vx, vy], float); center = np.array([cx, cy], float)
        coverage = float(np.ptp((chosen-a)@unit)/length)
        alignment = abs(float(axis@unit))
        usable = coverage >= .45 and alignment >= math.cos(math.radians(10))
        fitted.append({"axis":axis,"center":center,"coverage":coverage,"kind":kinds[index],"accepted":bool(usable and accepted and kinds[index] in geometry_kinds)})
    refined = anchors.copy(); changed = []
    for index, original in enumerate(anchors):
        before, after = fitted[index-1], fitted[index]
        if not before or not after or not before["accepted"] or not after["accepted"]:
            continue
        matrix = np.column_stack((before["axis"], -after["axis"]))
        if abs(np.linalg.det(matrix)) < .10:
            continue
        t, _ = np.linalg.solve(matrix, after["center"]-before["center"])
        candidate = before["center"]+before["axis"]*t
        if np.linalg.norm(candidate-original) <= band*1.6:
            refined[index] = candidate
            if np.linalg.norm(candidate-original) > .15:
                changed.append(index)
    if not simple_polygon(refined):
        refined=anchors.copy(); changed=[]
    line_report = [None if line is None else {k:(v.tolist() if isinstance(v,np.ndarray) else v) for k,v in line.items()} for line in fitted]
    return refined, changed, line_report


def measure(spec_path, out, force=False):
    cv2.setNumThreads(1); cv2.setRNGSeed(0)
    spec = load(spec_path); catalog = load(CATALOG)
    if not isinstance(spec,dict): raise ValueError("Analysis spec must be an object")
    if spec.get("schemaVersion") != 1 or not isinstance(spec.get("id"),str) or not spec["id"]:
        raise ValueError("Unsupported analysis spec")
    source_path = local(spec["sourceRecipe"]) if "sourceRecipe" in spec else None
    source = load(source_path) if source_path else {}
    if not isinstance(source,dict): raise ValueError("Source recipe must be an object")
    reference = local(spec.get("reference", source.get("reference", "")))
    classification = spec.get("classification", {})
    if classification.get("category") not in catalog["categories"] or classification.get("construction") not in catalog["constructions"] or not classification.get("origin"):
        raise ValueError("Explicit classification/category/construction/origin required")
    symmetries = symmetry_plan(spec.get("symmetryHypotheses", []), catalog)
    requests = spec.get("surfaceRequests", [])
    if not isinstance(requests,list) or not 1 <= len(requests) <= 16 or len({x["id"] for x in requests}) != len(requests):
        raise ValueError("One to sixteen unique surface requests required")
    image = Image.open(reference).convert("RGB")
    if min(image.size) < 32 or max(image.size) > 2048:
        raise ValueError("Image dimensions must be 32..2048 pixels")
    outline = points(spec.get("objectRegion", source.get("silhouette")), image.size)
    if not simple_polygon(outline): raise ValueError("Invalid object polygon")
    mask = np.zeros((image.height,image.width), np.uint8)
    cv2.fillPoly(mask,[np.rint(outline).astype(np.int32)],255)
    if np.count_nonzero(mask) < 64: raise ValueError("Object region too small")
    versions = {"python":platform.python_version(),"opencv":cv2.__version__,"numpy":np.__version__,"pillow":pillow_version}
    semantics_bytes=Path(__file__).with_name("semantics.py").read_bytes()
    key = sha(spec_path.read_bytes()+reference.read_bytes()+Path(__file__).read_bytes()+semantics_bytes+CATALOG.read_bytes()+(source_path.read_bytes() if source_path else b"")+json.dumps(versions,sort_keys=True).encode())
    out.mkdir(parents=True,exist_ok=True)
    manifest_path = out/"cache.json"
    if not force and manifest_path.exists():
        try: cached = load(manifest_path)
        except (ValueError,OSError): cached = {}
        if cached.get("key") == key and set(cached.get("files",{})) == set(OUTPUTS) and all((out/name).is_file() and sha((out/name).read_bytes()) == digest for name,digest in cached["files"].items()):
            report = load(out/"report.json")
            return dict(report["summary"],cacheHit=True)
    rgb = np.asarray(image)
    gray = cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
    smooth = cv2.GaussianBlur(gray,(5,5),.9)
    edges = cv2.Canny(smooth,35,95)
    edges[mask == 0] = 0
    min_line = max(12,round(max(image.size)*.035))
    lines = cv2.HoughLinesP(edges,1,np.pi/360,18,minLineLength=min_line,maxLineGap=5)
    line_list = [] if lines is None else lines.reshape(-1,4).tolist()
    corners = cv2.goodFeaturesToTrack(smooth,maxCorners=100,qualityLevel=.02,minDistance=8,mask=mask)
    corner_list = [] if corners is None else corners.reshape(-1,2).tolist()
    markers = np.where(mask == 0,1,0).astype(np.int32)
    seeds = []
    for index, request in enumerate(requests):
        seed = points([request["seed"]],image.size,1)[0]
        x,y = np.clip(np.rint(seed),[0,0],[image.width-1,image.height-1]).astype(int)
        if mask[y,x] == 0 or any(np.linalg.norm(seed-other) < 8 for other in seeds):
            raise ValueError("Surface seeds must be distinct and inside object region")
        if request.get("shapeHypothesis") not in ("planar","curved","mixed","unknown"):
            raise ValueError("Invalid surface shape hypothesis")
        seeds.append(seed)
        cv2.circle(markers,(x,y),3,index+2,-1)
    # Watershed supplies 2D region candidates. It deliberately does not claim
    # that a region is a physical plane or that its boundary is a geometric crease.
    watershed_image = cv2.bilateralFilter(rgb,7,40,40)
    cv2.watershed(watershed_image,markers)
    overlay = rgb.astype(float); patches = {}; surfaces = []
    band = max(4,round(max(image.size)*.012))
    for index, request in enumerate(requests):
        region = ((markers == index+2) & (mask>0)).astype(np.uint8)
        contours,_ = cv2.findContours(region,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
        polygon = []
        if contours:
            contour = max(contours,key=cv2.contourArea)
            polygon = cv2.approxPolyDP(contour,.006*cv2.arcLength(contour,True),True).reshape(-1,2).tolist()
        color = np.array([(53+index*67)%180+50,(117+index*41)%180+50,(139+index*83)%180+50])
        overlay[region>0] = overlay[region>0]*.70+color*.30
        surface = {"id":request["id"],"shapeHypothesis":request["shapeHypothesis"],"planeStatus":"unverified","regionPixels":int(region.sum()),"regionPolygon":polygon,"regionOrigin":"seeded-watershed","seedOrigin":"agent-annotation","status":"candidate" if region.sum()>=20 else "insufficient-region"}
        boundary = request.get("boundary")
        if boundary:
            anchor_input = source.get("profiles",{}).get(boundary.get("sourceProfile")) if "sourceProfile" in boundary else boundary.get("points")
            anchors = points(anchor_input,image.size)
            if not simple_polygon(anchors): raise ValueError("Invalid boundary polygon")
            kinds = boundary.get("kinds",[boundary.get("kind","unknown")]*len(anchors))
            if len(kinds)!=len(anchors) or any(kind not in catalog["boundaryKinds"] for kind in kinds):
                raise ValueError("Invalid boundary kinds")
            eligible = boundary.get("review") == "accepted" and request["shapeHypothesis"] == "planar" and classification["construction"] != "organic"
            refined,changed,fitted = refine_boundary(anchors,edges,kinds,eligible,band,catalog["geometryBoundaryKinds"])
            refined[:,0] = np.clip(refined[:,0],0,image.width-1)
            refined[:,1] = np.clip(refined[:,1],0,image.height-1)
            surface["boundary"] = {"inputOrigin":"agent-coarse-polygon","kinds":kinds,"review":boundary.get("review","pending"),"fittedEdges":fitted,"refinedPoints":np.round(refined,4).tolist(),"changedVertices":changed,"maxShiftPixels":float(np.linalg.norm(refined-anchors,axis=1).max())}
            binding = request.get("binding")
            if binding:
                target = binding.get("targetProfile")
                if not isinstance(target,str) or not target or target in patches:
                    raise ValueError("Invalid/duplicate profile binding")
                scope=request.get("scope","main-body/"+target)
                patches[target] = {"surfaceId":request["id"],"originalPoints":anchors.tolist(),"points":np.round(refined,4).tolist(),"changedVertices":changed,"boundaryKinds":kinds,"review":boundary.get("review","pending"),"modelEligible":bool(eligible and changed),"symmetryScopes":[x["scope"] for x in selected_symmetries(symmetries,scope)],"mirrorOnXZ":mirror_allowed(symmetries,scope)}
        surfaces.append(surface)
    visual = Image.fromarray(np.uint8(np.clip(overlay,0,255)))
    draw = ImageDraw.Draw(visual)
    draw.line([tuple(x) for x in outline]+[tuple(outline[0])],fill="#eef7f8",width=1)
    for surface,seed in zip(surfaces,seeds):
        if "boundary" in surface:
            poly = surface["boundary"]["refinedPoints"]
            draw.line([tuple(x) for x in poly]+[tuple(poly[0])],fill="#50f0d0",width=2)
            for x,y in poly: draw.ellipse((x-2,y-2,x+2,y+2),fill="#ffe189")
        x,y=seed; draw.ellipse((x-3,y-3,x+3,y+3),fill="#ffdb79")
        draw.text((x+5,y),surface["id"],fill="#ffffff",stroke_width=1,stroke_fill="#17212a")
    visual.save(out/"overlay.png")
    Image.fromarray(edges).save(out/"edges.png")
    summary = {"id":spec["id"],"category":classification["category"],"surfaces":len(surfaces),"houghLines":len(line_list),"corners":len(corner_list),"geometryVerticesChanged":sum(len(x["changedVertices"]) for x in patches.values() if x["modelEligible"]),"llmCallsByScript":0}
    report = {"schemaVersion":1,"cacheKey":key,"specSha256":sha(spec_path.read_bytes()),"referenceSha256":sha(reference.read_bytes()),"sourceRecipeSha256":sha(source_path.read_bytes()) if source_path else None,"analyzerSha256":sha(Path(__file__).read_bytes()),"versions":versions,"classification":classification,"classPriors":catalog["categories"][classification["category"]],"symmetryPlan":symmetries,"surfaces":surfaces,"houghLines":line_list,"corners":corner_list,"summary":summary,"limitations":["Semantic class and shape hypotheses are agent inputs.","Image regions do not prove 3D planes.","Appearance, lighting, occlusion and unreviewed boundaries cannot drive geometry."]}
    patch_report = {"schemaVersion":1,"referenceSha256":report["referenceSha256"],"sourceRecipeSha256":report["sourceRecipeSha256"],"analyzerSha256":report["analyzerSha256"],"semanticsSha256":sha(semantics_bytes),"classification":classification,"analysisCacheKey":key,"symmetryPlan":symmetries,"profiles":patches}
    for name,data in (("report.json",report),("geometry-patches.json",patch_report)):
        (out/name).write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
    manifest_path.write_text(json.dumps({"key":key,"files":{name:sha((out/name).read_bytes()) for name in OUTPUTS}},indent=2)+"\n",encoding="utf-8")
    return dict(summary,cacheHit=False)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec",default="assets/specs/reference-analysis/truck.json")
    parser.add_argument("--out",default="artifacts/reference-analysis/truck")
    parser.add_argument("--force",action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(measure(local(args.spec),local(args.out),args.force)))
    except (ValueError,KeyError,TypeError,OSError) as error:
        parser.exit(1,"Reference analysis: "+str(error)+"\n")
