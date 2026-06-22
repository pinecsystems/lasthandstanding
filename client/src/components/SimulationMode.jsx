import React, { useEffect, useState } from 'react'
import Card from './Card'
import Leaderboard from './Leaderboard'

export default function SimulationMode({
  gameState,
  leaderboard,
  botThinking,
  gameOver,
  onLeave
}) {
  const [watchTarget, setWatchTarget] = useState(null)
  const [currentLeader, setCurrentLeader] = useState(null)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (leaderboard && leaderboard.length > 0) {
      const top = leaderboard
        .filter(e => !e.isOut)
        .sort((a, b) => a.cardsRemaining - b.cardsRemaining)[0]
      if (top) {
        setCurrentLeader(top)
        setWatchTarget(top.id)
      }
    }
  }, [leaderboard])

  if (!gameState) {
    return (
      <div className="game-loading">
        <div className="spinner-card large">🃏</div>
        <p>Starting simulation...</p>
      </div>
    )
  }

  const discardTop = gameState.discardTop
  const currentPlayerId = gameState.currentPlayerId
  const lastAction = gameState.lastAction || ''
  const players = gameState.players || []
  const deckRemaining = gameState.deckRemaining || 0

  const watchedPlayer = watchTarget
    ? players.find(p => p.id === watchTarget)
    : null

  const leaderboardPlayers = [...(leaderboard || [])]
    .sort((a, b) => {
      if (a.isOut && b.isOut) return 0
      if (a.isOut) return 1
      if (b.isOut) return -1
      return a.cardsRemaining - b.cardsRemaining
    })

  return (
    <div className="simulation-mode">
      <div className="sim-header">
        <div className="sim-title">🎬 Simulation Mode</div>
        <div className="sim-controls">
          <button
            className={`speed-btn ${speed === 1 ? 'active' : ''}`}
            onClick={() => setSpeed(1)}
          >
            1×
          </button>
          <button
            className={`speed-btn ${speed === 2 ? 'active' : ''}`}
            onClick={() => setSpeed(2)}
          >
            2×
          </button>
          <button
            className={`speed-btn ${speed === 4 ? 'active' : ''}`}
            onClick={() => setSpeed(4)}
          >
            4×
          </button>
        </div>
        <button className="leave-btn" onClick={onLeave}>
          ✕ Leave
        </button>
      </div>

      <div className="sim-body">
        <div className="sim-center">
          <div className="sim-discard">
            {discardTop ? (
              <Card card={discardTop} highlight style={{ transform: 'scale(1.3)' }} />
            ) : (
              <div className="discard-empty">Waiting...</div>
            )}
          </div>
          <div className="sim-deck-info">
            🃏 {deckRemaining} cards remaining
          </div>
          <div className="sim-last-action">{lastAction}</div>

          {botThinking && (
            <div className="sim-thinking">
              🤖 {botThinking.botName} is thinking{'.'.repeat((Date.now() / 500) % 4)}
            </div>
          )}

          <div className="sim-current-turn">
            Current turn: <strong>{players.find(p => p.id === currentPlayerId)?.name || '—'}</strong>
          </div>
        </div>

        <div className="sim-sidebar">
          <div className="sim-spectator-cam">
            <h3>👁️ Spectator Cam</h3>
            {currentLeader && (
              <div className="spectator-target">
                Following: <strong>{currentLeader.name}</strong> ({currentLeader.cardsRemaining} cards)
              </div>
            )}
          </div>

          {watchedPlayer && (
            <div className="watched-player-info">
              <h4>{watchedPlayer.name}'s Hand</h4>
              <div className="watched-hand">
                {watchedPlayer.hand?.map(card => (
                  <Card key={card.id} card={card} small />
                ))}
              </div>
            </div>
          )}

          <Leaderboard leaderboard={leaderboard} />
        </div>
      </div>
    </div>
  )
}
