from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
import numpy as np

try:
    import cv2  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - editor/runtime env mismatch
    cv2 = None  # type: ignore[assignment]


@dataclass
class MotionDetector:
    motion_threshold: float

    def __post_init__(self) -> None:
        self.prev_gray: Optional[np.ndarray] = None
        if cv2 is None:
            raise RuntimeError('OpenCV (cv2) is not installed. Install vision_service requirements.')

    def score(self, frame: np.ndarray) -> float:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        if self.prev_gray is None:
            self.prev_gray = gray
            return 0.0

        diff = cv2.absdiff(self.prev_gray, gray)
        self.prev_gray = gray
        return float(np.mean(diff))

    def is_motion(self, score: float) -> bool:
        return score >= self.motion_threshold
