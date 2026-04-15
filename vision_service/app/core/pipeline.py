from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
import threading
import time
from typing import Dict, List, Optional

from app.config.settings import VisionSettings
from app.core.camera_reader import CameraReader, MockCameraReader, OpenCVCameraReader
from app.core.motion_detector import MotionDetector
from app.core.stable_state_comparator import StableStateComparator, build_detection_map
from app.detectors.mock_detector import MockBallDetector
from app.publishers.interfaces import EventPublisher
from app.state_machine.table_state_machine import TableState, TableStateMachine, TableTransition


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class VisionRuntimeState:
    running: bool = False
    camera_connected: bool = False
    last_error: Optional[str] = None
    last_motion_score: float = 0.0
    table_state: TableState = TableState.IDLE
    stable_frames: int = 0
    stable_confirmations: int = 0
    last_published_at: Optional[str] = None


@dataclass
class VisionPipeline:
    settings: VisionSettings
    publisher: EventPublisher
    runtime: VisionRuntimeState = field(default_factory=VisionRuntimeState)

    def __post_init__(self) -> None:
        self.motion = MotionDetector(motion_threshold=self.settings.motion_threshold)
        self.machine = TableStateMachine(
            stabilizing_threshold=self.settings.stabilizing_threshold,
            stable_required_frames=self.settings.stable_required_frames,
        )
        self.detector = MockBallDetector(self.settings.discipline)
        self.reader: CameraReader = self._build_reader()
        self.comparator = StableStateComparator(
            expected_balls=self.detector.present_balls.copy(),
            missing_confirm_frames=self.settings.missing_confirm_frames,
            missing_confidence_threshold=self.settings.missing_confidence_threshold,
            review_lower_confidence_threshold=self.settings.review_lower_confidence_threshold,
        )
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()

        self._stable_detection_window: List[Dict[int, float]] = []

        self._drop_sequence: List[int] = []
        if self.settings.mock_drop_sequence.strip():
            self._drop_sequence = [
                int(x.strip())
                for x in self.settings.mock_drop_sequence.split(',')
                if x.strip().isdigit()
            ]

    def _build_reader(self) -> CameraReader:
        if self.settings.camera_source == 'mock':
            return MockCameraReader()
        return OpenCVCameraReader(self.settings.camera_source)

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return

        self._stop.clear()
        self.runtime.running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self.runtime.running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        self.reader.close()

    def _publish(self, payload: Dict[str, object]) -> None:
        if not self.settings.match_id:
            self.runtime.last_error = 'VISION_MATCH_ID not configured'
            return

        enriched = {
            **payload,
            'matchId': self.settings.match_id,
            'source': 'vision-service',
            'emittedAt': now_iso(),
        }
        ok = self.publisher.publish(enriched)
        self.runtime.last_published_at = now_iso()
        if not ok:
            self.runtime.last_error = 'Failed to publish event to match-state service'

    def _maybe_simulate_pot(self) -> None:
        if self.settings.mock_drop_every_n_stable <= 0:
            return

        should_drop = self.runtime.stable_confirmations % self.settings.mock_drop_every_n_stable == 0
        if not should_drop:
            return

        ball_to_drop: Optional[int] = None
        if self._drop_sequence:
            while self._drop_sequence and ball_to_drop is None:
                candidate = self._drop_sequence.pop(0)
                if candidate in self.detector.present_balls:
                    ball_to_drop = candidate
        else:
            if self.detector.present_balls:
                ball_to_drop = self.detector.present_balls[0]

        if ball_to_drop is not None:
            self.detector.remove_ball(ball_to_drop)

    def _run_loop(self) -> None:
        frame_interval = 1.0 / max(1.0, self.settings.camera_fps)

        while not self._stop.is_set():
            frame = self.reader.read()
            if frame is None:
                self.runtime.camera_connected = False
                self.runtime.last_error = 'Camera disconnected or frame read failed'
                time.sleep(frame_interval)
                continue

            self.runtime.camera_connected = True
            motion_score = self.motion.score(frame)
            detections = self.detector.detect(frame)
            self.process_observation(motion_score=motion_score, detections=detections)

            time.sleep(frame_interval)

    def process_observation(self, motion_score: float, detections: List[object]) -> None:
        self.runtime.last_motion_score = motion_score

        is_motion = self.motion.is_motion(motion_score)
        transition: TableTransition = self.machine.update(motion_score=motion_score, is_motion=is_motion)
        self.runtime.table_state = transition.current
        self.runtime.stable_frames = self.machine.stable_counter

        if transition.current == TableState.MOTION:
            self._stable_detection_window.clear()
            if transition.changed:
                self._publish({
                    'type': 'table_motion_started',
                    'motionScore': float(motion_score),
                })
            return

        if transition.current in (TableState.STABILIZING, TableState.STABLE_CONFIRMED):
            ball_confidences: List[tuple[int, float]] = []
            for detection in detections:
                ball = getattr(detection, 'ball', None)
                confidence = getattr(detection, 'confidence', None)
                if isinstance(ball, int) and isinstance(confidence, float):
                    ball_confidences.append((ball, confidence))

            frame_map = build_detection_map(ball_confidences)
            self._stable_detection_window.append(frame_map)
            if len(self._stable_detection_window) > self.settings.stable_window_frames:
                self._stable_detection_window.pop(0)

        if transition.current != TableState.STABLE_CONFIRMED:
            return

        if len(self._stable_detection_window) < self.settings.stable_window_frames:
            return

        self.runtime.stable_confirmations += 1
        result = self.comparator.evaluate(self._stable_detection_window)
        stable_snapshot_id = result.payload.get('snapshotId')

        self._publish({
            'type': 'table_stable_confirmed',
            'stableFrames': int(result.payload.get('stableFrames', 0)),
            'snapshotId': stable_snapshot_id,
        })

        if result.event_type == 'ball_missing_confirmed':
            self._publish({
                'type': 'ball_missing_confirmed',
                'missingBalls': result.confirmed_missing,
                'payload': result.payload,
            })
        elif result.event_type == 'review_required':
            self._publish({
                'type': 'review_required',
                'reason': str(result.payload.get('reason', 'Ambiguous stable comparison')),
                'payload': {
                    'presentBalls': result.payload.get('presentBalls', []),
                    'missingBalls': result.payload.get('missingBalls', []),
                    'confidenceByBall': result.payload.get('confidenceByBall', {}),
                    'confidenceSummary': result.payload.get('confidenceSummary', {}),
                    'stableFrames': result.payload.get('stableFrames', 0),
                    'snapshotId': result.payload.get('snapshotId'),
                },
            })
        else:
            self._publish({
                'type': 'ball_presence_updated',
                'payload': result.payload,
            })

        self._maybe_simulate_pot()
        self._stable_detection_window.clear()
