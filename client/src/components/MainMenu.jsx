import React, { useState } from 'react'

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', desc: '500-1500ms delay' },
  { value: 'medium', label: 'Medium', desc: '300-800ms delay' },
  { value: 'hard', label: 'Hard', desc: '100-400ms delay' },
]

const PLAYER_COUNTS = [4, 8, 16, 32]

export default function MainMenu({ onPlayOnline, onPractice, onSimulation }) {
  const [showPractice, setShowPractice] = useState(false)
  const [showSim, setShowSim] = useState(false)
  const [practiceCount, setPracticeCount] = useState(4)
  const [practiceDiff, setPracticeDiff] = useState('medium')
  const [simCount, setSimCount] = useState(8)
  const [simDiff, setSimDiff] = useState('medium')

  const handlePractice = () => {
    onPractice(practiceCount, practiceDiff)
    setShowPractice(false)
  }

  const handleSimulation = () => {
    onSimulation(simCount, simDiff)
    setShowSim(false)
  }

  return (
    <div className="main-menu">
      <div className="menu-bg" />
      <div className="menu-content">
        <div className="menu-title">
          <h1 className="game-title">
            <span className="title-line">LAST</span>
            <span className="title-line accent">HAND</span>
            <span className="title-line">STANDING</span>
          </h1>
          <p className="title-sub">Battle Royale Card Game</p>
        </div>

        <div className="menu-buttons">
          <button className="menu-btn primary" onClick={onPlayOnline}>
            <span className="btn-icon">🌐</span>
            <span className="btn-text">Play Online</span>
            <span className="btn-desc">Matchmake with players</span>
          </button>

          <button className="menu-btn secondary" onClick={() => setShowPractice(true)}>
            <span className="btn-icon">🤖</span>
            <span className="btn-text">Practice Mode</span>
            <span className="btn-desc">Play against AI bots</span>
          </button>

          <button className="menu-btn secondary" onClick={() => setShowSim(true)}>
            <span className="btn-icon">🎬</span>
            <span className="btn-text">Simulation Mode</span>
            <span className="btn-desc">Watch AI battle it out</span>
          </button>
        </div>

        <div className="menu-footer">
          <p>4-32 Players • Original Card Game • Free</p>
        </div>
      </div>

      {showPractice && (
        <div className="modal-overlay" onClick={() => setShowPractice(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Practice Mode</h2>
            <p className="modal-desc">Play against AI opponents</p>

            <div className="modal-section">
              <label>Number of Players</label>
              <div className="player-count-select">
                {PLAYER_COUNTS.map(n => (
                  <button
                    key={n}
                    className={`count-btn ${practiceCount === n ? 'active' : ''}`}
                    onClick={() => setPracticeCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <label>AI Difficulty</label>
              <div className="difficulty-select">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    className={`diff-btn ${practiceDiff === d.value ? 'active' : ''}`}
                    onClick={() => setPracticeDiff(d.value)}
                  >
                    <span className="diff-label">{d.label}</span>
                    <span className="diff-desc">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="modal-btn" onClick={handlePractice}>
              Start Practice Match
            </button>
          </div>
        </div>
      )}

      {showSim && (
        <div className="modal-overlay" onClick={() => setShowSim(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Simulation Mode</h2>
            <p className="modal-desc">Watch AI bots play automatically</p>

            <div className="modal-section">
              <label>Number of Players</label>
              <div className="player-count-select">
                {PLAYER_COUNTS.map(n => (
                  <button
                    key={n}
                    className={`count-btn ${simCount === n ? 'active' : ''}`}
                    onClick={() => setSimCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <label>AI Difficulty</label>
              <div className="difficulty-select">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d.value}
                    className={`diff-btn ${simDiff === d.value ? 'active' : ''}`}
                    onClick={() => setSimDiff(d.value)}
                  >
                    <span className="diff-label">{d.label}</span>
                    <span className="diff-desc">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <button className="modal-btn" onClick={handleSimulation}>
              Start Simulation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
