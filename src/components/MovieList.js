import React from 'react'
import './MovieList.css'


const Movielist = (props) => {
  const FavouriteComponent = props.favouriteComponent
  return (
    <>
    <div className='movie-container' >
        {props.movies.map((movie)=>(
            <div className='div image-container'>
                <img  key={movie.id} src={movie.Poster} alt='movie' height={350} width={250}></img>
                <div className='overlay' onClick={ () => props.handleFavouriteClicks(movie)}>
                <FavouriteComponent/>
                </div>
            </div>
           
        ))}
       
    </div>
    </>
  )
}

export default Movielist