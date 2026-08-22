import { useEffect, useRef, useState } from 'react';

const DEBOUNCE_MS = 300;

export default function SearchBar({ onSearch, resultCount, showCount, placeholder }) {
  const [value, setValue] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(value), DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [value, onSearch]);

  return (
    <div className="search-bar">
      <svg className="search-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || 'Search titles and descriptions'}
        aria-label="Search"
      />
      {showCount && value && (
        <span className="search-count">
          {resultCount} match{resultCount === 1 ? '' : 'es'}
        </span>
      )}
    </div>
  );
}
