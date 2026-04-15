from __future__ import annotations

from dataclasses import dataclass
from typing import Optional
import numpy as np

try:
    import cv2  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - editor/runtime env mismatch
    cv2 = None  # type: ignore[assignment]


class CameraReader:
    def read(self) -> Optional[np.ndarray]:
        raise NotImplementedError

    def close(self) -> None:
        pass


@dataclass
class OpenCVCameraReader(CameraReader):
    source: str

    def __post_init__(self) -> None:
        if cv2 is None:
            raise RuntimeError('OpenCV (cv2) is not installed. Install vision_service requirements.')
        index = int(self.source) if self.source.isdigit() else self.source
        self.cap = cv2.VideoCapture(index)

    def read(self) -> Optional[np.ndarray]:
        ok, frame = self.cap.read()
        if not ok:
            return None
        return frame

    def close(self) -> None:
        if self.cap is not None:
            self.cap.release()


class MockCameraReader(CameraReader):
    def __init__(self) -> None:
        self._tick = 0

    def read(self) -> Optional[np.ndarray]:
        # Synthetic frame to keep pipeline alive in local/dev when no camera exists.
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        c = (self._tick * 2) % 255
        frame[:, :, 1] = 70 + (c // 5)
        frame[:, :, 0] = 20
        frame[:, :, 2] = 10
        self._tick += 1
        return frame
