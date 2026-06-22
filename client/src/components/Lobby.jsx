import React from 'react'

export default function Lobby({ matchmakingStatus, onLeaveQueue }) {
  if (!matchmakingStatus) return null

  return (
    <div className="lobby-overlay">
      <div className="lobby">
        <div className="lobby-spinner">
          <div className="spinner-card">🃏</div>
        </div>
        <h2 className="lobby-title">Finding Players</h2>
        <p className="lobby-status">
          {matchmakingStatus.inQueue
            ? `${matchmakingStatus.queuedPlayers} / ${matchmakingStatus.targetSize} players found`
            : 'Searching...'}
        </p>
        <div className="lobby-bar">
          <div
            className="lobby-bar-fill"
            style={{
              width: matchmakingStatus.targetSize
                ? `${(matchmakingStatus.queuedPlayers / matchmakingStatus.targetSize) * 100}%`
                : '0%'
            }}
          />
        </div>
        <p className="lobby-hint">
          {matchmakingStatus.queuedPlayers < matchmakingStatus.targetSize
            ? 'Waiting for more players... Bots will fill empty slots.'
            : 'Starting game...'}
        </p>
        <button className="lobby-cancel" onClick={onLeaveQueue}>
          Cancel
        </button>
      </div>
    </div>
  )
}
