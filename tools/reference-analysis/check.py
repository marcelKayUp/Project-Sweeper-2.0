"""Behavior checks with a controlled second object, not a real-photo benchmark."""
import copy
import importlib.util
import json
import sys
import contextlib
import io
import os
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from analyze import CATALOG, ROOT, load, measure, sha, symmetry_plan
from semantics import mirror_allowed


def main():
    folder=ROOT/"artifacts/reference-analysis/checks"
    folder.mkdir(parents=True,exist_ok=True)
    reference=folder/"cabinet-reference.png"
    image=Image.new("RGB",(640,400),"#263440"); draw=ImageDraw.Draw(image)
    truth=[[100,70],[435,100],[432,360],[102,330]]
    draw.polygon([(100,70),(205,35),(530,65),(435,100)],fill="#ccd3d7",outline="#17212a",width=3)
    draw.polygon([(435,100),(530,65),(525,322),(432,360)],fill="#7e8b95",outline="#17212a",width=3)
    draw.polygon([tuple(x) for x in truth],fill="#aeb9c2",outline="#17212a",width=3)
    # High-contrast paint and shadow features lie on the same geometric front face.
    draw.polygon([(220,83),(272,87),(269,344),(218,340)],fill="#287cba")
    draw.polygon([(108,231),(429,259),(429,283),(108,255)],fill="#6b7780")
    draw.rectangle((400,202,415,243),fill="#17212a") # one asymmetric handle
    image.save(reference)
    coarse=[[106,76],[428,107],[425,353],[108,324]]
    spec={"schemaVersion":1,"id":"cabinet-fixture","reference":str(reference.relative_to(ROOT)),
          "objectRegion":[[98,69],[204,33],[532,64],[528,324],[434,363],[100,333]],
          "classification":{"category":"furniture","subtype":"cabinet","construction":"manufactured-planar","origin":"controlled-fixture"},
          "symmetryHypotheses":[{"scope":"main-body","type":"bilateral","plane":"XZ","status":"assumed","origin":"fixture-definition","reason":"Symmetric shell with one excluded handle","useForGeometry":True,"exceptions":["handle"]}],
          "surfaceRequests":[
              {"id":"front","seed":[173,180],"shapeHypothesis":"planar","boundary":{"points":coarse,"kind":"crease","review":"accepted"},"binding":{"targetProfile":"front"}},
              {"id":"top","seed":[300,62],"shapeHypothesis":"planar"},
              {"id":"side","seed":[487,192],"shapeHypothesis":"planar"},
              {"id":"paint","seed":[245,170],"shapeHypothesis":"planar","boundary":{"points":[[225,89],[266,93],[264,335],[225,331]],"kind":"appearance","review":"accepted"},"binding":{"targetProfile":"paint-detail"}},
              {"id":"shadow","seed":[170,246],"shapeHypothesis":"planar","boundary":{"points":[[114,235],[421,263],[421,276],[114,250]],"kind":"lighting","review":"accepted"},"binding":{"targetProfile":"shadow-detail"}}
          ]}
    spec_path=folder/"cabinet.json"
    spec_path.write_text(json.dumps(spec,indent=2)+"\n",encoding="utf-8")
    program_hash=sha((ROOT/"tools/reference-analysis/analyze.py").read_bytes())
    measured=measure(spec_path,folder/"cabinet",True)
    patches=load(folder/"cabinet/geometry-patches.json")["profiles"]
    refined=np.array(patches["front"]["points"])
    before=float(np.mean(np.linalg.norm(np.array(coarse)-np.array(truth),axis=1)))
    after=float(np.mean(np.linalg.norm(refined-np.array(truth),axis=1)))
    assert patches["front"]["modelEligible"] and after<before*.65,(before,after)
    assert not patches["paint-detail"]["modelEligible"] and not patches["paint-detail"]["changedVertices"]
    assert not patches["shadow-detail"]["modelEligible"] and not patches["shadow-detail"]["changedVertices"]
    report=load(folder/"cabinet/report.json")
    assert report["classification"]["category"]=="furniture"
    assert report["symmetryPlan"][0]["exceptions"]==["handle"]
    assert mirror_allowed(report["symmetryPlan"],"main-body/shell")
    assert not mirror_allowed(report["symmetryPlan"],"main-body/handle")
    assert all(surface["planeStatus"]=="unverified" for surface in report["surfaces"])
    cached=measure(spec_path,folder/"cabinet")
    assert cached["cacheHit"]
    expected=(folder/"cabinet/overlay.png").read_bytes()
    (folder/"cabinet/overlay.png").write_bytes(b"broken")
    assert not measure(spec_path,folder/"cabinet")["cacheHit"]
    assert (folder/"cabinet/overlay.png").read_bytes()==expected
    (folder/"cabinet/cache.json").write_text("broken",encoding="utf-8")
    assert not measure(spec_path,folder/"cabinet")["cacheHit"]
    truck=measure(ROOT/"assets/specs/reference-analysis/truck.json",ROOT/"artifacts/reference-analysis/truck")
    assert truck["category"]=="vehicle" and truck["geometryVerticesChanged"]>0
    assert sha((ROOT/"tools/reference-analysis/analyze.py").read_bytes())==program_hash

    failures=[]
    invalid=[]
    bad=copy.deepcopy(spec); bad["classification"]["category"]="unsupported"; invalid.append(("unknown-class",bad))
    bad=copy.deepcopy(spec); bad["surfaceRequests"][0]["seed"]=[float("nan"),1]; invalid.append(("nonfinite-point",bad))
    bad=copy.deepcopy(spec); bad["reference"]="../outside.png"; invalid.append(("outside-project",bad))
    bad=copy.deepcopy(spec); bad["surfaceRequests"][0]["boundary"]["kind"]="unsupported"; invalid.append(("unknown-boundary-kind",bad))
    bad=copy.deepcopy(spec); bad["symmetryHypotheses"][0].update(status="supported",origin="class-prior",evidence="class guess"); invalid.append(("class-prior-is-not-proof",bad))
    bad=copy.deepcopy(spec); bad["surfaceRequests"][0]["boundary"]["points"]=[[100,70],[432,360],[435,100],[102,330]]; invalid.append(("crossed-polygon",bad))
    for name,bad in invalid:
        path=folder/(name+".json"); path.write_text(json.dumps(bad),encoding="utf-8")
        try: measure(path,folder/("rejected-"+name),True)
        except ValueError: failures.append(name)
        else: raise AssertionError("Accepted invalid recipe: "+name)
    candidate=copy.deepcopy(spec["symmetryHypotheses"])
    candidate[0]["status"]="candidate"
    assert not symmetry_plan(candidate,load(CATALOG))[0]["activeForGeometry"]
    unreviewed=copy.deepcopy(spec)
    unreviewed["surfaceRequests"][0]["boundary"]["review"]="pending"
    path=folder/"unreviewed.json"; path.write_text(json.dumps(unreviewed),encoding="utf-8")
    measure(path,folder/"unreviewed",True)
    assert not load(folder/"unreviewed/geometry-patches.json")["profiles"]["front"]["modelEligible"]

    # Verify actual downstream 3D profile changes with the same truck input.
    module_spec=importlib.util.spec_from_file_location("vehicle_analysis",ROOT/"tools/vehicles/analyze_reference.py")
    vehicle=importlib.util.module_from_spec(module_spec); module_spec.loader.exec_module(vehicle)
    recipe_path=ROOT/"assets/specs/vehicles/reference-truck.json"
    recipe=load(recipe_path); original=copy.deepcopy(recipe["profiles"]["sideInset"])
    trace=vehicle.apply_refinement(recipe,recipe_path,ROOT/"artifacts/reference-analysis/truck/geometry-patches.json",(596,335))
    initial=recipe["cameraInitial"]
    world=np.array([x["world"] for x in recipe["landmarks"]])
    observed=np.array([x["pixel"] for x in recipe["landmarks"]])
    camera=vehicle.fit(world,observed,initial["position"]+[initial["azimuthDeg"],initial["elevationDeg"],initial["focalPixels"]],np.array([298,167.5]))
    old_3d=vehicle.unproject_to_side(original,camera,np.array([298,167.5]),[-w for w in recipe["profileHalfWidths"]["sideInset"]])
    new_3d=vehicle.unproject_to_side(recipe["profiles"]["sideInset"],camera,np.array([298,167.5]),[-w for w in recipe["profileHalfWidths"]["sideInset"]])
    assert not np.allclose(old_3d,new_3d)
    malicious=load(ROOT/"artifacts/reference-analysis/truck/geometry-patches.json")
    malicious["profiles"]["sideInset"]["boundaryKinds"]=["lighting"]*len(original)
    path=folder/"unsafe-model-binding.json"; path.write_text(json.dumps(malicious),encoding="utf-8")
    try: vehicle.apply_refinement(load(recipe_path),recipe_path,path,(596,335))
    except ValueError: failures.append("lighting-cannot-drive-mesh")
    else: raise AssertionError("Unsafe model binding accepted")
    asym=load(ROOT/"assets/specs/reference-analysis/truck.json")
    asym["id"]="truck-asymmetric-panel"
    asym["symmetryHypotheses"][0]["exceptions"].append("sideInset")
    asym_path=folder/"asymmetric-panel.json"; asym_path.write_text(json.dumps(asym),encoding="utf-8")
    measure(asym_path,folder/"asymmetric-panel",True)
    model_reports={}
    blender=os.environ.get("BLENDER_PATH","C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")
    for name,patch_path in [("normal",ROOT/"artifacts/reference-analysis/truck/geometry-patches.json"),("asymmetric",folder/"asymmetric-panel/geometry-patches.json")]:
        target=folder/(name+"-model"); target.mkdir(exist_ok=True)
        with contextlib.redirect_stdout(io.StringIO()): vehicle.analyze(recipe_path,target,patch_path)
        relative=str(target.relative_to(ROOT))
        with (target/"build.log").open("w",encoding="utf-8") as log:
            completed=subprocess.run([blender,"--background","--factory-startup","--disable-autoexec","--threads","4","--python-exit-code","1","--python",str(ROOT/"tools/vehicles/build_reference_vehicle.py"),"--","--analysis",relative+"/analysis.json","--out",relative,"--artifacts",relative,"--no-render"],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,timeout=120)
        assert completed.returncode==0,"Blender check failed: "+name
        model_reports[name]=load(target/"manifest.json")
    assert model_reports["normal"]["surfaceRefinement"]["profileMirroring"]["sideInset"]
    assert not model_reports["asymmetric"]["surfaceRefinement"]["profileMirroring"]["sideInset"]
    assert model_reports["asymmetric"]["triangles"] < model_reports["normal"]["triangles"]
    assert model_reports["normal"]["glbSha256"] != model_reports["asymmetric"]["glbSha256"]
    result={"passed":True,"sameAnalyzerSha256":program_hash,"references":["user-truck-photo","controlled-cabinet-fixture"],"cabinetMeanCornerErrorPixels":{"before":before,"after":after},"appearanceAndShadowDoNotAlterGeometry":True,"cacheAndCorruptionRecovery":True,"invalidCasesRejected":failures,"truck3DProfileChanged":True,"truckAppliedProfiles":trace["appliedProfiles"],"asymmetricModelTriangles":{name:item["triangles"] for name,item in model_reports.items()},"asymmetricExceptionChangesActualGlb":True,"scriptLlmCalls":0,"scope":"Controlled second reference; not a general real-photo reconstruction benchmark."}
    (folder/"checks.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf-8")
    print(json.dumps(result,indent=2))


if __name__=="__main__": main()
