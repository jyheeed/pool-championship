from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    from pymongo import MongoClient  # type: ignore[import-not-found]
    from pymongo.errors import PyMongoError  # type: ignore[import-not-found]
except Exception:  # pragma: no cover - optional dependency in editor/runtime mismatch
    MongoClient = None  # type: ignore[assignment]

    class PyMongoError(Exception):
        pass

from app.publishers.interfaces import EventPublisher


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class MongoEventPublisher(EventPublisher):
    mongo_uri: str
    db_name: str
    events_collection: str
    snapshots_collection: str

    def __post_init__(self) -> None:
        self._client: Optional[Any] = None

    @property
    def client(self) -> Any:
        if MongoClient is None:
            raise RuntimeError("pymongo is not installed")
        if self._client is None:
            self._client = MongoClient(self.mongo_uri)
        return self._client

    def close(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None

    def publish(self, event: Dict[str, Any]) -> bool:
        try:
            db = self.client[self.db_name]
            payload = {
                **event,
                "ingestedAt": utc_now(),
            }
            db[self.events_collection].insert_one(payload)

            event_type = event.get("type")
            if event_type in {"ball_presence_updated", "ball_missing_confirmed"}:
                stable_payload = event.get("payload")
                if isinstance(stable_payload, dict):
                    db[self.snapshots_collection].insert_one(
                        {
                            "matchId": event.get("matchId"),
                            "eventType": event_type,
                            "snapshotId": stable_payload.get("snapshotId"),
                            "stableFrames": stable_payload.get("stableFrames"),
                            "presentBalls": stable_payload.get("presentBalls", []),
                            "missingBalls": stable_payload.get("missingBalls", []),
                            "confidenceByBall": stable_payload.get("confidenceByBall", {}),
                            "confidenceSummary": stable_payload.get("confidenceSummary", {}),
                            "capturedAt": utc_now(),
                        }
                    )

            return True
        except PyMongoError:
            return False
