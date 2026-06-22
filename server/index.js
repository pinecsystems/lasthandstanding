const WebSocket = require('ws');
const GameEngine = require('./src/game/GameEngine');

const PORT = process.env.PORT || 3001;
const ROOM_CODE_LEN = 4;
const PLAYER_COUNTS = [4, 8, 16, 32];
const DEFAULT_QUICK_PLAY_COUNT = 8;

const rooms = new Map();
const clientRoom = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < ROOM_CODE_LEN; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(room, msg, exclude = null) {
  for (const client of room.clients) {
    if (client !== exclude) send(client, msg);
  }
}

function broadcastGameState(room) {
  if (!room.game) return;
  for (const client of room.clients) {
    const playerId = clientRoom.get(client);
    if (!playerId) continue;
    const state = room.game.getStateForPlayer(playerId);
    if (state) send(client, { type: 'state_update', state });
  }
}

function processBotLoop(room) {
  if (!room.game || room.game.status !== 'playing') return;

  const cp = room.game.getCurrentPlayer();
  if (!cp || !cp.isBot) return;

  const result = room.game.processBotTurn();
  if (!result) return;

  broadcast(room, { type: 'bot_thinking', botId: cp.id, botName: cp.name, delay: result.delay });

  room._botTimeout = setTimeout(() => {
    broadcastGameState(room);

    if (room.game.status === 'finished') {
      finishGame(room);
      return;
    }

    const next = room.game.getCurrentPlayer();
    if (next && next.isBot) {
      processBotLoop(room);
    }
  }, result.delay || 300);
}

function finishGame(room) {
  if (room._botTimeout) { clearTimeout(room._botTimeout); room._botTimeout = null; }
  broadcast(room, {
    type: 'game_over',
    winner: room.game.winner ? { id: room.game.winner.id, name: room.game.winner.name } : null,
    scores: room.game.scores,
    playLog: room.game.playLog
  });
}

function startGame(room) {
  const humanPlayers = room.players.filter(p => !p.isBot);
  if (humanPlayers.length < 2) {
    for (const client of room.clients) {
      send(client, { type: 'error', message: 'Need at least 2 players to start' });
    }
    return;
  }

  const game = new GameEngine('online_' + Date.now(), humanPlayers.length, room.difficulty);
  game.isOnline = true;

  for (const p of humanPlayers) {
    game.addPlayer(p.id, p.name, false, null);
  }

  room.game = game;
  game.startGame();

  for (const client of room.clients) {
    const pid = clientRoom.get(client);
    if (!pid) continue;
    const state = game.getStateForPlayer(pid);
    send(client, { type: 'game_started', state });
  }
}

const server = new WebSocket.Server({ port: PORT });

server.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    switch (msg.type) {

      case 'create_room': {
        const name = (msg.playerName || 'Host').trim().substring(0, 20) || 'Host';
        const count = PLAYER_COUNTS.includes(msg.playerCount) ? msg.playerCount : 4;
        const diff = ['easy', 'medium', 'hard'].includes(msg.difficulty) ? msg.difficulty : 'medium';

        const code = generateRoomCode();
        const playerId = 'host_' + Date.now();

        const room = {
          code,
          hostId: playerId,
          playerCount: count,
          difficulty: diff,
          players: [{ id: playerId, name, isBot: false, personality: null }],
          clients: [ws],
          game: null,
          _botTimeout: null
        };

        rooms.set(code, room);
        clientRoom.set(ws, playerId);

        send(ws, { type: 'room_created', roomCode: code, playerId, players: room.players });
        console.log(`Room ${code} created by ${name}`);
        break;
      }

      case 'join_room': {
        const code = (msg.roomCode || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { send(ws, { type: 'error', message: 'Room not found' }); break; }
        if (room.game) { send(ws, { type: 'error', message: 'Game already started' }); break; }
        if (room.players.length >= room.playerCount) { send(ws, { type: 'error', message: 'Room is full' }); break; }

        const name = (msg.playerName || 'Player').trim().substring(0, 20) || 'Player';
        const playerId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

        room.players.push({ id: playerId, name, isBot: false, personality: null });
        room.clients.push(ws);
        clientRoom.set(ws, playerId);

        send(ws, { type: 'room_joined', roomCode: code, playerId, players: room.players });
        broadcast(room, { type: 'player_joined', playerId, playerName: name }, ws);
        console.log(`${name} joined room ${code}`);
        if (room.players.length >= room.playerCount) {
          console.log(`Room ${code} full, starting!`);
          startGame(room);
        }
        break;
      }

      case 'leave_room': {
        const pid = clientRoom.get(ws);
        if (!pid) break;
        for (const [code, room] of rooms) {
          const idx = room.players.findIndex(p => p.id === pid);
          if (idx !== -1) {
            room.players.splice(idx, 1);
            const cidx = room.clients.indexOf(ws);
            if (cidx !== -1) room.clients.splice(cidx, 1);
            clientRoom.delete(ws);

            if (room.hostId === pid) {
              broadcast(room, { type: 'room_closed', reason: 'Host left' });
              if (room._botTimeout) clearTimeout(room._botTimeout);
              rooms.delete(code);
              console.log(`Room ${code} closed (host left)`);
            } else {
              broadcast(room, { type: 'player_left', playerId: pid });
              if (room.players.length === 0) {
                if (room._botTimeout) clearTimeout(room._botTimeout);
                rooms.delete(code);
              }
            }
            break;
          }
        }
        break;
      }

      case 'start_game': {
        const pid = clientRoom.get(ws);
        if (!pid) break;
        for (const [code, room] of rooms) {
          if (room.hostId === pid && !room.game) {
            startGame(room);
            console.log(`Game started in room ${code}`);
            break;
          }
        }
        break;
      }

      case 'list_rooms': {
        const openRooms = [];
        for (const [code, room] of rooms) {
          if (!room.game && room.players.length < room.playerCount && room.players.length > 0) {
            openRooms.push({
              code,
              playerCount: room.playerCount,
              playerCountCurrent: room.players.length,
              hostName: (room.players.find(p => p.id === room.hostId) || room.players[0])?.name || 'Unknown'
            });
          }
        }
        send(ws, { type: 'room_list', rooms: openRooms });
        break;
      }

      case 'quick_play': {
        const qpName = (msg.playerName || 'Player').trim().substring(0, 20) || 'Player';
        let targetRoom = null;
        let targetCode = null;
        for (const [code, room] of rooms) {
          if (!room.game && room.players.length < room.playerCount) {
            targetRoom = room;
            targetCode = code;
            break;
          }
        }
        if (targetRoom) {
          const qpId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          targetRoom.players.push({ id: qpId, name: qpName, isBot: false, personality: null });
          targetRoom.clients.push(ws);
          clientRoom.set(ws, qpId);
          send(ws, { type: 'room_joined', roomCode: targetCode, playerId: qpId, players: targetRoom.players });
          broadcast(targetRoom, { type: 'player_joined', playerId: qpId, playerName: qpName }, ws);
          console.log(`${qpName} quick-joined room ${targetCode}`);
          if (targetRoom.players.length >= targetRoom.playerCount) {
            console.log(`Room ${targetCode} full, starting!`);
            startGame(targetRoom);
          }
        } else {
          const code = generateRoomCode();
          const qpId = 'host_' + Date.now();
          const room = {
            code, hostId: qpId, playerCount: DEFAULT_QUICK_PLAY_COUNT,
            difficulty: 'medium',
            players: [{ id: qpId, name: qpName, isBot: false, personality: null }],
            clients: [ws], game: null, _botTimeout: null
          };
          rooms.set(code, room);
          clientRoom.set(ws, qpId);
          send(ws, { type: 'room_created', roomCode: code, playerId: qpId, players: room.players });
          console.log(`Room ${code} created via quick play by ${qpName}`);
        }
        break;
      }

      case 'play_card': {
        const pid = clientRoom.get(ws);
        if (!pid) break;
        for (const [code, room] of rooms) {
          if (!room.game || room.game.status !== 'playing') continue;
          const cp = room.game.getCurrentPlayer();
          if (!cp || cp.id !== pid || cp.isBot) break;
          const result = room.game.playCard(pid, msg.cardId, msg.chosenColor || null, msg.targetId || null);
          if (!result.success) { send(ws, { type: 'error', message: result.error }); break; }
          broadcastGameState(room);
          if (room.game.status === 'finished') { finishGame(room); break; }
          const next = room.game.getCurrentPlayer();
          if (next && next.isBot) processBotLoop(room);
          break;
        }
        break;
      }

      case 'draw_card': {
        const pid = clientRoom.get(ws);
        if (!pid) break;
        for (const [code, room] of rooms) {
          if (!room.game || room.game.status !== 'playing') continue;
          const cp = room.game.getCurrentPlayer();
          if (!cp || cp.id !== pid || cp.isBot) break;
          const result = room.game.drawCard(pid);
          if (!result.success) { send(ws, { type: 'error', message: result.error }); break; }
          broadcastGameState(room);
          if (room.game.status === 'finished') { finishGame(room); break; }
          const next = room.game.getCurrentPlayer();
          if (next && next.isBot) processBotLoop(room);
          break;
        }
        break;
      }

      case 'end_turn': {
        const pid = clientRoom.get(ws);
        if (!pid) break;
        for (const [code, room] of rooms) {
          if (!room.game || room.game.status !== 'playing') continue;
          const cp = room.game.getCurrentPlayer();
          if (!cp || cp.id !== pid || cp.isBot || !cp.hasDrawn) break;
          room.game.advanceTurn();
          broadcastGameState(room);
          if (room.game.status === 'finished') { finishGame(room); break; }
          const next = room.game.getCurrentPlayer();
          if (next && next.isBot) processBotLoop(room);
          break;
        }
        break;
      }

      case 'ping': {
        send(ws, { type: 'pong' });
        break;
      }
    }
  });

  ws.on('close', () => {
    const pid = clientRoom.get(ws);
    if (!pid) return;
    for (const [code, room] of rooms) {
      const idx = room.players.findIndex(p => p.id === pid);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        const cidx = room.clients.indexOf(ws);
        if (cidx !== -1) room.clients.splice(cidx, 1);
        clientRoom.delete(ws);

        if (room.hostId === pid) {
          broadcast(room, { type: 'room_closed', reason: 'Host disconnected' });
          if (room._botTimeout) clearTimeout(room._botTimeout);
          rooms.delete(code);
          console.log(`Room ${code} closed (host disconnected)`);
        } else {
          broadcast(room, { type: 'player_left', playerId: pid });
          if (room.players.length === 0) {
            if (room._botTimeout) clearTimeout(room._botTimeout);
            rooms.delete(code);
          }
        }
        break;
      }
    }
  });
});

console.log(`\n  🃏 Last Hand Standing Online Server`);
console.log(`  ───────────────────────────────`);
console.log(`  WebSocket server running on port ${PORT}`);
console.log(`  ws://localhost:${PORT}\n`);
