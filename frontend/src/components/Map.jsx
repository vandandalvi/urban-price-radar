import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import PriceBadge from './PriceBadge'
import Legend from './Legend'
import 'leaflet/dist/leaflet.css'
import './Map.css'

// Maharashtra center - adjusted for better mobile view
const MAHARASHTRA_CENTER = [19.2, 73.2] // Slightly east to center Mumbai region
const DESKTOP_ZOOM = 7
const MOBILE_ZOOM = 8 // Closer zoom for mobile to see Maharashtra clearly

// Detect mobile
const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768

// Quick locations for FAB menu
const QUICK_LOCATIONS = [
  { name: 'Mumbai', center: [19.076, 72.8777], zoom: 11, icon: '🏙️' },
  { name: 'Pune', center: [18.5204, 73.8567], zoom: 11, icon: '🌆' },
  { name: 'Thane', center: [19.2183, 72.9781], zoom: 12, icon: '🏘️' },
]

// Map tile URLs
const MAP_TILES = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
}

// Component to handle flying to selected area from search
function FlyToArea({ selectedArea, onClear }) {
  const map = useMap()
  
  useEffect(() => {
    if (selectedArea && selectedArea.lat && selectedArea.lng) {
      // Fly to the area with smooth animation
      map.flyTo([selectedArea.lat, selectedArea.lng], 14, { duration: 1 })
      // Clear selection after animation completes
      setTimeout(() => onClear?.(), 1200)
    }
  }, [selectedArea, map, onClear])
  
  return null
}

// Floating controls inside map
function MapControls() {
  const map = useMap()
  const [showLocations, setShowLocations] = useState(false)
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const handleZoom = () => setZoom(Math.round(map.getZoom()))
    map.on('zoomend', handleZoom)
    return () => map.off('zoomend', handleZoom)
  }, [map])

  const handleZoomIn = () => map.zoomIn()
  const handleZoomOut = () => map.zoomOut()
  const handleReset = () => {
    const zoom = isMobile() ? MOBILE_ZOOM : DESKTOP_ZOOM
    map.flyTo(MAHARASHTRA_CENTER, zoom, { duration: 0.5 })
  }
  const handleLocation = (loc) => {
    map.flyTo(loc.center, loc.zoom, { duration: 0.5 })
    setShowLocations(false)
  }

  return (
    <>
      {/* Zoom controls - right side, thumb reachable */}
      <div className="map-zoom-controls">
        <button className="zoom-btn" onClick={handleZoomIn} aria-label="Zoom in">+</button>
        <span className="zoom-level">{zoom}</span>
        <button className="zoom-btn" onClick={handleZoomOut} aria-label="Zoom out">−</button>
      </div>

      {/* Quick location FAB - bottom right */}
      <div className="map-fab-container">
        {showLocations && (
          <div className="fab-menu">
            {QUICK_LOCATIONS.map(loc => (
              <button 
                key={loc.name}
                className="fab-menu-item"
                onClick={() => handleLocation(loc)}
              >
                <span>{loc.icon}</span>
                <span>{loc.name}</span>
              </button>
            ))}
          </div>
        )}
        <button 
          className={`fab-btn ${showLocations ? 'active' : ''}`}
          onClick={() => setShowLocations(!showLocations)}
          aria-label="Quick locations"
        >
          📍
        </button>
      </div>

      {/* Reset button - bottom left */}
      <button className="reset-btn" onClick={handleReset} aria-label="Reset view">
        ↺
      </button>
    </>
  )
}

function Map({ areas, mode, propertyType, priceUnit, theme, selectedArea, onSelectedAreaClear }) {
  const tileUrl = MAP_TILES[theme]
  const initialZoom = isMobile() ? MOBILE_ZOOM : DESKTOP_ZOOM

  return (
    <div className="map-container" data-theme={theme}>
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={initialZoom}
        className="leaflet-map"
        zoomControl={false}
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
      >
        <TileLayer
          attribution='&copy; OSM &copy; CARTO'
          url={tileUrl}
          key={theme}
        />
        
        <MapControls />
        <FlyToArea selectedArea={selectedArea} onClear={onSelectedAreaClear} />
        
        {areas.map(area => (
          <PriceBadge
            key={area.id}
            area={area}
            mode={mode}
            propertyType={propertyType}
            priceUnit={priceUnit}
          />
        ))}
      </MapContainer>
      
      <Legend mode={mode} theme={theme} />
    </div>
  )
}

export default Map
