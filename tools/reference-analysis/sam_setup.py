"""Downloads or imports a SAM 2 checkpoint into .venv-sam/models and verifies its hash."""
import argparse
import json
import shutil
import urllib.error
import urllib.request
from pathlib import Path

from analyze import ROOT
from segment import MODEL_DIR, file_sha, model_entry


def install(name, source=None):
    entry = model_entry(name)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    target = MODEL_DIR/entry["file"]
    pinned = entry.get("sha256")
    if target.is_file() and not source:
        digest = file_sha(target)
        if not pinned or digest == pinned:
            return {"model":name,"checkpoint":target.relative_to(ROOT).as_posix(),"sha256":digest,"pinned":bool(pinned),"action":"kept"}
    partial = target.with_name(target.name+".part")
    if source:
        source = Path(source).expanduser().resolve()
        if not source.is_file() or source.stat().st_size > 2_000_000_000:
            raise ValueError("Checkpoint file missing or larger than 2 GB")
        shutil.copyfile(source, partial)
    else:
        try:
            with urllib.request.urlopen(entry["url"], timeout=60) as response, partial.open("wb") as handle:
                shutil.copyfileobj(response, handle, 1 << 20)
        except (urllib.error.URLError, TimeoutError) as error:
            partial.unlink(missing_ok=True)
            raise ValueError(f"Download failed ({error}); download {entry['url']} manually and pass --from-file") from error
    digest = file_sha(partial)
    if pinned and digest != pinned:
        partial.unlink()
        raise ValueError("Checkpoint hash does not match sam-models.json")
    partial.replace(target)
    return {"model":name,"checkpoint":target.relative_to(ROOT).as_posix(),"sha256":digest,"pinned":bool(pinned),"action":"imported" if source else "downloaded"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", default="sam2.1-hiera-tiny")
    parser.add_argument("--from-file")
    args = parser.parse_args()
    try:
        result = install(args.model, args.from_file)
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, "SAM setup: "+str(error)+"\n")
    print(json.dumps(result))
    if not result["pinned"]:
        print("Note: sha256 is not pinned in tools/reference-analysis/sam-models.json yet; record the value above once the source is confirmed.")
