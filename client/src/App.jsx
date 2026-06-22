import React, { useState, useCallback, useEffect } from 'react'
import { useSocket } from './hooks/useSocket'
import MainMenu from './components/MainMenu'
import Lobby from './components/Lobby'
import GameBoard from './components/GameBoard'
import SimulationMode from './components/SimulationMode'

const PLAYER_COUNTS = [4, 8, 16, 32]

export default function App() {
  const {
    connected,
    gameState,
    matchmakingStatus,
    leaderboard,
    gameStarted,
    gameId,
    botThinking,
    error,
    gameOver,
    isPractice,
    isSimulation,
    joinQueue,
    leaveQueue,
    startPractice,
    startSimulation,
    playCard,
    drawCard,
    requestGameState,
    reset
  } = useSocket()

  const [screen, setScreen] = useState('menu')
  const [playerName, setPlayerName] = useState('')

  useEffect(() => {
    if (gameStarted && gameId) {
      setScreen(isSimulation ? 'simulation' : 'game')
    }
  }, [gameStarted, gameId, isSimulation])

  useEffect(() => {
    if (error) {
    }
  }, [error])

  const handlePlayOnline = useCallback(() => {
    const name = playerName.trim() || `Player_${Math.random().toString(36).substr(2, 4)}`
    setScreen('lobby')
    joinQueue(4, name)
  }, [joinQueue, playerName])

  const handlePractice = useCallback((playerCount, difficulty) => {
    const name = playerName.trim() || `Player_${Math.random().toString(36).substr(2, 4)}`
    startPractice(playerCount, difficulty, name)
  }, [startPractice, playerName])

  const handleSimulation = useCallback((playerCount, difficulty) => {
    startSimulation(playerCount, difficulty)
  }, [startSimulation])

  const handlePlayCard = useCallback((gid, cardId, chosenColor) => {
    playCard(gid, cardId, chosenColor)
  }, [playCard])

  const handleDrawCard = useCallback((gid) => {
    drawCard(gid)
  }, [drawCard])

  const handleLeave = useCallback(() => {
    reset()
    setScreen('menu')
  }, [reset])

  const handleLeaveQueue = useCallback(() => {
    leaveQueue()
    setScreen('menu')
  }, [leaveQueue])

  return (
    <div className="app">
      <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <div className="name-input-bar">
        <label>Name:</label>
        <input
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          placeholder="Enter your name"
          maxLength={20}
          disabled={screen !== 'menu'}
        />
      </div>

      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}

      {screen === 'menu' && (
        <MainMenu
          onPlayOnline={handlePlayOnline}
          onPractice={handlePractice}
          onSimulation={handleSimulation}
        />
      )}

      {screen === 'lobby' && (
        <Lobby
          matchmakingStatus={matchmakingStatus}
          onLeaveQueue={handleLeaveQueue}
        />
      )}

      {screen === 'game' && (
        <GameBoard
          gameState={gameState}
          gameId={gameId}
          leaderboard={leaderboard}
          botThinking={botThinking}
          gameOver={gameOver}
          isPractice={isPractice}
          isSimulation={isSimulation}
          onPlayCard={handlePlayCard}
          onDrawCard={handleDrawCard}
          onLeave={handleLeave}
        />
      )}

      {screen === 'simulation' && (
        <SimulationMode
          gameState={gameState}
          leaderboard={leaderboard}
          botThinking={botThinking}
          gameOver={gameOver}
          onLeave={handleLeave}
        />
      )}
    </div>
  )
}
