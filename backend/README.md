# CineMind AI backend

FastAPI service for natural-language movie discovery.

## Setup

1. Create and activate a Python virtual environment.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env`.
4. Add your Gemini API key and a rotated OMDb API key to `.env`.
5. Start the API:

```bash
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health

## Discovery endpoint

`POST /api/discover`

Request:

```json
{"query": "A Korean mystery thriller released after 2020, no horror"}
```

The service asks Gemini to extract search constraints, searches OMDb for real
movie records, fetches details, applies explicit filters, and asks Gemini to
rank only those records. Movie metadata is sourced from OMDb; the model does
not get to invent movie records.

## Security

- Keep `.env` private and never put API keys in React.
- Rotate any OMDb key that was previously committed to a public repository.
- Set `FRONTEND_ORIGINS` to the exact deployed frontend origin before deployment.
- Add rate limiting and request logging before exposing the API publicly.
