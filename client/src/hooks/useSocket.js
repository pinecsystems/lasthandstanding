import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : ''

export function useSocket() {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState(null)
  const [matchmakingStatus, setMatchmakingStatus] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [gameStarted, setGameStarted] = useState(false)
  const [gameId, setGameId] = useState(null)
  const [botThinking, setBotThinking] = useState(null)
  const [error, setError] = useState(null)
  const [gameOver, setGameOver] = useState(null)
  const [isPractice, setIsPractice] = useState(false)
  const [isSimulation, setIsSimulation] = useState(false)

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('game_state', (state) => {
      setGameState(state)
    })

    socket.on('matchmaking_status', (status) => {
      setMatchmakingStatus(status)
    })

    socket.on('game_started', ({ gameId: gid, isPractice: prac, isSimulation: sim }) => {
      setGameStarted(true)
      setGameId(gid)
      setIsPractice(!!prac)
      setIsSimulation(!!sim)
      setMatchmakingStatus(null)
      setError(null)
    })

    socket.on('bot_thinking', ({ botId, botName, delay }) => {
      setBotThinking({ botId, botName, delay })
    })

    socket.on('leaderboard_update', ({ leaderboard: lb }) => {
      setLeaderboard(lb || [])
    })

    socket.on('bot_turn', () => {
    })

    socket.on('game_over', (data) => {
      setGameOver(data)
    })

    socket.on('error', ({ message }) => {
      setError(message)
      setTimeout(() => setError(null), 5000)
    })

    socket.on('player_disconnected', ({ playerId }) => {
      setError('A player disconnected')
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const joinQueue = useCallback((targetSize = 4, name = null) => {
    socketRef.current?.emit('join_queue', { targetSize, name })
  }, [])

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit('leave_queue')
    setMatchmakingStatus(null)
  }, [])

  const startPractice = useCallback((playerCount = 4, difficulty = 'medium', name = null) => {
    socketRef.current?.emit('start_practice', { playerCount, difficulty, name })
  }, [])

  const startSimulation = useCallback((playerCount = 8, difficulty = 'medium') => {
    socketRef.current?.emit('start_simulation', { playerCount, difficulty })
  }, [])

  const playCard = useCallback((gameId, cardId, chosenColor = null) => {
    socketRef.current?.emit('play_card', { gameId, cardId, chosenColor })
  }, [])

  const drawCard = useCallback((gameId) => {
    socketRef.current?.emit('draw_card', { gameId })
  }, [])

  const requestGameState = useCallback((gameId) => {
    socketRef.current?.emit('request_game_state', { gameId })
  }, [])

  const reset = useCallback(() => {
    setGameState(null)
    setGameStarted(false)
    setGameId(null)
    setMatchmakingStatus(null)
    setLeaderboard([])
    setBotThinking(null)
    setError(null)
    setGameOver(null)
    setIsPractice(false)
    setIsSimulation(false)
    socketRef.current?.emit('leave_queue')
  }, [])

  return {
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
  }
}
