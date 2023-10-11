import React, { useEffect, useState } from 'react';
import Movielist from './components/MovieList';
import './App.css';
import MovieHeading from './components/MovieHeading';
import SearchBox from './components/SearchBox';
import AddFavourites from './components/AddFavourites';
import RemoveFavourites from './components/RemoveFavourites';



function App() {
  const [movies, setMovies] = useState([]);
  const [searchValue, setSearchValue]= useState("");
  const [favourites, setFavourites] = useState([]);

  const getMovieRequest = async (searchValue) => {
  const url = `https://www.omdbapi.com/?s=${searchValue}&apikey=12ad2d81`
  const response = await fetch(url);
  const responseJson = await response.json();
  if(responseJson.Search){
    setMovies(responseJson.Search);
  }
  }

  const saveToLocalStorage = (items) =>{
  localStorage.setItem('movie-search-app-favourites', JSON.stringify(items))
}

const addFavouriteMovie = (movie) =>{
  const newFavouriteList = [...favourites,movie];
  setFavourites(newFavouriteList);
  saveToLocalStorage(newFavouriteList);
}

const removeFavouriteMovie = (movie) => {
  const newFavouriteList = favourites.filter(
    (favourite) => favourite.imdbID !== movie.imdbID);
  setFavourites(newFavouriteList);
  saveToLocalStorage(newFavouriteList);
}

useEffect(()=>{
  getMovieRequest(searchValue);
},[searchValue]);

useEffect(()=>{
  const movieFavourites = JSON.parse(localStorage.getItem('movie-search-app-favourites'));
  if(movieFavourites){
    setFavourites(movieFavourites);
  }
 
}, []);


  return (
   <div className='movie-app'>
   <div className='row1'>
    <MovieHeading heading="🔍 Movies"/>
    <SearchBox searchValue={searchValue} setSearchValue={setSearchValue}/>
   </div>
   <div className='row2'>
   <Movielist movies={movies} handleFavouriteClicks={addFavouriteMovie} favouriteComponent={AddFavourites}/>
  </div>
  <div className='row1'>
    <MovieHeading heading="Favourites ❤️"/>
   </div>
   <div className='row2'>
   <Movielist movies={favourites} handleFavouriteClicks={removeFavouriteMovie} favouriteComponent={RemoveFavourites}/>
  </div>
   </div>
  );
}

export default App;
