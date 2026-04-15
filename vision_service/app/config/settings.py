from __future__ import annotations

from pydantic import BaseModel
import os


class VisionSettings(BaseModel):
    service_name: str = os.getenv("VISION_SERVICE_NAME", "vision-service")
    camera_source: str = os.getenv("VISION_CAMERA_SOURCE", "mock")
    camera_fps: float = float(os.getenv("VISION_CAMERA_FPS", "12"))

    motion_threshold: float = float(os.getenv("VISION_MOTION_THRESHOLD", "18.0"))
    stabilizing_threshold: float = float(os.getenv("VISION_STABILIZING_THRESHOLD", "8.0"))
    stable_required_frames: int = int(os.getenv("VISION_STABLE_REQUIRED_FRAMES", "15"))
    stable_window_frames: int = int(os.getenv("VISION_STABLE_WINDOW_FRAMES", "12"))

    missing_confirm_frames: int = int(os.getenv("VISION_MISSING_CONFIRM_FRAMES", "8"))
    missing_confidence_threshold: float = float(os.getenv("VISION_MISSING_CONFIDENCE_THRESHOLD", "0.85"))
    review_lower_confidence_threshold: float = float(os.getenv("VISION_REVIEW_LOWER_CONFIDENCE_THRESHOLD", "0.60"))

    next_api_base_url: str = os.getenv("NEXT_API_BASE_URL", "http://localhost:3000")
    vision_publish_path: str = os.getenv("VISION_PUBLISH_PATH", "/api/stream/vision-events")
    vision_service_key: str = os.getenv("VISION_SERVICE_KEY", "")

    match_id: str = os.getenv("VISION_MATCH_ID", "")
    discipline: str = os.getenv("VISION_DISCIPLINE", "8-ball")

    mock_drop_every_n_stable: int = int(os.getenv("VISION_MOCK_DROP_EVERY_N_STABLE", "3"))
    mock_drop_sequence: str = os.getenv("VISION_MOCK_DROP_SEQUENCE", "")

    mongo_enabled: bool = os.getenv("VISION_MONGO_ENABLED", "false").lower() == "true"
    mongo_uri: str = os.getenv("VISION_MONGO_URI", "mongodb://localhost:27017")
    mongo_db_name: str = os.getenv("VISION_MONGO_DB_NAME", "pool-championship")
    mongo_events_collection: str = os.getenv("VISION_MONGO_EVENTS_COLLECTION", "vision_events")
    mongo_snapshots_collection: str = os.getenv("VISION_MONGO_SNAPSHOTS_COLLECTION", "vision_snapshots")


settings = VisionSettings()
