import { useState } from 'react'
import './Legend.css'

const PRICE_TIERS = [
  { label: '<50L', color: '#10b981' },
  { label: '50-80L', color: '#3b82f6' },
  { label: '80L-1.2Cr', color: '#f59e0b' },
  { label: '1.2-2Cr', color: '#ef4444' },
  { label: '2Cr+', color: '#a855f7' },
]

function Legend({ mode, theme = 'dark' }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`legend ${theme} ${expanded ? 'expanded' : ''}`}>
      {/* Collapsed view - just dots */}
      <button 
        className="legend-toggle"
        onClick={() => setExpanded(!expanded)}
        aria-label="Toggle legend"
      >
        <div className="legend-dots">
          {PRICE_TIERS.map(tier => (
            <span 
              key={tier.label}
              className="mini-dot"
              style={{ background: tier.color }}
            ></span>
          ))}
        </div>
        <span className="legend-arrow">{expanded ? '▼' : '▲'}</span>
      </button>

      {/* Expanded view */}
      <div className="legend-content">
        <div className="legend-title">Price Range</div>
        <div className="legend-items">
          {PRICE_TIERS.map(tier => (
            <div key={tier.label} className="legend-item">
              <span 
                className="legend-dot"
                style={{ background: tier.color }}
              ></span>
              <span className="legend-label">{tier.label}</span>
            </div>
          ))}
        </div>
        <div className="legend-hint">Tap area to zoom in</div>
      </div>
    </div>
  )
}

export default Legend
