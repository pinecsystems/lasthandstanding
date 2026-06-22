import React from 'react'
import Card from './Card'

export default function PlayerHand({ cards, onPlayCard, disabled, isMyTurn, isSimulation }) {
  if (!cards || cards.length === 0) {
    return (
      <div className="player-hand empty-hand">
        <span className="hand-label">Your Hand</span>
        <div className="hand-cards empty">No cards</div>
      </div>
    )
  }

  return (
    <div className={`player-hand ${isMyTurn ? 'my-turn' : ''}`}>
      <span className="hand-label">
        Your Hand ({cards.length})
        {isMyTurn && <span className="turn-indicator">◄ YOUR TURN ►</span>}
      </span>
      <div className="hand-cards">
        {cards.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            onClick={() => onPlayCard?.(card.id)}
            disabled={disabled || !isMyTurn || isSimulation}
            style={{ '--card-index': i }}
          />
        ))}
      </div>
    </div>
  )
}
