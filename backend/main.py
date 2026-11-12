import asyncio
import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OMDB_API_KEY = os.getenv("OMDB_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/"
    f"models/{GEMINI_MODEL}:generateContent"
)
OMDB_URL = "https://www.omdbapi.com/"

origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,https://sonalkhapre.github.io",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="CineMind AI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class DiscoveryRequest(BaseModel):
    query: str = Field(min_length=5, max_length=500)


async def call_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY to backend/.env.",
        )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    async with httpx.AsyncClient(timeout=35) as client:
        response = await client.post(
            GEMINI_URL,
            headers={
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            json=payload,
        )

    if response.is_error:
        raise HTTPException(
            status_code=502,
            detail="The AI provider could not process this request.",
        )

    try:
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError):
        raise HTTPException(
            status_code=502,
            detail="The AI provider returned an unexpected response.",
        )


def parse_model_json(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    try:
        parsed = json.loads(cleaned)
        if not isinstance(parsed, dict):
            raise ValueError("Expected a JSON object")
        return parsed
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="The AI response could not be parsed. Please try again.",
        )


async def search_omdb(term: str) -> list[dict[str, Any]]:
    if not OMDB_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OMDb is not configured. Add OMDB_API_KEY to backend/.env.",
        )

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            OMDB_URL,
            params={"apikey": OMDB_API_KEY, "s": term, "type": "movie"},
        )
        response.raise_for_status()
        data = response.json()

    if data.get("Response") != "True":
        return []
    return data.get("Search", [])


async def get_movie_details(imdb_id: str) -> dict[str, Any] | None:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            OMDB_URL,
            params={
                "apikey": OMDB_API_KEY,
                "i": imdb_id,
                "plot": "short",
            },
        )
        response.raise_for_status()
        data = response.json()

    return data if data.get("Response") == "True" else None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cinemind-ai"}


@app.get("/api/search")
async def search_movies(query: str = Field(min_length=2, max_length=100)):
    """Search OMDb from the backend so the API key never reaches the browser."""
    results = await search_omdb(query.strip())
    return {"movies": results}


@app.post("/api/discover")
async def discover_movies(request: DiscoveryRequest):
    query = request.query.strip()

    # Step 1: turn natural language into a small, safe search plan.
    planner_prompt = f"""
You are the search-planning component of a movie discovery application.
Convert the user's request into JSON only. Do not recommend movie titles.
Return this exact shape:
{{
  "search_terms": ["up to 3 short title/topic search phrases"],
  "min_year": null,
  "max_year": null,
  "min_rating": null,
  "exclude_genres": [],
  "preferred_genres": [],
  "max_runtime_minutes": null,
  "language_preference": null
}}
Use null when the user did not specify a constraint. search_terms must contain
1 to 3 concise terms that can be used with the OMDb title search endpoint.
Do not invent constraints. The user request is:
{query}
"""
    plan = parse_model_json(await call_gemini(planner_prompt))
    terms = plan.get("search_terms", [])
    if not isinstance(terms, list):
        terms = []
    terms = [str(term).strip() for term in terms if str(term).strip()][:3]
    if not terms:
        terms = [query[:60]]

    # Step 2: use OMDb as the source of truth for movie records.
    search_results = await asyncio.gather(*(search_omdb(term) for term in terms))
    unique_movies: dict[str, dict[str, Any]] = {}
    for result_set in search_results:
        for movie in result_set:
            imdb_id = movie.get("imdbID")
            if imdb_id:
                unique_movies[imdb_id] = movie
            if len(unique_movies) >= 15:
                break

    if not unique_movies:
        return {"preferences": plan, "recommendations": []}

    details = await asyncio.gather(
        *(get_movie_details(imdb_id) for imdb_id in list(unique_movies.keys())[:15])
    )
    candidates = [movie for movie in details if movie]

    # Apply explicit constraints deterministically before asking the AI to rank.
    def passes_filters(movie: dict[str, Any]) -> bool:
        try:
            year = int(str(movie.get("Year", ""))[:4])
        except ValueError:
            year = None

        try:
            rating = float(movie.get("imdbRating", "N/A"))
        except (TypeError, ValueError):
            rating = None

        if plan.get("min_year") and year and year < int(plan["min_year"]):
            return False
        if plan.get("max_year") and year and year > int(plan["max_year"]):
            return False
        if plan.get("min_rating") and rating is not None:
            if rating < float(plan["min_rating"]):
                return False

        genres = {part.strip().lower() for part in movie.get("Genre", "").split(",")}
        excluded = {str(part).lower() for part in plan.get("exclude_genres", [])}
        if genres.intersection(excluded):
            return False

        try:
            runtime = int(str(movie.get("Runtime", "")).split()[0])
        except (ValueError, IndexError):
            runtime = None
        max_runtime = plan.get("max_runtime_minutes")
        if max_runtime and runtime and runtime > int(max_runtime):
            return False

        return True

    candidates = [movie for movie in candidates if passes_filters(movie)]
    if not candidates:
        return {"preferences": plan, "recommendations": []}

    # Step 3: rank only real OMDb records; the model cannot create new titles.
    candidate_context = [
        {
            "imdbID": movie.get("imdbID"),
            "Title": movie.get("Title"),
            "Year": movie.get("Year"),
            "Genre": movie.get("Genre"),
            "Plot": movie.get("Plot"),
            "imdbRating": movie.get("imdbRating"),
            "Runtime": movie.get("Runtime"),
            "Language": movie.get("Language"),
            "Poster": movie.get("Poster"),
        }
        for movie in candidates
    ]

    ranking_prompt = f"""
You are CineMind, a movie discovery ranking engine.
Rank the supplied movie records for the user's request. Use only the supplied
imdbID values. Never invent titles, ratings, plot details, or IDs.
Return JSON only in this shape:
{{
  "ranked": [
    {{"imdbID": "existing id", "match_score": 0, "reason": "short explanation"}}
  ]
}}
Scores must be integers from 0 to 100. Return at most 8 records.
User request: {query}
Parsed preferences: {json.dumps(plan)}
Movie records: {json.dumps(candidate_context)}
"""
    ranking = parse_model_json(await call_gemini(ranking_prompt))
    by_id = {movie.get("imdbID"): movie for movie in candidates}
    recommendations = []

    for item in ranking.get("ranked", [])[:8]:
        imdb_id = item.get("imdbID")
        movie = by_id.get(imdb_id)
        if not movie:
            continue
        try:
            score = max(0, min(100, int(item.get("match_score", 0))))
        except (TypeError, ValueError):
            score = 0

        recommendations.append({
            "imdbID": imdb_id,
            "title": movie.get("Title"),
            "year": movie.get("Year"),
            "genre": movie.get("Genre"),
            "plot": movie.get("Plot"),
            "rating": movie.get("imdbRating"),
            "runtime": movie.get("Runtime"),
            "language": movie.get("Language"),
            "poster": movie.get("Poster"),
            "matchScore": score,
            "reason": str(item.get("reason", "Matches some of your preferences."))[:300],
        })

    return {"preferences": plan, "recommendations": recommendations}
