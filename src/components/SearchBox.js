import React from 'react';
import './SearchBox.css';

const SearchBox = (props) => {
  return (
    <div className='searchbox'>
    <span><i class="fa fa-search" aria-hidden="true"></i></span>
     <input placeholder='type to search....' value={props.value} onChange={(event)=>props.setSearchValue(event.target.value)}></input>
     </div>
  )
}

export default SearchBox