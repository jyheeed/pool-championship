from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, List
import numpy as np


@dataclass
class BallDetection:
    ball: int
    confidence: float
    x: float
    y: float


class BallDetector(Protocol):
    def detect(self, frame: np.ndarray) -> List[BallDetection]:
        ...
