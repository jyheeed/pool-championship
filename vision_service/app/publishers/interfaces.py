from __future__ import annotations

from typing import Any, Dict, Protocol


class EventPublisher(Protocol):
    def publish(self, event: Dict[str, Any]) -> bool:
        ...
