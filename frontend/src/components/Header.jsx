import SearchBar from './SearchBar'
import './Header.css'

function Header({ areas, onAreaSelect, theme, onThemeToggle }) {
  return (
    <header className="header" data-theme={theme}>
      <div className="header-brand">
        <span className="header-logo">📍</span>
        <div className="header-text">
          <h1>Price Radar</h1>
        </div>
      </div>
      
      <SearchBar areas={areas} onSelect={onAreaSelect} />
      
      <div className="header-actions">
        <button 
          className="theme-toggle" 
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="header-badge">
          <span>MH</span>
        </div>
      </div>
    </header>
  )
}

export default Header
