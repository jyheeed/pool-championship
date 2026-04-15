from dataclasses import dataclass

from app.config.settings import VisionSettings
from app.core.pipeline import VisionPipeline
from app.detectors.interfaces import BallDetection
from app.publishers.interfaces import EventPublisher


@dataclass
class InMemoryPublisher(EventPublisher):
    events: list

    def publish(self, event):
        self.events.append(event)
        return True


def _build_pipeline(publisher: EventPublisher) -> VisionPipeline:
    settings = VisionSettings(
        match_id="match-1",
        discipline="9-ball",
        stable_required_frames=2,
        stable_window_frames=3,
        missing_confirm_frames=2,
        missing_confidence_threshold=0.8,
        review_lower_confidence_threshold=0.6,
        mock_drop_every_n_stable=0,
    )
    pipeline = VisionPipeline(settings=settings, publisher=publisher)
    return pipeline


def test_no_missing_decision_during_motion() -> None:
    publisher = InMemoryPublisher(events=[])
    pipeline = _build_pipeline(publisher)

    moving_detections = [BallDetection(ball=1, confidence=0.9, x=0.1, y=0.1)]
    pipeline.process_observation(motion_score=50.0, detections=moving_detections)
    pipeline.process_observation(motion_score=45.0, detections=moving_detections)

    event_types = [event.get("type") for event in publisher.events]
    assert "ball_missing_confirmed" not in event_types
    assert "review_required" not in event_types


def test_missing_ball_confirmed_after_stable_frames() -> None:
    publisher = InMemoryPublisher(events=[])
    pipeline = _build_pipeline(publisher)

    # Leave motion first.
    pipeline.process_observation(
        motion_score=30.0,
        detections=[BallDetection(ball=1, confidence=0.9, x=0.1, y=0.1)],
    )

    # Stable window where ball 2 is absent across all frames.
    for _ in range(4):
        pipeline.process_observation(
            motion_score=2.0,
            detections=[
                BallDetection(ball=1, confidence=0.95, x=0.1, y=0.1),
                BallDetection(ball=3, confidence=0.95, x=0.2, y=0.1),
                BallDetection(ball=4, confidence=0.95, x=0.3, y=0.1),
                BallDetection(ball=5, confidence=0.95, x=0.4, y=0.1),
                BallDetection(ball=6, confidence=0.95, x=0.5, y=0.1),
                BallDetection(ball=7, confidence=0.95, x=0.6, y=0.1),
                BallDetection(ball=8, confidence=0.95, x=0.7, y=0.1),
                BallDetection(ball=9, confidence=0.95, x=0.8, y=0.1),
            ],
        )

    event_types = [event.get("type") for event in publisher.events]
    assert "table_stable_confirmed" in event_types
    assert "ball_missing_confirmed" in event_types
