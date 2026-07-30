"""Edge-side pose analytics: joint angles, ROM, rep counting, quality scoring.

These functions mirror what runs on the Raspberry Pi (MediaPipe Pose + OpenCV).
The backend stubs them for API completeness and offline simulation.
"""
import math
from typing import Dict, List


JOINT_PAIRS = {
    "right_elbow": ("right_shoulder", "right_elbow", "right_wrist"),
    "left_elbow": ("left_shoulder", "left_elbow", "left_wrist"),
    "right_knee": ("right_hip", "right_knee", "right_ankle"),
    "left_knee": ("left_hip", "left_knee", "left_ankle"),
    "right_shoulder": ("right_elbow", "right_shoulder", "right_hip"),
    "left_shoulder": ("left_elbow", "left_shoulder", "left_hip"),
    "right_hip": ("right_knee", "right_hip", "right_shoulder"),
    "left_hip": ("left_knee", "left_hip", "left_shoulder"),
}


def angle_3d(a, b, c) -> float:
    """Angle at joint b formed by segments a-b and b-c (in degrees)."""
    ba = [a[i] - b[i] for i in range(3)]
    bc = [c[i] - b[i] for i in range(3)]
    dot = sum(ba[i] * bc[i] for i in range(3))
    mag_ba = math.sqrt(sum(x * x for x in ba))
    mag_bc = math.sqrt(sum(x * x for x in bc))
    if mag_ba == 0 or mag_bc == 0:
        return 0.0
    cos = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return math.degrees(math.acos(cos))


def compute_joint_angles(landmarks: Dict[str, List[float]]) -> Dict[str, float]:
    """landmarks: {joint_name: [x, y, z]} from MediaPipe Holistic/Pose."""
    out = {}
    for name, (p1, p2, p3) in JOINT_PAIRS.items():
        if p1 in landmarks and p2 in landmarks and p3 in landmarks:
            out[name] = round(angle_3d(landmarks[p1], landmarks[p2], landmarks[p3]), 1)
    return out


def range_of_motion(joint_angles: Dict[str, float], joint: str = "right_knee") -> float:
    return joint_angles.get(joint, 0.0)


def count_reps(
    joint_angles: Dict[str, float],
    joint: str,
    threshold_up: float,
    threshold_down: float,
) -> int:
    """Simple hysteresis-based rep counter on a target joint angle."""
    reps = 0
    state = "down"
    # In production this is stateful per-session; here we accept a precomputed stream.
    return reps


def movement_quality_score(
    rom_achieved: float, rom_target: float, compensated: bool, wrong_form: bool
) -> float:
    if rom_target <= 0:
        base = 100.0
    else:
        base = max(0.0, 100.0 * (rom_achieved / rom_target))
    if compensated:
        base -= 20
    if wrong_form:
        base -= 30
    return round(max(0.0, min(100.0, base)), 1)


def detect_compensation(joint_angles: Dict[str, float]) -> bool:
    """Heuristic: large asymmetric left/right deviation suggests compensation."""
    asymmetries = []
    for side in ["elbow", "knee", "hip", "shoulder"]:
        l, r = joint_angles.get(f"left_{side}"), joint_angles.get(f"right_{side}")
        if l is not None and r is not None:
            asymmetries.append(abs(l - r))
    return bool(asymmetries) and max(asymmetries) > 25
