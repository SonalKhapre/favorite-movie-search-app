import React from 'react';
import './SearchBox.css';

const SearchBox = ({ searchValue, setSearchValue }) => {
  return (
    <div className="searchbox">
      <span><i className="fa fa-search" aria-hidden="true"></i></span>
      <input
        placeholder="type to search..."
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        aria-label="Search movies"
      />
    </div>
  );
};

export default SearchBox;
