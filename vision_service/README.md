# Vision Service (Phase 1 Mock Pipeline)

This service provides a production-shaped, model-pluggable vision pipeline with:
- motion detection
- stable-state confirmation over multiple frames
- stable-state comparison against previously confirmed state
- missing-ball confirmation only after stable confidence checks
- HTTP event publishing to the match-state service
- optional Mongo event/snapshot persistence

## Run locally

```bash
cd vision_service
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8010
```

## Required environment

- `VISION_MATCH_ID` : active match id in MongoDB
- `NEXT_API_BASE_URL` : Next app base URL (default `http://localhost:3000`)
- `VISION_SERVICE_KEY` : optional shared secret for `/api/stream/vision-events`
- `VISION_MONGO_ENABLED` : `true` or `false`
- `VISION_MONGO_URI` : Mongo URI for vision logs
- `VISION_MONGO_DB_NAME` : Mongo DB name for vision collections

## Reliability guardrails in this phase

- no ball removal decisions while table is in motion
- stable state requires consecutive stable frames
- detection aggregated over a stable frame window
- missing balls require confidence and frame-count confirmations
- uncertain cases emit `review_required`

## Endpoints

- `GET /health`
- `GET /ready`
- `GET /calibration`

## Tests

```bash
cd vision_service
pytest app/tests -q
```
