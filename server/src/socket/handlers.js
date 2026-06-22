const GameEngine = require('../game/GameEngine');
const AI = require('../game/BotAI');

const matchmakingQueue = [];
const activeGames = new Map();
let gameIdCounter = 0;
const MATCHMAKING_TIMEOUT = 5000;
const PLAYER_SLOTS = [4, 8, 16, 32];

function createGameId() {
  return `game_${++gameIdCounter}_${Date.now()}`;
}

function setupSocketHandlers(io) {
  const waitingTimers = new Map();

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('join_queue', (data = {}) => {
      const targetSize = data.targetSize || 4;
      if (!PLAYER_SLOTS.includes(targetSize)) {
        socket.emit('error', { message: `Invalid player count. Choose: ${PLAYER_SLOTS.join(', ')}` });
        return;
      }

      const playerName = data.name || `Player_${socket.id.substr(0, 4)}`;

      matchmakingQueue.push({
        socketId: socket.id,
        name: playerName,
        targetSize
      });

      socket.join(`queue_${targetSize}`);
      socket.emit('matchmaking_status', {
        inQueue: true,
        queuedPlayers: matchmakingQueue.filter(p => p.targetSize === targetSize).length,
        targetSize
      });

      console.log(`${playerName} joined queue for ${targetSize}-player game`);

      if (!waitingTimers.has(targetSize)) {
        const timer = setTimeout(() => {
          tryFillGame(io, targetSize);
          waitingTimers.delete(targetSize);
        }, MATCHMAKING_TIMEOUT);
        waitingTimers.set(targetSize, timer);
      }

      tryFillGame(io, targetSize);
    });

    socket.on('leave_queue', () => {
      const idx = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        const player = matchmakingQueue[idx];
        matchmakingQueue.splice(idx, 1);
        socket.leave(`queue_${player.targetSize}`);
        socket.emit('matchmaking_status', { inQueue: false });
      }
    });

    socket.on('start_practice', (data = {}) => {
      const playerCount = data.playerCount || 4;
      const difficulty = data.difficulty || 'medium';

      if (!PLAYER_SLOTS.includes(playerCount)) {
        socket.emit('error', { message: `Invalid player count. Choose: ${PLAYER_SLOTS.join(', ')}` });
        return;
      }

      const gameId = createGameId();
      const game = new GameEngine(gameId, playerCount, difficulty);

      const playerName = data.name || `Player_${socket.id.substr(0, 4)}`;
      game.addPlayer(socket.id, playerName, false, null);

      const personalities = AI.getPersonalities(playerCount - 1);
      for (let i = 0; i < playerCount - 1; i++) {
        const botId = `bot_${gameId}_${i}`;
        const botName = AI.getRandomName();
        game.addPlayer(botId, botName, true, personalities[i]);
      }

      activeGames.set(gameId, game);

      socket.join(gameId);
      socket.emit('game_started', { gameId, isPractice: true });

      game.startGame();
      broadcastGameState(io, game);

      startBotLoop(io, game);
    });

    socket.on('start_simulation', (data = {}) => {
      const playerCount = data.playerCount || 8;
      const difficulty = data.difficulty || 'medium';

      if (!PLAYER_SLOTS.includes(playerCount)) {
        socket.emit('error', { message: `Invalid player count. Choose: ${PLAYER_SLOTS.join(', ')}` });
        return;
      }

      const gameId = createGameId();
      const game = new GameEngine(gameId, playerCount, difficulty);

      game.isSimulation = true;

      const personalities = AI.getPersonalities(playerCount);
      for (let i = 0; i < playerCount; i++) {
        const botId = `bot_${gameId}_${i}`;
        const botName = AI.getRandomName();
        game.addPlayer(botId, botName, true, personalities[i]);
      }

      game.addPlayer(socket.id, 'Spectator', false, null);

      activeGames.set(gameId, game);

      socket.join(gameId);
      socket.emit('game_started', { gameId, isSimulation: true });

      game.startGame();
      broadcastGameState(io, game);

      startBotLoop(io, game);
    });

    socket.on('play_card', (data = {}) => {
      const { gameId, cardId, chosenColor } = data;
      const game = activeGames.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const currentPlayer = game.getCurrentPlayer();
      if (!currentPlayer || currentPlayer.id !== socket.id) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      if (currentPlayer.isBot) {
        socket.emit('error', { message: 'Cannot control bot players' });
        return;
      }

      const result = game.playCard(socket.id, cardId, chosenColor);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      broadcastGameState(io, game);

      if (game.status === 'finished') {
        finishGame(io, game);
      } else {
        const nextPlayer = game.getCurrentPlayer();
        if (nextPlayer && nextPlayer.isBot) {
          continueBotLoop(game);
        }
      }
    });

    socket.on('draw_card', (data = {}) => {
      const { gameId } = data;
      const game = activeGames.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const currentPlayer = game.getCurrentPlayer();
      if (!currentPlayer || currentPlayer.id !== socket.id) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }
      if (currentPlayer.isBot) {
        socket.emit('error', { message: 'Cannot control bot players' });
        return;
      }

      const result = game.drawCard(socket.id);
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }

      broadcastGameState(io, game);

      if (game.status === 'finished') {
        finishGame(io, game);
      } else {
        const nextPlayer = game.getCurrentPlayer();
        if (nextPlayer && nextPlayer.isBot) {
          continueBotLoop(game);
        }
      }
    });

    socket.on('request_game_state', (data = {}) => {
      const { gameId } = data;
      const game = activeGames.get(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }
      const state = game.getStateForPlayer(socket.id);
      socket.emit('game_state', state);
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      const queueIdx = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (queueIdx !== -1) {
        matchmakingQueue.splice(queueIdx, 1);
      }

      for (const [gameId, game] of activeGames.entries()) {
        const player = game.getPlayer(socket.id);
        if (player && !player.isBot) {
          const isCurrentlyPlaying = game.players.some(p => p.id === socket.id && !p.isBot);
          if (isCurrentlyPlaying) {
            io.to(gameId).emit('player_disconnected', { playerId: socket.id });
          }
        }
      }
    });
  });

  function tryFillGame(io, targetSize) {
    const queued = matchmakingQueue.filter(p => p.targetSize === targetSize);

    if (queued.length >= targetSize) {
      const selected = queued.splice(0, targetSize);

      for (const p of selected) {
        const idx = matchmakingQueue.findIndex(q => q.socketId === p.socketId);
        if (idx !== -1) matchmakingQueue.splice(idx, 1);
      }

      startGameWithPlayers(io, selected, targetSize, 'medium');
      return;
    }
  }

  function startGameWithPlayers(io, humanPlayers, targetSize, difficulty) {
    const gameId = createGameId();
    const game = new GameEngine(gameId, targetSize, difficulty);

    for (const player of humanPlayers) {
      game.addPlayer(player.socketId, player.name, false, null);
    }

    const personalities = AI.getPersonalities(targetSize - humanPlayers.length);
    for (let i = 0; i < targetSize - humanPlayers.length; i++) {
      const botId = `bot_${gameId}_${i}`;
      const botName = AI.getRandomName();
      game.addPlayer(botId, botName, true, personalities[i]);
    }

    activeGames.set(gameId, game);

    for (const player of humanPlayers) {
      const sock = io.sockets.sockets.get(player.socketId);
      if (sock) {
        sock.join(gameId);
        sock.leave(`queue_${targetSize}`);
        sock.emit('game_started', { gameId });
      }
    }

    console.log(`Game ${gameId} started with ${humanPlayers.length} humans + ${targetSize - humanPlayers.length} bots`);

    game.startGame();
    broadcastGameState(io, game);

    startBotLoop(io, game);
  }

  function startBotLoop(io, game) {
    if (game.status !== 'playing') return;

    function processBot() {
      if (game.status === 'finished') {
        finishGame(io, game);
        return;
      }
      if (game.status !== 'playing') return;

      const currentPlayer = game.getCurrentPlayer();
      if (!currentPlayer || !currentPlayer.isBot) return;

      const result = game.processBotTurn();
      if (!result) return;

      io.to(game.id).emit('bot_thinking', {
        botId: currentPlayer.id,
        botName: currentPlayer.name,
        delay: result.delay
      });

      game._pendingBotTimeout = setTimeout(() => {
        broadcastGameState(io, game);

        if (game.status === 'finished') {
          finishGame(io, game);
          return;
        }

        if (game.status !== 'playing') return;

        io.to(game.id).emit('leaderboard_update', { leaderboard: game.getLeaderboard() });

        const nextPlayer = game.getCurrentPlayer();
        if (nextPlayer && nextPlayer.isBot) {
          processBot();
        }
      }, result.delay || 300);
    };

    game._processBot = processBot;

    if (game.status === 'playing') {
      const firstPlayer = game.getCurrentPlayer();
      if (firstPlayer && firstPlayer.isBot) {
        io.to(game.id).emit('leaderboard_update', { leaderboard: game.getLeaderboard() });
        setTimeout(processBot, 500);
      }
    }
  }

  function finishGame(io, game) {
    io.to(game.id).emit('game_over', {
      winner: game.winner,
      scores: game.scores,
      playLog: game.playLog
    });
    io.to(game.id).emit('leaderboard_update', { leaderboard: game.getLeaderboard() });
    setTimeout(() => {
      if (game._pendingBotTimeout) clearTimeout(game._pendingBotTimeout);
      activeGames.delete(game.id);
    }, 60000);
  }

  function continueBotLoop(game) {
    if (game.status === 'playing' && game._processBot) {
      game._processBot();
    }
  }

  function broadcastGameState(io, game) {
    for (const player of game.players) {
      const state = game.getStateForPlayer(player.id);
      io.to(player.id).emit('game_state', state);
    }
    io.to(game.id).emit('leaderboard_update', { leaderboard: game.getLeaderboard() });
  }
}

module.exports = { setupSocketHandlers };
