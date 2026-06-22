import React, { useState, useEffect } from 'react'
import Card from './Card'
import PlayerHand from './PlayerHand'
import PlayerInfo from './PlayerInfo'
import Leaderboard from './Leaderboard'
import { getCardLabel } from '../utils/cardUtils'

const COLOR_NAMES = ['red', 'blue', 'green', 'yellow']
const COLOR_HEX_MAP = { red: '#e74c3c', blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f' }

export default function GameBoard({
  gameState,
  gameId,
  leaderboard,
  botThinking,
  gameOver,
  isPractice,
  isSimulation,
  onPlayCard,
  onDrawCard,
  onLeave
}) {
  const [showColorPicker, setShowColorPicker] = useState(null)
  const [showGameOver, setShowGameOver] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  useEffect(() => {
    if (gameOver) {
      setShowGameOver(true)
    }
  }, [gameOver])

  if (!gameState) {
    return (
      <div className="game-loading">
        <div className="spinner-card large">🃏</div>
        <p>Loading game...</p>
      </div>
    )
  }

  const myHand = gameState.myHand || []
  const myId = gameState.myId
  const players = gameState.players || []
  const discardTop = gameState.discardTop
  const currentPlayerId = gameState.currentPlayerId
  const direction = gameState.direction
  const deckRemaining = gameState.deckRemaining || 0
  const pendingDraw = gameState.pendingDraw || 0
  const lastAction = gameState.lastAction || ''

  const isMyTurn = currentPlayerId === myId
  const myPlayer = players.find(p => p.id === myId)

  const myPlayableCards = isMyTurn && gameState.myHand
    ? gameState.myHand.filter(c => {
        if (!discardTop) return true
        if (pendingDraw > 0) return c.type === 'draw_two' || c.type === 'draw_four'
        return c.canPlayOn ? c.canPlayOn(discardTop) : true
      })
    : []

  const otherPlayers = players.filter(p => p.id !== myId)

  const handleCardPlay = (cardId) => {
    if (!isMyTurn || isSimulation) return
    const card = gameState.myHand?.find(c => c.id === cardId)
    if (!card) return

    if (card.type === 'wild' || card.type === 'draw_four') {
      setSelectedCard(cardId)
      setShowColorPicker(cardId)
      return
    }

    onPlayCard(gameId, cardId)
  }

  const handleColorChoose = (color) => {
    if (selectedCard) {
      onPlayCard(gameId, selectedCard, color)
    }
    setShowColorPicker(null)
    setSelectedCard(null)
  }

  const canDraw = isMyTurn && !myPlayer?.hasDrawn && pendingDraw === 0

  return (
    <div className="game-board">
      <div className="game-header">
        <div className="game-direction">
          {direction === 1 ? '→' : '←'}
        </div>
        <div className="game-info">
          <span className="game-last-action">{lastAction}</span>
        </div>
        <button
          className="leaderboard-toggle"
          onClick={() => setShowLeaderboard(!showLeaderboard)}
        >
          {showLeaderboard ? '✕' : '🏆'}
        </button>
        <button className="leave-btn" onClick={onLeave}>
          ✕ Leave
        </button>
      </div>

      {showLeaderboard && (
        <div className="leaderboard-panel">
          <Leaderboard leaderboard={leaderboard} />
        </div>
      )}

      <div className="game-players-top">
        {otherPlayers.slice(0, Math.ceil(otherPlayers.length / 2)).map(p => (
          <PlayerInfo
            key={p.id}
            player={p}
            isCurrent={p.id === currentPlayerId}
            cardsRemaining={p.cardsRemaining}
            botThinking={botThinking}
          />
        ))}
      </div>

      <div className="game-center">
        <div className="center-area">
          <div className="draw-pile" onClick={canDraw ? () => onDrawCard(gameId) : undefined}>
            {deckRemaining > 0 ? (
              <div className={`draw-pile-inner ${canDraw ? 'clickable' : ''}`}>
                <span className="draw-count">{deckRemaining}</span>
                <span className="draw-label">DRAW</span>
              </div>
            ) : (
              <div className="draw-pile-inner empty">
                <span>Empty</span>
              </div>
            )}
          </div>

          <div className="discard-pile">
            {discardTop ? (
              <Card
                card={discardTop}
                highlight
                style={{ transform: 'scale(1.1)' }}
              />
            ) : (
              <div className="discard-empty">No cards played</div>
            )}
          </div>
        </div>

        {pendingDraw > 0 && (
          <div className="pending-draw-banner">
            ⚠️ Next player must draw {pendingDraw} card(s)!
          </div>
        )}

        {isSimulation && (
          <div className="simulation-badge">🎬 SIMULATION MODE</div>
        )}

        {isPractice && !isSimulation && (
          <div className="practice-badge">🤖 PRACTICE MODE</div>
        )}
      </div>

      <div className="game-players-bottom">
        {otherPlayers.slice(Math.ceil(otherPlayers.length / 2)).map(p => (
          <PlayerInfo
            key={p.id}
            player={p}
            isCurrent={p.id === currentPlayerId}
            cardsRemaining={p.cardsRemaining}
            botThinking={botThinking}
          />
        ))}
      </div>

      <div className="game-my-area">
        <PlayerHand
          cards={myHand}
          onPlayCard={handleCardPlay}
          disabled={!isMyTurn || isSimulation}
          isMyTurn={isMyTurn}
          isSimulation={isSimulation}
        />
        {canDraw && (
          <button
            className="draw-btn"
            onClick={() => onDrawCard(gameId)}
          >
            Draw Card
          </button>
        )}
        {isSimulation && (
          <div className="spectator-notice">
            👁️ Spectating — bots are playing automatically
          </div>
        )}
      </div>

      {showColorPicker && (
        <div className="color-picker-overlay" onClick={() => setShowColorPicker(null)}>
          <div className="color-picker" onClick={e => e.stopPropagation()}>
            <h3>Choose a color</h3>
            <div className="color-options">
              {COLOR_NAMES.map(color => (
                <button
                  key={color}
                  className="color-btn"
                  style={{ backgroundColor: COLOR_HEX_MAP[color] }}
                  onClick={() => handleColorChoose(color)}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showGameOver && gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <h2 className="game-over-title">Game Over!</h2>
            {gameOver.winner && (
              <div className="winner-display">
                <span className="winner-crown">👑</span>
                <span className="winner-name">{gameOver.winner.name}</span>
                <span className="winner-sub">Last Hand Standing!</span>
              </div>
            )}
            {gameOver.scores && (
              <div className="final-scores">
                <h3>Final Scores</h3>
                {Object.entries(gameOver.scores)
                  .sort(([, a], [, b]) => a - b)
                  .map(([pid, score], i) => {
                    const p = players.find(pl => pl.id === pid)
                    return (
                      <div key={pid} className="score-row">
                        <span>{i + 1}. {p?.name || 'Unknown'}</span>
                        <span className="score-value">{score} pts</span>
                      </div>
                    )
                  })}
              </div>
            )}
            <button className="modal-btn" onClick={onLeave}>
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
