import './Disclaimer.css'

function Disclaimer({ text, onClose }) {
  const defaultText = "Prices shown are indicative bands based on recent public listings, not verified transactions."
  
  return (
    <div className="disclaimer slide-up">
      <div className="disclaimer-icon">ℹ️</div>
      <p className="disclaimer-text">{text || defaultText}</p>
      <button className="disclaimer-close" onClick={onClose} aria-label="Close disclaimer">
        ✕
      </button>
    </div>
  )
}

export default Disclaimer
