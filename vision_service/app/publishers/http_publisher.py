from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict
import requests

from app.publishers.interfaces import EventPublisher


@dataclass
class HttpEventPublisher(EventPublisher):
    base_url: str
    path: str
    vision_service_key: str
    timeout_seconds: float = 5.0

    def publish(self, event: Dict[str, Any]) -> bool:
        headers = {"Content-Type": "application/json"}
        if self.vision_service_key:
            headers["x-vision-key"] = self.vision_service_key

        url = f"{self.base_url.rstrip('/')}{self.path}"
        try:
            response = requests.post(url, json=event, headers=headers, timeout=self.timeout_seconds)
            return response.status_code < 300
        except requests.RequestException:
            return False
