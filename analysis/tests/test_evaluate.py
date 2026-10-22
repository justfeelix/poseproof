import io

import pandas as pd
import pytest

from poseproof_analysis.evaluate import evaluate, load_labels, report, wilson

LABELS = """trial_id,person,split,valid,reasons,note
a,felix,test,1,,good
b,felix,test,0,HEEL_LIFT,heels up
c,felix,test,0,HEEL_LIFT;TOO_FAST,both
d,friend,test,1,,good but flagged
"""

VERDICTS = """trial_id,test,check_id,reason,status,value,threshold,unit,detail
a,squat_front,heels,HEEL_LIFT,pass,0.01,0.025,m,
a,squat_front,tempo,TOO_FAST,todo,,,,
b,squat_front,heels,HEEL_LIFT,fail,0.05,0.025,m,
b,squat_front,tempo,TOO_FAST,todo,,,,
c,squat_front,heels,HEEL_LIFT,pass,0.02,0.025,m,
c,squat_front,tempo,TOO_FAST,todo,,,,
d,squat_front,heels,HEEL_LIFT,fail,0.03,0.025,m,
d,squat_front,tempo,TOO_FAST,todo,,,,
"""


def run():
    labels = load_labels(io.StringIO(LABELS))
    verdicts = pd.read_csv(io.StringIO(VERDICTS), dtype={"trial_id": str})
    return evaluate(labels, verdicts)


def test_trial_level_counts():
    t = run()["trial"]
    assert (t.tp, t.fn, t.fp, t.tn) == (1, 1, 1, 1)


def test_per_reason_counts_and_unimplemented_checks():
    r = run()
    heel = r["per_reason"]["HEEL_LIFT"]
    assert (heel.tp, heel.fp, heel.fn) == (1, 1, 1)
    assert heel.precision == 0.5 and heel.recall == 0.5
    assert "TOO_FAST" not in r["implemented"]
    assert "TOO_FAST | 1 | not implemented" in report(r, "x")


def test_disagreements_are_listed():
    text = report(run(), "x")
    assert "| c | HEEL_LIFT, TOO_FAST | none |" in text
    assert "| d | valid | HEEL_LIFT |" in text


def test_wilson_interval():
    lo, hi = wilson(0, 10)
    assert lo == 0 and 0.25 < hi < 0.35  # zero hits out of 10 still allows ~30%
    lo, hi = wilson(5, 10)
    assert lo < 0.5 < hi


def test_labels_are_validated():
    with pytest.raises(ValueError, match="unknown reason"):
        load_labels(io.StringIO("trial_id,person,split,valid,reasons,note\nx,f,test,0,HEELS,\n"))
    with pytest.raises(ValueError, match="labelled valid"):
        load_labels(io.StringIO("trial_id,person,split,valid,reasons,note\nx,f,test,1,HEEL_LIFT,\n"))
