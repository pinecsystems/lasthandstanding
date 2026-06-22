import React from 'react'
import { getPersonalityLabel } from '../utils/cardUtils'

export default function PlayerInfo({ player, isCurrent, cardsRemaining, botThinking }) {
  const isBot = player.isBot
  const isThinking = botThinking && botThinking.botId === player.id
  const outOfCards = cardsRemaining === 0 && !player.isOut

  return (
    <div className={`player-info ${isCurrent ? 'current-turn' : ''} ${player.isOut ? 'eliminated' : ''} ${isThinking ? 'thinking' : ''}`}>
      <div className="player-info-avatar">
        {isBot ? '🤖' : '👤'}
        {player.calledLastHand && <span className="last-hand-badge">LH</span>}
      </div>
      <div className="player-info-details">
        <div className="player-info-name">
          {isBot && <span className="bot-tag">[BOT]</span>}
          <span className={`name-text ${player.isOut ? 'out-text' : ''}`}>{player.name}</span>
        </div>
        <div className="player-info-stats">
          <span className="card-count">{player.cardsRemaining || cardsRemaining} cards</span>
          {player.isOut && <span className="eliminated-tag">ELIMINATED</span>}
          {player.personality && (
            <span className={`personality-tag ${player.personality}`}>
              {getPersonalityLabel(player.personality)}
            </span>
          )}
        </div>
      </div>
      {isThinking && (
        <div className="thinking-indicator">
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
          <span className="thinking-dot">.</span>
        </div>
      )}
    </div>
  )
}
