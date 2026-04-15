from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

from app.config.settings import settings
from app.core.pipeline import VisionPipeline
from app.publishers.http_publisher import HttpEventPublisher
from app.publishers.mongo_publisher import MongoEventPublisher
from app.publishers.multi_publisher import MultiPublisher, PublisherBinding


http_publisher = HttpEventPublisher(
    base_url=settings.next_api_base_url,
    path=settings.vision_publish_path,
    vision_service_key=settings.vision_service_key,
)

bindings = [PublisherBinding(publisher=http_publisher, required=True)]
mongo_publisher = None
if settings.mongo_enabled:
    mongo_publisher = MongoEventPublisher(
        mongo_uri=settings.mongo_uri,
        db_name=settings.mongo_db_name,
        events_collection=settings.mongo_events_collection,
        snapshots_collection=settings.mongo_snapshots_collection,
    )
    bindings.append(PublisherBinding(publisher=mongo_publisher, required=False))

publisher = MultiPublisher(publishers=bindings)
pipeline = VisionPipeline(settings=settings, publisher=publisher)

app = FastAPI(title='vision-service', version='0.1.0')


class MatchControlPayload(BaseModel):
    action: str
    matchId: str | None = None


def _is_control_authorized(request: Request) -> bool:
    # If no key is configured, keep local/dev control open.
    if not settings.vision_service_key:
        return True
    return request.headers.get('x-vision-key') == settings.vision_service_key


@app.on_event('startup')
def startup() -> None:
    pipeline.start()


@app.on_event('shutdown')
def shutdown() -> None:
    pipeline.stop()
    if mongo_publisher is not None:
        mongo_publisher.close()


@app.get('/health')
def health() -> dict:
    return {
        'service': settings.service_name,
        'status': 'ok',
        'running': pipeline.runtime.running,
        'cameraConnected': pipeline.runtime.camera_connected,
        'tableState': pipeline.runtime.table_state,
        'stableFrames': pipeline.runtime.stable_frames,
        'lastMotionScore': pipeline.runtime.last_motion_score,
        'lastPublishedAt': pipeline.runtime.last_published_at,
        'lastError': pipeline.runtime.last_error,
        'mongoEnabled': settings.mongo_enabled,
    }


@app.get('/ready')
def ready() -> dict:
    return {
        'ready': bool(settings.match_id),
        'matchIdConfigured': bool(settings.match_id),
        'matchId': settings.match_id,
        'cameraConfigured': bool(settings.camera_source),
    }


@app.get('/control/state')
def control_state() -> dict:
    return {
        'ready': bool(settings.match_id),
        'matchId': settings.match_id,
        'running': pipeline.runtime.running,
    }


@app.post('/control/match')
def control_match(payload: MatchControlPayload, request: Request) -> dict:
    if not _is_control_authorized(request):
        raise HTTPException(status_code=401, detail='Unauthorized')

    if payload.action == 'set_match':
        if not payload.matchId:
            return {'ok': False, 'error': 'matchId is required for set_match'}

        settings.match_id = payload.matchId
        pipeline.runtime.last_error = None
        return {
            'ok': True,
            'action': payload.action,
            'matchId': settings.match_id,
            'ready': True,
        }

    if payload.action == 'clear_match':
        settings.match_id = ''
        return {
            'ok': True,
            'action': payload.action,
            'matchId': settings.match_id,
            'ready': False,
        }

    return {'ok': False, 'error': 'Unsupported action'}


@app.get('/calibration')
def calibration() -> dict:
    # Phase 1 fixed-camera assumption. Calibration coordinates become configurable in Phase 2.
    return {
        'mode': 'fixed-overhead',
        'tablePolygon': [[0.08, 0.12], [0.92, 0.12], [0.95, 0.88], [0.05, 0.88]],
        'pocketZones': [
            {'x': 0.05, 'y': 0.1},
            {'x': 0.5, 'y': 0.08},
            {'x': 0.95, 'y': 0.1},
            {'x': 0.05, 'y': 0.9},
            {'x': 0.5, 'y': 0.92},
            {'x': 0.95, 'y': 0.9},
        ],
    }
