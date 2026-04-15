from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

from app.publishers.interfaces import EventPublisher


@dataclass
class PublisherBinding:
    publisher: EventPublisher
    required: bool = True


@dataclass
class MultiPublisher(EventPublisher):
    publishers: List[PublisherBinding]

    def publish(self, event: Dict[str, Any]) -> bool:
        overall_ok = True
        for binding in self.publishers:
            ok = binding.publisher.publish(event)
            if binding.required and not ok:
                overall_ok = False
        return overall_ok
