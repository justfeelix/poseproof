"""Convert MediaPipe output of a recorded video into the web app's trial format.

Use this for trials recorded as video (e.g. with two cameras for the 3D reference): run
`extract2d.run_pose_landmarker` on camera A, then export it here, and the very same
TypeScript checks can judge it with `npm run check-trials`.

    python -m poseproof_analysis.export_trial data/processed/s1/squat01_camA_mp.npz \
        --width 1920 --height 1080 --test squat_front --out data/trials/squat01.json

Input npz (see io.py): kp2d (T, 33, 3) pixels + visibility, kp3d (T, 33, 3) world in mm,
t_ms (T,). Rows that are all NaN (no person) become frames with no poses.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .io import load_keypoints

SCHEMA = "poseproof.trial/1"


def to_trial(kp2d: np.ndarray, kp3d: np.ndarray, t_ms: np.ndarray, width: int, height: int,
             test: str, trial_id: str, model: str = "mediapipe-python") -> dict:
    if kp2d.shape[1:] != (33, 3) or kp3d.shape != kp2d.shape:
        raise ValueError(f"expected (T, 33, 3) arrays, got {kp2d.shape} and {kp3d.shape}")
    t0 = float(t_ms[0]) if len(t_ms) else 0.0
    frames = []
    for i in range(len(kp2d)):
        t = round(float(t_ms[i]) - t0, 1)
        if np.isnan(kp2d[i]).all():
            frames.append({"t": t, "poses": []})
            continue
        vis = np.nan_to_num(kp2d[i, :, 2])
        image = [[round(x / width, 4), round(y / height, 4), 0.0, round(float(v), 3)]
                 for (x, y), v in zip(kp2d[i, :, :2].tolist(), vis)]
        world = [[round(x / 1000, 4), round(y / 1000, 4), round(z / 1000, 4), round(float(v), 3)]
                 for (x, y, z), v in zip(kp3d[i].tolist(), vis)]
        frames.append({"t": t, "poses": [{"image": image, "world": world}]})
    return {
        "schema": SCHEMA,
        "id": trial_id,
        "test": test,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "source": "video",
        "model": model,
        "image": {"width": width, "height": height},
        "mirrored": False,
        "frames": frames,
    }


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("npz", type=Path)
    ap.add_argument("--width", type=int, required=True)
    ap.add_argument("--height", type=int, required=True)
    ap.add_argument("--test", choices=["squat_front", "squat_side"], required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args(argv)

    data = load_keypoints(args.npz)
    trial = to_trial(data["kp2d"], data["kp3d"], data["t_ms"], args.width, args.height,
                     args.test, args.out.stem, data.get("source", "mediapipe-python"))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(trial))
    print(f"{len(trial['frames'])} frames -> {args.out}")


if __name__ == "__main__":
    main()
