from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, List
import time


@dataclass
class StableComparisonResult:
    event_type: str
    payload: Dict[str, object]
    confirmed_missing: List[int] = field(default_factory=list)


@dataclass
class StableStateComparator:
    expected_balls: List[int]
    missing_confirm_frames: int
    missing_confidence_threshold: float
    review_lower_confidence_threshold: float

    def __post_init__(self) -> None:
        self._expected = sorted(set(self.expected_balls))
        self._previous_stable_present = self._expected.copy()

    @property
    def previous_stable_present(self) -> List[int]:
        return self._previous_stable_present.copy()

    def _build_payload(self, stable_frame_maps: List[Dict[int, float]]) -> Dict[str, object]:
        counts: Dict[int, int] = {}
        confidence_sums: Dict[int, float] = {}

        for frame_map in stable_frame_maps:
            for ball, confidence in frame_map.items():
                if ball not in self._expected:
                    continue
                counts[ball] = counts.get(ball, 0) + 1
                confidence_sums[ball] = confidence_sums.get(ball, 0.0) + confidence

        total_frames = max(1, len(stable_frame_maps))
        present_balls: List[int] = []
        missing_balls: List[int] = []
        confidence_by_ball: Dict[str, float] = {}
        absent_frames_by_ball: Dict[int, int] = {}

        for ball in self._expected:
            seen = counts.get(ball, 0)
            present_ratio = seen / total_frames
            avg_detection_confidence = confidence_sums.get(ball, 0.0) / max(1, seen)
            presence_confidence = (0.65 * present_ratio) + (0.35 * avg_detection_confidence)
            presence_confidence = max(0.0, min(1.0, float(presence_confidence)))
            confidence_by_ball[str(ball)] = round(presence_confidence, 4)

            if present_ratio >= 0.5:
                present_balls.append(ball)
            else:
                missing_balls.append(ball)

            absent_frames_by_ball[ball] = total_frames - seen

        values = list(confidence_by_ball.values()) or [0.0]
        payload = {
            "presentBalls": sorted(present_balls),
            "missingBalls": sorted(missing_balls),
            "confidenceByBall": confidence_by_ball,
            "confidenceSummary": {
                "min": float(min(values)),
                "max": float(max(values)),
                "average": float(sum(values) / len(values)),
            },
            "stableFrames": int(total_frames),
            "snapshotId": f"stable-{int(time.time() * 1000)}",
        }

        payload["absentFramesByBall"] = absent_frames_by_ball
        return payload

    def evaluate(self, stable_frame_maps: List[Dict[int, float]]) -> StableComparisonResult:
        payload = self._build_payload(stable_frame_maps)
        present_balls = set(payload["presentBalls"])
        missing_candidates = [ball for ball in self._previous_stable_present if ball not in present_balls]

        confirmed_missing: List[int] = []
        uncertain_missing: List[int] = []

        absent_frames_by_ball: Dict[int, int] = payload.get("absentFramesByBall", {})  # type: ignore[assignment]
        confidence_by_ball: Dict[str, float] = payload["confidenceByBall"]  # type: ignore[assignment]

        for ball in missing_candidates:
            presence_confidence = confidence_by_ball.get(str(ball), 0.0)
            absence_confidence = 1.0 - presence_confidence
            absent_frames = absent_frames_by_ball.get(ball, 0)

            if absent_frames >= self.missing_confirm_frames and absence_confidence >= self.missing_confidence_threshold:
                confirmed_missing.append(ball)
                continue

            if absent_frames >= self.missing_confirm_frames and absence_confidence >= self.review_lower_confidence_threshold:
                uncertain_missing.append(ball)

        if confirmed_missing:
            # Once confirmed, update reference stable state.
            self._previous_stable_present = payload["presentBalls"]  # type: ignore[assignment]
            return StableComparisonResult(
                event_type="ball_missing_confirmed",
                payload={
                    "presentBalls": payload["presentBalls"],
                    "missingBalls": payload["missingBalls"],
                    "confidenceByBall": payload["confidenceByBall"],
                    "confidenceSummary": payload["confidenceSummary"],
                    "stableFrames": payload["stableFrames"],
                    "snapshotId": payload["snapshotId"],
                },
                confirmed_missing=sorted(confirmed_missing),
            )

        if uncertain_missing:
            return StableComparisonResult(
                event_type="review_required",
                payload={
                    "reason": "Ambiguous missing balls confidence",
                    "presentBalls": payload["presentBalls"],
                    "missingBalls": payload["missingBalls"],
                    "confidenceByBall": payload["confidenceByBall"],
                    "confidenceSummary": payload["confidenceSummary"],
                    "stableFrames": payload["stableFrames"],
                    "snapshotId": payload["snapshotId"],
                },
                confirmed_missing=[],
            )

        self._previous_stable_present = payload["presentBalls"]  # type: ignore[assignment]
        return StableComparisonResult(
            event_type="ball_presence_updated",
            payload={
                "presentBalls": payload["presentBalls"],
                "missingBalls": payload["missingBalls"],
                "confidenceByBall": payload["confidenceByBall"],
                "confidenceSummary": payload["confidenceSummary"],
                "stableFrames": payload["stableFrames"],
                "snapshotId": payload["snapshotId"],
            },
            confirmed_missing=[],
        )


def build_detection_map(ball_confidences: Iterable[tuple[int, float]]) -> Dict[int, float]:
    result: Dict[int, float] = {}
    for ball, confidence in ball_confidences:
        result[ball] = max(result.get(ball, 0.0), confidence)
    return result
