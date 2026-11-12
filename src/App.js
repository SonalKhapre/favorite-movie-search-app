import React, { useEffect, useState } from 'react';
import Movielist from './components/MovieList';
import './App.css';
import MovieHeading from './components/MovieHeading';
import SearchBox from './components/SearchBox';
import AddFavourites from './components/AddFavourites';
import RemoveFavourites from './components/RemoveFavourites';
import AIMovieDiscovery from './components/AIMovieDiscovery';

const API_BASE_URL =
  process.env.REACT_APP_CINEMIND_API_URL || 'http://localhost:8000';

function App() {
  const [movies, setMovies] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [favourites, setFavourites] = useState([]);

  const getMovieRequest = async (value) => {
    if (!value.trim()) {
      setMovies([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/search?query=${encodeURIComponent(value.trim())}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Movie search failed.');
      }
      setMovies(data.movies || []);
    } catch (error) {
      console.error('Movie search failed:', error);
      setMovies([]);
    }
  };

  const saveToLocalStorage = (items) => {
    localStorage.setItem('movie-search-app-favourites', JSON.stringify(items));
  };

  const addFavouriteMovie = (movie) => {
    const alreadySaved = favourites.some(
      (favourite) => favourite.imdbID === movie.imdbID
    );
    if (alreadySaved) return;
    const newFavouriteList = [...favourites, movie];
    setFavourites(newFavouriteList);
    saveToLocalStorage(newFavouriteList);
  };

  const removeFavouriteMovie = (movie) => {
    const newFavouriteList = favourites.filter(
      (favourite) => favourite.imdbID !== movie.imdbID
    );
    setFavourites(newFavouriteList);
    saveToLocalStorage(newFavouriteList);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => getMovieRequest(searchValue), 350);
    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  useEffect(() => {
    try {
      const movieFavourites = JSON.parse(
        localStorage.getItem('movie-search-app-favourites') || '[]'
      );
      if (Array.isArray(movieFavourites)) setFavourites(movieFavourites);
    } catch (error) {
      console.error('Could not load saved favourites:', error);
    }
  }, []);

  return (
    <div className="movie-app">
      <div className="row1">
        <MovieHeading heading="🔍 Movies" />
        <SearchBox searchValue={searchValue} setSearchValue={setSearchValue} />
      </div>
      <div className="row2">
        <Movielist
          movies={movies}
          handleFavouriteClicks={addFavouriteMovie}
          favouriteComponent={AddFavourites}
        />
      </div>

      <AIMovieDiscovery />

      <div className="row1">
        <MovieHeading heading="Favourites ❤️" />
      </div>
      <div className="row2">
        <Movielist
          movies={favourites}
          handleFavouriteClicks={removeFavouriteMovie}
          favouriteComponent={RemoveFavourites}
        />
      </div>
    </div>
  );
}

export default App;
