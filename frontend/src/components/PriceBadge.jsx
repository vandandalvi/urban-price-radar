import { Marker, Popup, useMap } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { useMemo, useState, useEffect, useRef } from 'react'
import './PriceBadge.css'

// Typical sizes in sqft for different property types
const TYPICAL_SIZES = {
  '1rk': 350,
  '1bhk': 550,
  '2bhk': 850,
  '3bhk_plus': 1400
}

/**
 * Format price for display (compact)
 */
function formatPrice(price, isRent = false) {
  if (isRent) {
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`
    return `₹${Math.round(price / 1000)}K`
  }
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`
  return `₹${(price / 100000).toFixed(0)}L`
}

/**
 * Format price per sqft
 */
function formatPricePerSqft(price, propertyType, isRent = false) {
  const size = TYPICAL_SIZES[propertyType] || 850
  const perSqft = Math.round(price / size)
  
  if (isRent) {
    return `₹${perSqft}`
  }
  if (perSqft >= 100000) return `₹${(perSqft / 1000).toFixed(0)}K`
  if (perSqft >= 10000) return `₹${(perSqft / 1000).toFixed(1)}K`
  return `₹${perSqft}`
}

/**
 * Format price for dot label (super compact - no decimals for Cr)
 */
function formatPriceCompact(price, priceUnit = 'total', propertyType = '2bhk') {
  if (priceUnit === 'sqft') {
    const size = TYPICAL_SIZES[propertyType] || 850
    const perSqft = Math.round(price / size)
    if (perSqft >= 10000) return `${(perSqft / 1000).toFixed(0)}K`
    return `${(perSqft / 1000).toFixed(1)}K`
  }
  
  if (price >= 10000000) {
    const cr = price / 10000000
    return cr >= 10 ? `${Math.round(cr)}Cr` : `${cr.toFixed(1)}Cr`
  }
  if (price >= 100000) return `${Math.round(price / 100000)}L`
  return `${Math.round(price / 1000)}K`
}

/**
 * Get confidence color class
 */
function getConfidenceClass(confidence) {
  switch (confidence) {
    case 'high': return 'confidence-high'
    case 'medium': return 'confidence-medium'
    case 'low': return 'confidence-low'
    default: return 'confidence-medium'
  }
}

/**
 * Get price tier color for dots
 */
function getPriceTier(price) {
  if (price >= 20000000) return 'tier-ultra'      // 2Cr+ ultra premium
  if (price >= 12000000) return 'tier-premium'    // 1.2Cr-2Cr premium
  if (price >= 8000000) return 'tier-high'        // 80L-1.2Cr high
  if (price >= 5000000) return 'tier-mid'         // 50L-80L mid
  return 'tier-affordable'                         // Under 50L affordable
}

/**
 * Get confidence tooltip text
 */
function getConfidenceTooltip(confidence) {
  switch (confidence) {
    case 'high': return 'Strong consensus across sources'
    case 'medium': return 'Multiple recent listings'
    case 'low': return 'Sparse or inconsistent listings'
    default: return ''
  }
}

/**
 * Get target zoom level when clicking on an area
 */
function getTargetZoom(zoomLevel, currentZoom) {
  switch (zoomLevel) {
    case 'country': return 8    // Zoom into state level
    case 'state': return 11     // Zoom into city/area level
    case 'city': return 12      // Zoom into detailed areas
    case 'region': return 14    // Zoom into micro level
    case 'area': return 14      // Zoom into micro level
    case 'micro': return 16     // Max detail
    default: return currentZoom + 2
  }
}

function PriceBadge({ area, mode, propertyType, priceUnit = 'total' }) {
  const map = useMap()
  const [currentZoom, setCurrentZoom] = useState(map.getZoom())
  const [isHovered, setIsHovered] = useState(false)
  const markerRef = useRef(null)
  
  const isRent = mode === 'rent'
  const priceData = area.priceRange
  
  // Listen for zoom changes
  useEffect(() => {
    const handleZoom = () => {
      setCurrentZoom(map.getZoom())
    }
    map.on('zoomend', handleZoom)
    return () => map.off('zoomend', handleZoom)
  }, [map])

  // Add hover listeners to marker
  useEffect(() => {
    const marker = markerRef.current
    if (marker) {
      const el = marker.getElement()
      if (el) {
        const handleMouseEnter = () => setIsHovered(true)
        const handleMouseLeave = () => setIsHovered(false)
        el.addEventListener('mouseenter', handleMouseEnter)
        el.addEventListener('mouseleave', handleMouseLeave)
        return () => {
          el.removeEventListener('mouseenter', handleMouseEnter)
          el.removeEventListener('mouseleave', handleMouseLeave)
        }
      }
    }
  }, [markerRef.current])
  
  // Determine if this area should be visible at current zoom
  const shouldShow = useMemo(() => {
    if (!area.visible) return false
    
    const zoomLevel = area.zoom_level
    
    // Country-level markers - show when fully zoomed out
    if (zoomLevel === 'country') return currentZoom < 7
    
    // State-level markers - show when zoomed out
    if (zoomLevel === 'state') return currentZoom >= 7 && currentZoom < 10
    
    // City-level markers - show when zoomed out
    if (zoomLevel === 'city') return currentZoom < 11
    
    // Region markers - show at zoom 11+
    if (zoomLevel === 'region') return currentZoom >= 11
    
    // Area markers - show at zoom 11+
    if (zoomLevel === 'area') return currentZoom >= 11
    
    // Micro markers - show only at high zoom
    if (zoomLevel === 'micro') return currentZoom >= 14
    
    return false
  }, [area.visible, area.zoom_level, currentZoom])

  // Determine if we should show dot or full badge
  // At lower zooms, show dots. At higher zooms or on hover, show badge
  const showAsDot = useMemo(() => {
    // City/state/country level always show as badges (they're few)
    if (['city', 'state', 'country'].includes(area.zoom_level)) return false
    
    // At zoom 14+, show badges for visible items
    if (currentZoom >= 14) return false
    
    // Otherwise show as dot (unless hovered)
    return !isHovered
  }, [area.zoom_level, currentZoom, isHovered])
  
  // Create custom div icon
  const icon = useMemo(() => {
    if (!priceData) return null
    
    const priceTier = getPriceTier(priceData.min)
    const confidenceClass = getConfidenceClass(priceData.confidence)
    const visibilityClass = area.withinBudget ? '' : 'outside-budget'
    
    // DOT MODE - compact colored dot with price
    if (showAsDot) {
      const priceLabel = formatPriceCompact(priceData.min, priceUnit, propertyType)
      const html = `
        <div class="price-dot ${priceTier} ${confidenceClass} ${visibilityClass}">
          <span class="dot-price">${priceLabel}</span>
        </div>
      `
      return divIcon({
        html,
        className: 'price-dot-wrapper',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      })
    }
    
    // BADGE MODE - full info
    let minPrice, maxPrice
    if (priceUnit === 'sqft') {
      minPrice = formatPricePerSqft(priceData.min, propertyType, isRent)
      maxPrice = formatPricePerSqft(priceData.max, propertyType, isRent)
    } else {
      minPrice = formatPrice(priceData.min, isRent)
      maxPrice = formatPrice(priceData.max, isRent)
    }
    
    const unitLabel = priceUnit === 'sqft' ? '/sqft' : ''
    
    let levelClass = ''
    if (area.zoom_level === 'city') levelClass = 'city-level'
    else if (area.zoom_level === 'state') levelClass = 'state-level'
    else if (area.zoom_level === 'country') levelClass = 'country-level'

    const html = `
      <div class="price-badge ${confidenceClass} ${visibilityClass} ${levelClass} ${isHovered ? 'hovered' : ''}">
        <div class="price-badge-name">${area.name}</div>
        <div class="price-badge-range">${minPrice} - ${maxPrice}${unitLabel ? `<span class="unit-label">${unitLabel}</span>` : ''}</div>
        <div class="price-badge-confidence">${priceData.confidence}</div>
      </div>
    `
    
    // Icon sizes large enough to contain content
    let iconSize, iconAnchor
    if (area.zoom_level === 'city') {
      iconSize = [130, 55]
      iconAnchor = [65, 27]
    } else if (area.zoom_level === 'state') {
      iconSize = [120, 50]
      iconAnchor = [60, 25]
    } else if (area.zoom_level === 'country') {
      iconSize = [110, 48]
      iconAnchor = [55, 24]
    } else {
      iconSize = [130, 55]
      iconAnchor = [65, 27]
    }
    
    return divIcon({
      html,
      className: 'price-badge-wrapper',
      iconSize,
      iconAnchor
    })
  }, [priceData, isRent, area.name, area.withinBudget, area.zoom_level, showAsDot, isHovered, priceUnit, propertyType])

  if (!shouldShow || !icon) {
    return null
  }

  // Handle click to zoom into the area
  const handleClick = () => {
    const targetZoom = getTargetZoom(area.zoom_level, currentZoom)
    map.flyTo([area.lat, area.lng], targetZoom, {
      duration: 0.8  // Smooth animation
    })
  }
  
  return (
    <Marker 
      ref={markerRef}
      position={[area.lat, area.lng]} 
      icon={icon}
      eventHandlers={{
        mouseover: () => setIsHovered(true),
        mouseout: () => setIsHovered(false),
        click: handleClick
      }}
    >
      <Popup className="price-popup">
        <div className="popup-content">
          <h3>{area.name}</h3>
          <p className="popup-region">{area.region}</p>
          
          <div className="popup-prices">
            <div className="popup-price-row">
              <span className="popup-label">{isRent ? 'Rent' : 'Buy'} ({propertyType.replace('_', ' ').toUpperCase()})</span>
              <span className="popup-value">
                {formatPrice(priceData.min, isRent)} - {formatPrice(priceData.max, isRent)}
                {isRent ? '/mo' : ''}
              </span>
            </div>
          </div>
          
          <div className={`popup-confidence ${getConfidenceClass(priceData.confidence)}`}>
            <span className="confidence-dot"></span>
            <span>{priceData.confidence} confidence</span>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

export default PriceBadge
