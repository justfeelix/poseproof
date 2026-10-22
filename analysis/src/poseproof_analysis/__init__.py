"""PoseProof offline analysis.

evaluate      precision / recall of the checks against hand labels (labels.csv + verdicts.csv)
export_trial  convert MediaPipe output of a video into the web app's trial JSON format
calibration, extract2d, sync, triangulate   two-camera 3D reference (optional, see GUIDE.md)
"""

__version__ = "0.1.0"
