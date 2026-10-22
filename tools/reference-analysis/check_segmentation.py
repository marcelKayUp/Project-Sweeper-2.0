"""SAM 2 object-mask checks. Offline checks need no model; model checks need the checkpoint.

The IoU threshold is a project proposal for replacing the hand-drawn outline,
not a published SAM benchmark. The manual truck outline is itself approximate.
"""
import argparse
import copy
import json
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

from analyze import ROOT, load, measure, sha
from check import CABINET_FACES, cabinet_fixture
import segment

FOLDER = ROOT/"artifacts/reference-analysis/segmentation"
TRUCK_SPEC = ROOT/"assets/specs/reference-analysis/truck-sam.json"
THRESHOLD = .95


def rejected(call):
    try: call()
    except ValueError: return True
    return False


def polygon_mask(polygon, size):
    mask = np.zeros((size[1], size[0]), np.uint8)
    cv2.fillPoly(mask, [np.rint(np.asarray(polygon)).astype(np.int32)], 1)
    return mask > 0


def cabinet_truth(size):
    image = Image.new("L", size, 0); draw = ImageDraw.Draw(image)
    for face in CABINET_FACES: draw.polygon(face, fill=255, outline=255, width=3)
    return np.asarray(image) > 0


def cabinet_spec(reference):
    return {"schemaVersion":1,"id":"cabinet-segmentation","reference":reference.relative_to(ROOT).as_posix(),
            "objectSegmentation":{"model":"sam2.1-hiera-tiny","origin":"controlled-fixture","box":[90,28,538,368],"points":[[300,210]],"pointLabels":[1]},
            "classification":{"category":"furniture","subtype":"cabinet","construction":"manufactured-planar","origin":"controlled-fixture"},
            "surfaceRequests":[{"id":"front","seed":[173,180],"shapeHypothesis":"planar"},{"id":"top","seed":[300,62],"shapeHypothesis":"planar"},{"id":"side","seed":[487,192],"shapeHypothesis":"planar"}]}


def write(path, data):
    path.write_text(json.dumps(data, indent=2)+"\n", encoding="utf-8")
    return path


def offline():
    reference = cabinet_fixture(FOLDER)
    image = Image.open(reference).convert("RGB")
    spec = cabinet_spec(reference)
    spec_path = write(FOLDER/"cabinet-segmentation.json", spec)
    base = spec["objectSegmentation"]
    variants = {
        "box-outside-image":dict(base, box=[90,28,640,368]),
        "inverted-box":dict(base, box=[538,28,90,368]),
        "nonfinite-point":dict(base, points=[[float("nan"),210]]),
        "label-count-mismatch":dict(base, pointLabels=[]),
        "invalid-label":dict(base, pointLabels=[2]),
        "too-many-points":dict(base, points=[[300,210]]*17, pointLabels=[1]*17),
        "unknown-prompt-key":dict(base, mask="object.png"),
        "missing-origin":{key: value for key, value in base.items() if key != "origin"},
        "no-positive-prompt":{"origin":"check","points":[[300,210]],"pointLabels":[0]},
    }
    failures = [name for name, prompt in variants.items() if rejected(lambda: segment.parse_prompt(prompt, image.size))]
    assert failures == list(variants), ("Accepted invalid prompt", set(variants)-set(failures))
    both = write(FOLDER/"rejected-region-and-segmentation.json", dict(spec, objectRegion=[[1,1],[50,1],[50,50]]))
    unknown = write(FOLDER/"rejected-unknown-model.json", dict(spec, objectSegmentation=dict(base, model="sam9")))
    cases = {
        "region-and-segmentation":lambda: segment.read_spec(both),
        "unknown-model":lambda: segment.segment(unknown, FOLDER/"rejected"),
        "missing-checkpoint":lambda: segment.segment(spec_path, FOLDER/"rejected", checkpoint=".venv-sam/models/missing.pt"),
        "pinned-hash-mismatch":lambda: segment.verified_checkpoint({"sha256":"0"*64}, reference),
    }
    square = np.zeros((120, 120), bool); square[20:80, 20:80] = True
    split = square.copy(); split[90:115, 90:115] = True
    none, nothing = np.zeros((0, 2)), np.zeros(0, np.int32)
    cases.update({
        "empty-mask":lambda: segment.object_region(np.zeros((120, 120), bool), none, nothing),
        "split-mask":lambda: segment.object_region(split, none, nothing),
        "positive-point-outside-mask":lambda: segment.object_region(square, np.array([[100., 100.]]), np.array([1])),
        "negative-point-inside-mask":lambda: segment.object_region(square, np.array([[50., 50.]]), np.array([0])),
        "mask-fills-image":lambda: segment.object_region(np.ones((120, 120), bool), none, nothing),
        "mask-leaks-outside-box":lambda: segment.object_region(square, none, nothing, np.array([20., 20., 40., 40.])),
    })
    for name, call in cases.items():
        assert rejected(call), "Accepted invalid case: "+name
        failures.append(name)
    speckled = square.copy(); speckled[100:103, 100:103] = True
    ring = square.copy(); ring[40:60, 40:60] = False
    _, _, speck = segment.object_region(speckled, none, nothing, np.array([20., 20., 79., 79.]))
    _, _, holes = segment.object_region(ring, np.array([[50., 50.]]), np.array([1]))
    assert speck["removedSpecklePixels"] == 9 and holes["holePixels"] == 400, (speck, holes)
    # analyze.py must stay usable from .venv-assets, which has no PyTorch.
    probe = subprocess.run([sys.executable, "-c", "import sys, analyze; sys.exit(1 if 'torch' in sys.modules else 0)"], cwd=ROOT/"tools/reference-analysis")
    assert probe.returncode == 0, "analyze.py imports torch"
    # A known mask (no model) exercises outline, derived spec and the unchanged analysis.
    truth = cabinet_truth(image.size)
    out = FOLDER/"cabinet-known-mask"
    prompt = segment.parse_prompt(base, image.size)
    report = segment.write_outputs(spec_path, spec, reference, image, truth, prompt, {"id":"controlled-fixture-mask"}, out)
    derived_path = ROOT/report["analysisSpec"]
    derived = load(derived_path)
    outline_iou = segment.iou(polygon_mask(derived["objectRegion"], image.size), truth)
    analysis = measure(derived_path, out/"analysis", True)
    analysis_report = load(out/"analysis/report.json")
    assert outline_iou >= .99 and analysis_report["specSha256"] == sha(derived_path.read_bytes()) and analysis["surfaces"] == 3, outline_iou
    assert derived["objectRegionProvenance"]["maskSha256"] == sha((out/"object-mask.png").read_bytes())
    return {"invalidCasesRejected":failures,"speckleAndHoleHandling":{"removedSpecklePixels":9,"holePixels":400},"analyzeWithoutTorch":True,
            "knownMaskOutlineIoU":round(outline_iou, 6),"knownMaskPolygonVertices":report["result"]["polygonVertices"],"derivedSpecAnalysed":True}


def model_checks(checkpoint, threads):
    recipe = load(ROOT/"assets/specs/vehicles/reference-truck.json")
    reference = ROOT/recipe["reference"]
    size = Image.open(reference).size
    out = FOLDER/"truck"
    first = segment.segment(TRUCK_SPEC, out, True, checkpoint, threads)
    first_report, first_spec = load(out/"object-mask.json"), load(out/"analysis-spec.json")
    manual = polygon_mask(recipe["silhouette"], size)
    outline = polygon_mask(first_spec["objectRegion"], size)
    raw = np.asarray(Image.open(out/"object-mask.png")) > 0
    truck_iou, raw_iou = segment.iou(outline, manual), segment.iou(raw, manual)
    shade = np.asarray(Image.open(reference).convert("RGB"), dtype=float)*.35
    shade[outline & manual] = [225, 230, 232]
    shade[outline & ~manual] = [60, 230, 220]
    shade[manual & ~outline] = [235, 80, 200]
    Image.fromarray(np.uint8(shade)).save(FOLDER/"truck-vs-manual.png")
    overlay = (out/"mask-overlay.png").read_bytes()
    segment.segment(TRUCK_SPEC, out, True, checkpoint, threads)
    second_report, second_spec = load(out/"object-mask.json"), load(out/"analysis-spec.json")
    deterministic = second_report["result"]["maskSha256"] == first_report["result"]["maskSha256"] and second_spec["objectRegion"] == first_spec["objectRegion"]
    cached = segment.segment(TRUCK_SPEC, out, False, checkpoint, threads)["cacheHit"]
    (out/"mask-overlay.png").write_bytes(b"broken")
    recovered = not segment.segment(TRUCK_SPEC, out, False, checkpoint, threads)["cacheHit"] and (out/"mask-overlay.png").read_bytes() == overlay
    sam_analysis = measure(out/"analysis-spec.json", out/"analysis", True)
    manual_analysis = measure(ROOT/"assets/specs/reference-analysis/truck.json", FOLDER/"truck-manual-analysis", True)
    reference_cabinet = cabinet_fixture(FOLDER)
    cabinet_path = write(FOLDER/"cabinet-segmentation.json", cabinet_spec(reference_cabinet))
    segment.segment(cabinet_path, FOLDER/"cabinet", True, checkpoint, threads)
    cabinet_size = Image.open(reference_cabinet).size
    cabinet_outline = polygon_mask(load(FOLDER/"cabinet/analysis-spec.json")["objectRegion"], cabinet_size)
    cabinet_iou = segment.iou(cabinet_outline, cabinet_truth(cabinet_size))
    result = {"truckOutlineIoUVsManual":round(truck_iou, 6),"truckRawMaskIoUVsManual":round(raw_iou, 6),"truckScore":first["score"],
              "truckPolygonVertices":first["polygonVertices"],"cabinetOutlineIoUVsTruth":round(cabinet_iou, 6),"deterministicRepeat":deterministic,
              "cacheHit":cached,"corruptedOutputRecovered":recovered,"checkpointSha256":first_report["model"]["checkpointSha256"],
              "checkpointPinned":first_report["model"]["checkpointPinned"],"timing":first_report["timing"],"versions":first_report["versions"],
              "truckAnalysis":{"sam":{k:sam_analysis[k] for k in ("surfaces","houghLines","corners","geometryVerticesChanged")},
                               "manual":{k:manual_analysis[k] for k in ("surfaces","houghLines","corners","geometryVerticesChanged")}}}
    assert truck_iou >= THRESHOLD and cabinet_iou >= THRESHOLD, ("IoU below threshold", truck_iou, cabinet_iou)
    assert deterministic and cached and recovered, ("Repeatability/cache failed", deterministic, cached, recovered)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--offline-only", action="store_true")
    parser.add_argument("--checkpoint")
    parser.add_argument("--threads", type=int, default=4, choices=range(1, 65), metavar="1..64")
    args = parser.parse_args()
    FOLDER.mkdir(parents=True, exist_ok=True)
    result = {"passed":False,"complete":not args.offline_only,"threshold":THRESHOLD,"offline":offline()}
    if args.offline_only:
        result["model"] = {"status":"not-run","reason":"--offline-only"}
    else:
        try:
            result["model"] = model_checks(args.checkpoint, args.threads)
        except (AssertionError, ValueError) as error:
            result["model"] = {"status":"failed","reason":str(error)}
            write(FOLDER/"checks.json", result)
            print(json.dumps(result, indent=2))
            raise SystemExit(1)
    result["passed"] = True
    result["scope"] = "Offline checks only; SAM was not run and no mask quality is shown." if args.offline_only else "One real photo against an approximate manual outline plus one controlled fixture."
    write(FOLDER/"checks.json", result)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
