import React, { useState } from 'react';
import './AIMovieDiscovery.css';

const API_BASE_URL =
  process.env.REACT_APP_CINEMIND_API_URL || 'http://localhost:8000';

const EXAMPLE_PROMPTS = [
  'A clever psychological thriller with a surprising ending, no horror',
  'A feel-good romantic comedy under two hours',
  'A Korean mystery released after 2020',
];

function AIMovieDiscovery() {
  const [query, setQuery] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const discoverMovies = async (event) => {
    event.preventDefault();
    if (query.trim().length < 5) {
      setError('Please describe the kind of movie you want (at least 5 characters).');
      return;
    }

    setLoading(true);
    setError('');
    setRecommendations([]);
    setPreferences(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Movie discovery is temporarily unavailable.');
      }
      setPreferences(data.preferences || null);
      setRecommendations(data.recommendations || []);
      if (!data.recommendations || data.recommendations.length === 0) {
        setError('No matching movies found. Try a broader description.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to CineMind. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="cinemind" aria-labelledby="cinemind-title">
      <div className="cinemind-heading">
        <div>
          <p className="cinemind-eyebrow">YOUR PERSONAL MOVIE SCOUT</p>
          <h2 id="cinemind-title">CineMind <span>AI</span></h2>
          <p className="cinemind-intro">
            Describe the movie you feel like watching. Let AI find your next favourite.
          </p>
        </div>
        <div className="cinemind-orbit" aria-hidden="true">✦</div>
      </div>

      <form className="cinemind-form" onSubmit={discoverMovies}>
        <label htmlFor="cinemind-query">What kind of movie are you in the mood for?</label>
        <textarea
          id="cinemind-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Example: A mind-bending thriller released after 2020, rated above 7, but not horror..."
          rows={3}
          maxLength={500}
        />
        <div className="cinemind-form-footer">
          <span>{query.length}/500</span>
          <button type="submit" disabled={loading || query.trim().length < 5}>
            {loading ? 'Discovering…' : '✦ Discover movies'}
          </button>
        </div>
      </form>

      <div className="cinemind-examples">
        <span>Try:</span>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button key={prompt} type="button" onClick={() => setQuery(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      {loading && <div className="cinemind-status" role="status">Understanding your taste and searching movie records…</div>}
      {error && <p className="cinemind-error" role="alert">{error}</p>}

      {preferences && recommendations.length > 0 && (
        <div className="cinemind-results">
          <div className="cinemind-results-heading">
            <div>
              <p className="cinemind-eyebrow">CURATED FOR YOUR REQUEST</p>
              <h3>Your movie matches</h3>
            </div>
            <span>{recommendations.length} results</span>
          </div>
          <div className="cinemind-grid">
            {recommendations.map((movie) => (
              <article className="cinemind-card" key={movie.imdbID}>
                {movie.poster && movie.poster !== 'N/A' ? (
                  <img src={movie.poster} alt={`${movie.title} poster`} />
                ) : (
                  <div className="cinemind-no-poster">No poster available</div>
                )}
                <div className="cinemind-card-content">
                  <div className="cinemind-card-meta">
                    <span>{movie.year}</span>
                    <span>★ {movie.rating || 'N/A'}</span>
                    <strong>{movie.matchScore}% match</strong>
                  </div>
                  <h4>{movie.title}</h4>
                  <p className="cinemind-genre">{movie.genre}</p>
                  <p className="cinemind-reason">{movie.reason}</p>
                  {movie.plot && movie.plot !== 'N/A' && (
                    <details>
                      <summary>Read plot</summary>
                      <p>{movie.plot}</p>
                    </details>
                  )}
                  <a href={`https://www.imdb.com/title/${movie.imdbID}/`} target="_blank" rel="noreferrer">
                    View on IMDb ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default AIMovieDiscovery;
