import { useState, useRef, useEffect } from 'react'
import './SearchBar.css'

function formatPrice(price) {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`
  return `₹${Math.round(price / 1000)}K`
}

function SearchBar({ areas, onSelect }) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Filter suggestions based on query
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }

    const q = query.toLowerCase()
    const matches = areas
      .filter(area => 
        area.name.toLowerCase().includes(q) ||
        area.region?.toLowerCase().includes(q)
      )
      .slice(0, 8) // Limit to 8 suggestions

    setSuggestions(matches)
    setSelectedIndex(-1)
  }, [query, areas])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (area) => {
    setQuery('') // Clear search after selection
    setIsOpen(false)
    setSuggestions([])
    onSelect(area)
  }

  const handleKeyDown = (e) => {
    if (!suggestions.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  // Get price info for an area
  const getAreaPrice = (area) => {
    const buyPrice = area.buy?.['2bhk']
    if (buyPrice) {
      return `${formatPrice(buyPrice.min)} - ${formatPrice(buyPrice.max)}`
    }
    return null
  }

  return (
    <div className="search-container" ref={containerRef}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search areas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button className="search-clear" onClick={handleClear}>
            ✕
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="search-suggestions">
          {suggestions.map((area, index) => (
            <li
              key={area.id}
              className={`search-suggestion ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(area)}
            >
              <div className="suggestion-main">
                <span className="suggestion-name">{area.name}</span>
                {area.region && (
                  <span className="suggestion-region">{area.region}</span>
                )}
              </div>
              {getAreaPrice(area) && (
                <span className="suggestion-price">{getAreaPrice(area)}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.length >= 2 && suggestions.length === 0 && (
        <div className="search-no-results">
          No areas found for "{query}"
        </div>
      )}
    </div>
  )
}

export default SearchBar
