from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List
import random
import numpy as np

from app.detectors.interfaces import BallDetection


BALL_LAYOUTS: Dict[str, List[int]] = {
    "8-ball": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    "9-ball": [1, 2, 3, 4, 5, 6, 7, 8, 9],
    "10-ball": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
}


@dataclass
class MockBallDetector:
    discipline: str

    def __post_init__(self) -> None:
        self.present_balls = BALL_LAYOUTS.get(self.discipline, BALL_LAYOUTS["8-ball"]).copy()

    def remove_ball(self, ball: int) -> None:
        if ball in self.present_balls:
            self.present_balls.remove(ball)

    def detect(self, frame: np.ndarray) -> List[BallDetection]:
        del frame
        detections: List[BallDetection] = []
        for index, ball in enumerate(self.present_balls):
            confidence = max(0.65, min(0.99, random.gauss(0.91, 0.04)))
            detections.append(
                BallDetection(
                    ball=ball,
                    confidence=float(confidence),
                    x=float((index % 5) / 5.0),
                    y=float((index // 5) / 3.0),
                )
            )
        return detections
