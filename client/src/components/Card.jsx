import React from 'react'
import { getCardLabel, getCardColor, getCardLightColor } from '../utils/cardUtils'

export default function Card({ card, onClick, disabled, small, faceDown, highlight, style }) {
  if (faceDown) {
    return (
      <div className={`card card-back ${small ? 'card-sm' : ''}`} style={style}>
        <div className="card-back-inner">
          <div className="card-back-pattern">LHS</div>
        </div>
      </div>
    )
  }

  const isWild = card.type === 'wild' || card.type === 'draw_four'
  const bgColor = getCardColor(card)
  const lightColor = getCardLightColor(card)
  const label = getCardLabel(card)

  return (
    <div
      className={`card ${small ? 'card-sm' : ''} ${highlight ? 'card-highlight' : ''} ${disabled ? 'card-disabled' : ''} ${isWild ? 'card-wild' : ''} ${onClick && !disabled ? 'card-clickable' : ''}`}
      onClick={disabled ? undefined : onClick}
      style={{
        ...style,
        '--card-bg': bgColor,
        '--card-light': lightColor,
      }}
    >
      <div className="card-inner">
        <div className="card-corner card-corner-top">
          <span className="card-label">{label}</span>
        </div>
        <div className="card-center">
          <span className="card-symbol">{label}</span>
          {isWild && <div className="card-wild-icon">✦</div>}
        </div>
        <div className="card-corner card-corner-bottom">
          <span className="card-label">{label}</span>
        </div>
      </div>
    </div>
  )
}
