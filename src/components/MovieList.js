import React from 'react';
import './MovieList.css';

const Movielist = (props) => {
  const FavouriteComponent = props.favouriteComponent;

  return (
    <div className="movie-container">
      {props.movies.map((movie) => (
        <div className="div image-container" key={movie.imdbID}>
          <img
            src={movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : ''}
            alt={movie.Title || 'Movie poster'}
            height={350}
            width={250}
          />
          <div
            className="overlay"
            onClick={() => props.handleFavouriteClicks(movie)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                props.handleFavouriteClicks(movie);
              }
            }}
          >
            <FavouriteComponent />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Movielist;
