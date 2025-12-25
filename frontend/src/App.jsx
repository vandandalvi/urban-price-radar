import { useState, useEffect, useRef } from 'react'
import Map from './components/Map'
import Filters from './components/Filters'
import Disclaimer from './components/Disclaimer'
import Header from './components/Header'
import './App.css'

// Static JSON - no backend needed!
const API_URL = '/data/prices.json'

function App() {
  const [priceData, setPriceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Filter state
  const [mode, setMode] = useState('buy') // 'buy' | 'rent'
  const [propertyType, setPropertyType] = useState('2bhk') // '1rk' | '1bhk' | '2bhk' | '3bhk_plus'
  const [budgetRange, setBudgetRange] = useState(null) // { min, max } or null for all
  const [priceUnit, setPriceUnit] = useState('total') // 'total' | 'sqft'
  
  // UI state
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [selectedArea, setSelectedArea] = useState(null) // For search selection
  
  // Theme state - initialize from system preference
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  })
  
  // Map ref for programmatic control
  const mapRef = useRef(null)

  // Save theme preference
  useEffect(() => {
    localStorage.setItem('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  useEffect(() => {
    fetchPrices()
  }, [])

  const fetchPrices = async () => {
    try {
      setLoading(true)
      const response = await fetch(API_URL)
      if (!response.ok) {
        throw new Error('Failed to fetch price data')
      }
      const data = await response.json()
      setPriceData(data)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching prices:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter areas based on current selections
  const filteredAreas = priceData?.areas?.map(area => {
    const prices = area[mode]?.[propertyType]
    if (!prices) return { ...area, visible: false, priceRange: null }
    
    // Check budget filter
    let withinBudget = true
    if (budgetRange) {
      const areaMin = prices.min
      const areaMax = prices.max
      // Area is within budget if ranges overlap
      withinBudget = areaMin <= budgetRange.max && areaMax >= budgetRange.min
    }
    
    return {
      ...area,
      visible: withinBudget,
      priceRange: prices,
      withinBudget
    }
  }) || []

  if (loading) {
    return (
      <div className="app loading">
        <div className="loader">
          <div className="loader-icon">🏠</div>
          <p>Loading Mumbai price data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app error">
        <div className="error-message">
          <h2>⚠️ Unable to load data</h2>
          <p>{error}</p>
          <button onClick={fetchPrices}>Try Again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app" data-theme={theme}>
      <Header 
        areas={priceData?.areas || []}
        onAreaSelect={setSelectedArea}
        theme={theme}
        onThemeToggle={toggleTheme}
      />
      
      <Filters
        mode={mode}
        setMode={setMode}
        propertyType={propertyType}
        setPropertyType={setPropertyType}
        budgetRange={budgetRange}
        setBudgetRange={setBudgetRange}
        priceUnit={priceUnit}
        setPriceUnit={setPriceUnit}
        isRent={mode === 'rent'}
      />
      
      <Map
        ref={mapRef}
        areas={filteredAreas}
        mode={mode}
        propertyType={propertyType}
        priceUnit={priceUnit}
        theme={theme}
        selectedArea={selectedArea}
        onSelectedAreaClear={() => setSelectedArea(null)}
      />
      
      {showDisclaimer && (
        <Disclaimer 
          text={priceData?.disclaimer}
          onClose={() => setShowDisclaimer(false)}
        />
      )}
      
      <DataInfo 
        version={priceData?.version}
        generatedAt={priceData?.generated_at}
        visibleCount={filteredAreas.filter(a => a.visible).length}
        totalCount={filteredAreas.length}
      />
    </div>
  )
}

// Format date for display
function formatUpdateDate(dateString) {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  } catch {
    return null
  }
}

function DataInfo({ version, generatedAt, visibleCount, totalCount }) {
  const updateDate = formatUpdateDate(generatedAt)
  
  return (
    <div className="data-info">
      {updateDate && (
        <>
          <span className="update-badge">
            <span className="update-icon">🔄</span>
            Updated {updateDate}
          </span>
          <span className="separator">•</span>
        </>
      )}
      <span>{visibleCount} / {totalCount} areas</span>
      <span className="separator">•</span>
      <span className="version">v{version}</span>
    </div>
  )
}

export default App
