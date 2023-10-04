import React from 'react'
import './MovieHeading.css'

const MovieHeading = (props) => {
  return (
    <div className='heading'>
        <h1>{props.heading}</h1>
    </div>
  )
}

export default MovieHeading