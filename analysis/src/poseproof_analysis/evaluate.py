"""How well do the checks catch invalid trials?

Inputs
    labels.csv    one row per trial, filled in by hand (template: data/labels.template.csv)
                  trial_id, person, split, valid (1/0), reasons ("HEEL_LIFT;TOO_FAST"), note
    verdicts.csv  one row per trial and check, written by `npm run check-trials` (web/)

Output
    A Markdown report: trial-level confusion matrix, false-alarm rate on valid trials, and
    precision / recall per reason code with 95% Wilson intervals (the samples are small,
    so the intervals matter more than the point values).

Usage
    python -m poseproof_analysis.evaluate --labels ../data/labels.csv \
        --verdicts ../data/verdicts.csv --split test --out ../results/eval_test.md

Tune thresholds on split "tune" only; report numbers from split "test".
"""

from __future__ import annotations

import argparse
import math
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

REASONS = [
    "OUT_OF_FRAME",
    "MULTI_PERSON",
    "WRONG_ORIENTATION",
    "JOINT_HIDDEN",
    "TRACKING_UNSTABLE",
    "NO_CALM_START",
    "DEPTH_NOT_REACHED",
    "HEEL_LIFT",
    "TOO_FAST",
]


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    """95% Wilson score interval for k successes out of n (works for small n and k = 0 or n)."""
    if n == 0:
        return (math.nan, math.nan)
    p = k / n
    denom = 1 + z**2 / n
    centre = (p + z**2 / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return (max(0.0, centre - half), min(1.0, centre + half))


@dataclass
class Counts:
    tp: int = 0
    fp: int = 0
    fn: int = 0
    tn: int = 0

    @property
    def precision(self) -> float:
        return self.tp / (self.tp + self.fp) if self.tp + self.fp else math.nan

    @property
    def recall(self) -> float:
        return self.tp / (self.tp + self.fn) if self.tp + self.fn else math.nan


def load_labels(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={"trial_id": str, "reasons": str, "split": str})
    df["reasons"] = df["reasons"].fillna("").map(lambda s: {r.strip() for r in s.split(";") if r.strip()})
    unknown = set().union(*df["reasons"]) - set(REASONS) if len(df) else set()
    if unknown:
        raise ValueError(f"unknown reason codes in labels: {sorted(unknown)}")
    df["valid"] = df["valid"].astype(int)
    bad = df[(df["valid"] == 1) & (df["reasons"].map(len) > 0)]
    if len(bad):
        raise ValueError(f"trials labelled valid but with reasons: {bad['trial_id'].tolist()}")
    return df


def load_verdicts(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, dtype={"trial_id": str, "status": str, "reason": str})


def evaluate(labels: pd.DataFrame, verdicts: pd.DataFrame) -> dict:
    """Join labels with verdicts and count hits per reason and per trial."""
    missing = sorted(set(labels["trial_id"]) - set(verdicts["trial_id"]))
    labels = labels[~labels["trial_id"].isin(missing)]

    failed = verdicts[verdicts["status"] == "fail"].groupby("trial_id")["reason"].apply(set).to_dict()
    implemented = set(verdicts.loc[verdicts["status"] != "todo", "reason"])

    per_reason = {r: Counts() for r in REASONS}
    trial = Counts()  # positive = invalid
    rows = []
    for _, lab in labels.iterrows():
        predicted = failed.get(lab["trial_id"], set())
        truth_invalid = lab["valid"] == 0
        pred_invalid = len(predicted) > 0
        if truth_invalid and pred_invalid:
            trial.tp += 1
        elif not truth_invalid and pred_invalid:
            trial.fp += 1
        elif truth_invalid and not pred_invalid:
            trial.fn += 1
        else:
            trial.tn += 1
        for r in REASONS:
            t, p = r in lab["reasons"], r in predicted
            c = per_reason[r]
            c.tp += t and p
            c.fp += (not t) and p
            c.fn += t and (not p)
            c.tn += (not t) and (not p)
        rows.append({"trial_id": lab["trial_id"], "labelled": sorted(lab["reasons"]), "flagged": sorted(predicted)})

    return {"trial": trial, "per_reason": per_reason, "implemented": implemented, "missing": missing, "rows": rows}


def fmt_rate(k: int, n: int) -> str:
    if n == 0:
        return "n/a"
    lo, hi = wilson(k, n)
    return f"{k}/{n} = {k / n:.2f} [{lo:.2f}, {hi:.2f}]"


def report(result: dict, title: str) -> str:
    t: Counts = result["trial"]
    n_valid, n_invalid = t.tn + t.fp, t.tp + t.fn
    out = [f"# {title}", ""]
    if result["missing"]:
        out += [f"Warning: {len(result['missing'])} labelled trials have no verdicts: {', '.join(result['missing'])}", ""]
    out += [
        "## Trial level (positive = invalid trial)",
        "",
        "| | flagged invalid | passed |",
        "|---|---|---|",
        f"| labelled invalid | {t.tp} | {t.fn} |",
        f"| labelled valid | {t.fp} | {t.tn} |",
        "",
        f"- Invalid trials caught (recall): {fmt_rate(t.tp, n_invalid)}",
        f"- False alarms on valid trials: {fmt_rate(t.fp, n_valid)}",
        f"- Flags that were right (precision): {fmt_rate(t.tp, t.tp + t.fp)}",
        "",
        "## Per reason (95% Wilson intervals)",
        "",
        "| reason | labelled | precision | recall |",
        "|---|---|---|---|",
    ]
    for r, c in result["per_reason"].items():
        if r not in result["implemented"]:
            out.append(f"| {r} | {c.tp + c.fn} | not implemented | not implemented |")
            continue
        out.append(f"| {r} | {c.tp + c.fn} | {fmt_rate(c.tp, c.tp + c.fp)} | {fmt_rate(c.tp, c.tp + c.fn)} |")
    out += ["", "## Disagreements", "", "| trial | labelled | flagged |", "|---|---|---|"]
    for row in result["rows"]:
        if set(row["labelled"]) != set(row["flagged"]):
            out.append(f"| {row['trial_id']} | {', '.join(row['labelled']) or 'valid'} | {', '.join(row['flagged']) or 'none'} |")
    return "\n".join(out) + "\n"


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--labels", type=Path, default=Path("../data/labels.csv"))
    ap.add_argument("--verdicts", type=Path, default=Path("../data/verdicts.csv"))
    ap.add_argument("--split", default=None, help="only evaluate trials with this split (e.g. test)")
    ap.add_argument("--out", type=Path, default=None, help="write the Markdown report here")
    args = ap.parse_args(argv)

    labels = load_labels(args.labels)
    if args.split:
        labels = labels[labels["split"] == args.split]
    result = evaluate(labels, load_verdicts(args.verdicts))
    text = report(result, f"PoseProof evaluation ({args.split or 'all trials'}, n = {len(labels)})")
    print(text)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text)


if __name__ == "__main__":
    main()
