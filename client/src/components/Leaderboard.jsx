import React from 'react'

export default function Leaderboard({ leaderboard }) {
  if (!leaderboard || leaderboard.length === 0) return null

  const sorted = [...leaderboard].sort((a, b) => {
    if (a.isOut && b.isOut) return 0
    if (a.isOut) return 1
    if (b.isOut) return -1
    return a.cardsRemaining - b.cardsRemaining
  })

  const topCards = sorted[0]?.cardsRemaining ?? 0

  return (
    <div className="leaderboard">
      <h3 className="leaderboard-title">Leaderboard</h3>
      <div className="leaderboard-list">
        {sorted.map((entry, i) => (
          <div
            key={entry.id}
            className={`leaderboard-entry ${i === 0 && !entry.isOut ? 'leader' : ''} ${entry.isOut ? 'out' : ''}`}
          >
            <span className="entry-rank">
              {entry.isOut ? '✗' : `#${i + 1}`}
            </span>
            <span className="entry-name">
              {entry.isBot && <span className="bot-indicator">[BOT]</span>}
              {entry.name}
            </span>
            <span className="entry-cards">
              {entry.isOut ? (
                <span className="eliminated-badge">OUT</span>
              ) : (
                <>
                  <span className="card-icon">🃏</span>
                  <span className="card-count">{entry.cardsRemaining}</span>
                </>
              )}
            </span>
            {i === 0 && !entry.isOut && (
              <span className="leader-crown">👑</span>
            )}
            {i === 0 && !entry.isOut && entry.cardsRemaining === 0 && (
              <span className="winner-flash">🏆</span>
            )}
          </div>
        ))}
      </div>
      <div className="leaderboard-min-cards">
        Best: {topCards > 0 ? `${topCards} cards` : topCards === 0 ? 'WINNER!' : '—'}
      </div>
    </div>
  )
}
