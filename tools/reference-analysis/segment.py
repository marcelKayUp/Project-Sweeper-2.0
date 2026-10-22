"""Optional SAM 2 object mask for the reference analysis (runs in .venv-sam).

The mask replaces only the hand-drawn object outline. It is a frozen, hashed
input: it does not classify surfaces, approve boundaries or create geometry.
The output is an ordinary analysis spec, so analyze.py never imports torch.
"""
import argparse
import hashlib
import json
import platform
import time
from importlib.metadata import PackageNotFoundError, version as package_version
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from PIL import __version__ as pillow_version
from analyze import ROOT, load, local, points, sha, simple_polygon

MODELS = ROOT / "tools/reference-analysis/sam-models.json"
MODEL_DIR = ROOT / ".venv-sam/models"
OUTPUTS = ("object-mask.png", "object-mask.json", "analysis-spec.json", "mask-overlay.png")
PROMPT_KEYS = {"model", "box", "points", "pointLabels", "origin"}


def file_sha(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def model_entry(name):
    models = load(MODELS)["models"]
    if not isinstance(name, str) or name not in models:
        raise ValueError("Unknown segmentation model")
    return models[name]


def verified_checkpoint(entry, path):
    if not path.is_file():
        raise ValueError("SAM checkpoint missing: run corepack pnpm setup:reference-segmentation")
    digest = file_sha(path)
    if entry.get("sha256") and digest != entry["sha256"]:
        raise ValueError("SAM checkpoint hash does not match sam-models.json")
    return digest


def parse_prompt(block, size):
    if not isinstance(block, dict) or set(block) - PROMPT_KEYS:
        raise ValueError("Invalid objectSegmentation block")
    if not isinstance(block.get("origin"), str) or not block["origin"]:
        raise ValueError("Segmentation prompt needs an origin")
    box = None
    if "box" in block:
        box = np.asarray(block["box"], dtype=float)
        if box.shape != (4,) or not np.isfinite(box).all():
            raise ValueError("Box must be four finite numbers")
        if box[0] < 0 or box[1] < 0 or box[2] >= size[0] or box[3] >= size[1]:
            raise ValueError("Box outside image")
        if box[2]-box[0] < 8 or box[3]-box[1] < 8:
            raise ValueError("Box must be at least 8 pixels wide and high")
    raw, labels = block.get("points", []), block.get("pointLabels", [])
    if not isinstance(raw, list) or not isinstance(labels, list) or len(raw) != len(labels) or len(raw) > 16:
        raise ValueError("points and pointLabels must be equal lists of at most 16 entries")
    if any(type(label) is not int or label not in (0, 1) for label in labels):
        raise ValueError("Point labels must be 0 or 1")
    prompt_points = points(raw, size, 1) if raw else np.zeros((0, 2))
    if box is None and 1 not in labels:
        raise ValueError("Prompt needs a box or a positive point")
    return box, prompt_points, np.asarray(labels, dtype=np.int32)


def iou(a, b):
    union = np.count_nonzero(a | b)
    return float(np.count_nonzero(a & b) / union) if union else 0.0


def object_region(mask, prompt_points, labels, box=None):
    """Keeps one connected object, rejects contradictions and fits a simple polygon."""
    mask = np.asarray(mask, dtype=bool)
    if np.count_nonzero(mask) >= .9*mask.size:
        raise ValueError("Object mask covers almost the whole image")
    _, components, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    areas = stats[1:, cv2.CC_STAT_AREA]
    if not len(areas) or areas.max() < 64:
        raise ValueError("Object mask is empty")
    significant = int(np.count_nonzero(areas >= max(64, .01*areas.max())))
    if significant > 1:
        raise ValueError(f"Object mask splits into {significant} parts")
    kept = components == 1+int(np.argmax(areas))
    if box is not None:
        margin = max(4, .02*max(box[2]-box[0], box[3]-box[1]))
        x0, y0 = np.floor(box[:2]-margin).astype(int).clip(0)
        x1, y1 = np.ceil(box[2:]+margin).astype(int)+1
        if np.count_nonzero(kept)-np.count_nonzero(kept[y0:y1, x0:x1]) > .01*np.count_nonzero(kept):
            raise ValueError("Object mask leaks outside the prompt box")
    contours, _ = cv2.findContours(kept.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    contour = max(contours, key=cv2.contourArea)
    filled = np.zeros(mask.shape, np.uint8)
    cv2.drawContours(filled, [contour], -1, 1, -1)
    pixels = np.clip(np.rint(prompt_points), 0, [mask.shape[1]-1, mask.shape[0]-1]).astype(int)
    for (x, y), label in zip(pixels, labels):
        if bool(filled[y, x]) != bool(label):
            raise ValueError("Object mask contradicts a prompt point")
    for epsilon in (.75, 1, 1.5, 2, 3, 4, 6, 8):
        polygon = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)
        if 3 <= len(polygon) <= 256 and simple_polygon(polygon.astype(float)):
            drawn = np.zeros(mask.shape, np.uint8)
            cv2.fillPoly(drawn, [polygon.astype(np.int32)], 1)
            return kept, polygon, {"maskPixels":int(kept.sum()),"removedSpecklePixels":int(mask.sum()-kept.sum()),"holePixels":int(filled.sum()-kept.sum()),
                                   "polygonVertices":len(polygon),"polygonEpsilonPixels":epsilon,"polygonIoU":round(iou(drawn > 0, filled > 0), 6)}
    raise ValueError("Object mask has no simple outline with at most 256 vertices")


def reference_of(spec):
    source = load(local(spec["sourceRecipe"])) if "sourceRecipe" in spec else {}
    if not isinstance(source, dict):
        raise ValueError("Source recipe must be an object")
    return local(spec.get("reference", source.get("reference", "")))


def read_spec(spec_path):
    spec = load(spec_path)
    if not isinstance(spec, dict) or spec.get("schemaVersion") != 1 or not isinstance(spec.get("id"), str) or not spec["id"]:
        raise ValueError("Unsupported segmentation spec")
    if "objectSegmentation" not in spec:
        raise ValueError("Spec has no objectSegmentation block")
    if "objectRegion" in spec:
        raise ValueError("objectRegion and objectSegmentation are mutually exclusive")
    reference = reference_of(spec)
    image = Image.open(reference).convert("RGB")
    if min(image.size) < 32 or max(image.size) > 2048:
        raise ValueError("Image dimensions must be 32..2048 pixels")
    return spec, reference, image


def write_outputs(spec_path, spec, reference, image, mask, prompt, model, out, extra=None):
    """Writes mask, overlay and the derived analysis spec. `model` names the mask source."""
    box, prompt_points, labels = prompt
    kept, polygon, measured = object_region(mask, prompt_points, labels, box)
    out.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.uint8(kept)*255).save(out/"object-mask.png")
    mask_sha = sha((out/"object-mask.png").read_bytes())
    tint = np.asarray(image, dtype=float)
    tint[kept] = tint[kept]*.6+np.array([80, 240, 208])*.4
    visual = Image.fromarray(np.uint8(np.clip(tint, 0, 255)))
    draw = ImageDraw.Draw(visual)
    draw.line([tuple(x) for x in polygon.tolist()]+[tuple(polygon[0].tolist())], fill="#eef7f8", width=1)
    if box is not None:
        draw.rectangle(tuple(box.tolist()), outline="#ffdb79", width=1)
    for (x, y), label in zip(prompt_points.tolist(), labels.tolist()):
        draw.ellipse((x-3, y-3, x+3, y+3), fill="#7dff8a" if label else "#ff6b6b", outline="#17212a")
    visual.save(out/"mask-overlay.png")
    relative = lambda path: path.relative_to(ROOT).as_posix()
    derived = {key: value for key, value in spec.items() if key != "objectSegmentation"}
    derived["objectRegion"] = polygon.tolist()
    derived["objectRegionProvenance"] = {"origin":"segmentation-mask","model":model["id"],"checkpointSha256":model.get("checkpointSha256"),
                                         "segmentationSpec":relative(spec_path),"segmentationSpecSha256":sha(spec_path.read_bytes()),
                                         "mask":relative(out/"object-mask.png"),"maskSha256":mask_sha,"promptOrigin":spec["objectSegmentation"]["origin"]}
    (out/"analysis-spec.json").write_text(json.dumps(derived, indent=2)+"\n", encoding="utf-8")
    report = {"schemaVersion":1,"id":spec["id"],"segmentationSpec":relative(spec_path),"segmentationSpecSha256":sha(spec_path.read_bytes()),
              "reference":relative(reference),"referenceSha256":sha(reference.read_bytes()),"prompt":spec["objectSegmentation"],"model":model,
              "result":dict(measured,maskSha256=mask_sha),"analysisSpec":relative(out/"analysis-spec.json"),
              "limitations":["The mask only replaces the hand-drawn object outline.","Mask edges are image regions, not reviewed geometric boundaries.","Surface seeds, classes and symmetry stay agent inputs."]}
    report.update(extra or {})
    (out/"object-mask.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    return report


def predict(image, prompt, entry, checkpoint, threads):
    import torch
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    box, prompt_points, labels = prompt
    torch.set_num_threads(threads)
    torch.manual_seed(0)
    torch.use_deterministic_algorithms(True, warn_only=True)
    started = time.perf_counter()
    predictor = SAM2ImagePredictor(build_sam2(entry["config"], str(checkpoint), device="cpu"))
    loaded = time.perf_counter()
    # A single click is ambiguous; SAM then proposes three masks and the best score wins.
    multimask = box is None and len(prompt_points) == 1
    with torch.inference_mode():
        predictor.set_image(np.asarray(image))
        masks, scores, _ = predictor.predict(point_coords=prompt_points.astype(np.float32) if len(prompt_points) else None,
                                             point_labels=labels if len(prompt_points) else None, box=box, multimask_output=multimask)
    finished = time.perf_counter()
    best = int(np.argmax(scores))
    details = {"multimaskOutput":multimask,"candidateScores":[round(float(x), 6) for x in scores],"score":round(float(scores[best]), 6)}
    timing = {"threads":threads,"modelLoadSeconds":round(loaded-started, 3),"inferenceSeconds":round(finished-loaded, 3)}
    return masks[best] > .5, details, timing


def segment(spec_path, out, force=False, checkpoint=None, threads=4):
    spec, reference, image = read_spec(spec_path)
    prompt = parse_prompt(spec["objectSegmentation"], image.size)
    name = spec["objectSegmentation"].get("model", "sam2.1-hiera-tiny")
    entry = model_entry(name)
    checkpoint = local(checkpoint) if checkpoint else MODEL_DIR/entry["file"]
    digest = verified_checkpoint(entry, checkpoint)
    try:
        versions = {"python":platform.python_version(),"numpy":np.__version__,"opencv":cv2.__version__,"pillow":pillow_version,"torch":package_version("torch"),"sam2":package_version("sam2")}
    except PackageNotFoundError as error:
        raise ValueError("Run corepack pnpm setup:reference-segmentation first") from error
    key = sha(spec_path.read_bytes()+reference.read_bytes()+Path(__file__).read_bytes()+(ROOT/"tools/reference-analysis/analyze.py").read_bytes()
              +MODELS.read_bytes()+digest.encode()+json.dumps([versions, threads], sort_keys=True).encode())
    manifest_path = out/"segment-cache.json"
    if not force and manifest_path.exists():
        try: cached = load(manifest_path)
        except (ValueError, OSError): cached = {}
        if cached.get("key") == key and set(cached.get("files", {})) == set(OUTPUTS) and all((out/name).is_file() and sha((out/name).read_bytes()) == value for name, value in cached["files"].items()):
            return dict(summary(load(out/"object-mask.json")), cacheHit=True)
    mask, details, timing = predict(image, prompt, entry, checkpoint, threads)
    model = {"id":name,"config":entry["config"],"checkpoint":checkpoint.name,"checkpointSha256":digest,"checkpointPinned":bool(entry.get("sha256")),
             "license":entry["license"],"source":entry["source"],"prediction":details}
    report = write_outputs(spec_path, spec, reference, image, mask, prompt, model, out, {"versions":versions,"timing":timing,"cacheKey":key})
    manifest_path.write_text(json.dumps({"key":key,"files":{name: sha((out/name).read_bytes()) for name in OUTPUTS}}, indent=2)+"\n", encoding="utf-8")
    return dict(summary(report), cacheHit=False)


def summary(report):
    result = report["result"]
    return {"id":report["id"],"model":report["model"]["id"],"score":report["model"]["prediction"]["score"],"maskPixels":result["maskPixels"],
            "polygonVertices":result["polygonVertices"],"polygonIoU":result["polygonIoU"],"analysisSpec":report["analysisSpec"],**report.get("timing", {})}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--checkpoint")
    parser.add_argument("--threads", type=int, default=4, choices=range(1, 65), metavar="1..64")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(segment(local(args.spec), local(args.out), args.force, args.checkpoint, args.threads)))
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, "Reference segmentation: "+str(error)+"\n")
