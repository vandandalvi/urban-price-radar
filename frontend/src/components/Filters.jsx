import { useState } from 'react'
import './Filters.css'

// Budget presets with colors
const BUY_BUDGETS = [
  { label: '<50L', fullLabel: 'Under ₹50L', min: 0, max: 5000000, color: '#10b981' },
  { label: '50-80L', fullLabel: '₹50L - 80L', min: 5000000, max: 8000000, color: '#3b82f6' },
  { label: '80L-1.2Cr', fullLabel: '₹80L - 1.2Cr', min: 8000000, max: 12000000, color: '#f59e0b' },
  { label: '1.2-2Cr', fullLabel: '₹1.2Cr - 2Cr', min: 12000000, max: 20000000, color: '#ef4444' },
  { label: '2Cr+', fullLabel: '₹2Cr+', min: 20000000, max: 999999999, color: '#a855f7' },
]

const RENT_BUDGETS = [
  { label: '<20K', fullLabel: 'Under ₹20K', min: 0, max: 20000, color: '#10b981' },
  { label: '20-40K', fullLabel: '₹20K - 40K', min: 20000, max: 40000, color: '#3b82f6' },
  { label: '40-70K', fullLabel: '₹40K - 70K', min: 40000, max: 70000, color: '#f59e0b' },
  { label: '70K-1L', fullLabel: '₹70K - 1L', min: 70000, max: 100000, color: '#ef4444' },
  { label: '1L+', fullLabel: '₹1L+', min: 100000, max: 999999999, color: '#a855f7' },
]

const PROPERTY_TYPES = [
  { value: '1bhk', label: '1BHK' },
  { value: '2bhk', label: '2BHK' },
  { value: '3bhk_plus', label: '3BHK+' },
]

function Filters({
  mode,
  setMode,
  propertyType,
  setPropertyType,
  budgetRange,
  setBudgetRange,
  priceUnit,
  setPriceUnit,
  isRent
}) {
  const [expanded, setExpanded] = useState(false)
  const budgets = isRent ? RENT_BUDGETS : BUY_BUDGETS

  const handleBudgetClick = (budget) => {
    if (budgetRange?.min === budget.min && budgetRange?.max === budget.max) {
      setBudgetRange(null)
    } else {
      setBudgetRange(budget)
    }
  }

  const isBudgetActive = (budget) => {
    return budgetRange?.min === budget.min && budgetRange?.max === budget.max
  }

  return (
    <div className={`filters ${expanded ? 'expanded' : ''}`}>
      {/* Main filter row - always visible */}
      <div className="filters-main">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'buy' ? 'active' : ''}`}
            onClick={() => { setMode('buy'); setBudgetRange(null); }}
          >
            Buy
          </button>
          <button
            className={`mode-btn ${mode === 'rent' ? 'active' : ''}`}
            onClick={() => { setMode('rent'); setBudgetRange(null); }}
          >
            Rent
          </button>
        </div>

        {/* Property Type - horizontal scroll on mobile */}
        <div className="property-types">
          {PROPERTY_TYPES.map(type => (
            <button
              key={type.value}
              className={`type-btn ${propertyType === type.value ? 'active' : ''}`}
              onClick={() => setPropertyType(type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Expand button for budget */}
        <button 
          className={`expand-btn ${expanded ? 'active' : ''} ${budgetRange ? 'has-filter' : ''}`}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="expand-icon">₹</span>
          {budgetRange && <span className="filter-dot"></span>}
        </button>

        {/* Price unit toggle */}
        <div className="unit-toggle">
          <button
            className={`unit-btn ${priceUnit === 'total' ? 'active' : ''}`}
            onClick={() => setPriceUnit('total')}
            title="Total price"
          >
            Total
          </button>
          <button
            className={`unit-btn ${priceUnit === 'sqft' ? 'active' : ''}`}
            onClick={() => setPriceUnit('sqft')}
            title="Price per sqft"
          >
            /sqft
          </button>
        </div>
      </div>

      {/* Budget panel - expandable */}
      <div className="filters-budget">
        <div className="budget-header">
          <span className="budget-title">Budget Range</span>
          {budgetRange && (
            <button className="clear-btn" onClick={() => setBudgetRange(null)}>
              Clear
            </button>
          )}
        </div>
        <div className="budget-grid">
          {budgets.map(budget => (
            <button
              key={budget.label}
              className={`budget-btn ${isBudgetActive(budget) ? 'active' : ''}`}
              onClick={() => handleBudgetClick(budget)}
              style={{ '--budget-color': budget.color }}
            >
              <span className="budget-dot" style={{ background: budget.color }}></span>
              <span className="budget-label">{budget.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Filters
