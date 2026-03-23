const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Health Check Endpoint
app.get('/', (req, res) => {
  res.send('UNO Sync Backend Server is officially UP and deeply connected! 🚀');
});
app.get('/ping', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

const PORT = process.env.PORT || 3001;
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
// Keep-alive: ping self every 14 minutes so Render free tier never cold-starts
setInterval(() => {
  const http_mod = require('http');
  try {
    http_mod.get(`${SERVER_URL}/ping`, () => {}).on('error', () => {});
  } catch(e) {}
}, 14 * 60 * 1000);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Game State Storage (In-Memory)
const rooms = new Map();
const roomTimers = new Map();
const disconnectTimers = new Map();

// Helper to Generate Deck
const CHOSEN_COLORS = ['uno-red', 'uno-blue', 'uno-green', 'uno-yellow'];

function createDeck() {
  const deck = [];
  const colors = ['red', 'blue', 'green', 'yellow'];
  const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

  colors.forEach(color => {
    values.forEach(value => {
      deck.push({ id: Math.random().toString(36).substr(2, 9), color, value, type: 'number' });
      if (value !== '0') deck.push({ id: Math.random().toString(36).substr(2, 9), color, value, type: 'action' }); // Add second copy for non-zero
    });
  });

  // Add Wilds
  for (let i = 0; i < 4; i++) {
    deck.push({ id: Math.random().toString(36).substr(2, 9), color: 'wild', value: 'wild', type: 'wild' });
    deck.push({ id: Math.random().toString(36).substr(2, 9), color: 'wild', value: 'wild4', type: 'wild' });
  }

  // Shuffle
  return deck.sort(() => Math.random() - 0.5);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create_room', ({ playerName, playerId }) => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    rooms.set(roomId, {
      id: roomId,
      players: [{ id: socket.id, uuid: playerId, name: playerName, hand: [], isHost: true, avatar: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${playerName}` }],
      spectators: [], // Pre-game and winner spectators
      deck: [],
      discardPile: [],
      direction: 1,
      currentPlayerIndex: 0,
      started: false
    });
    
    socket.join(roomId);
    socket.emit('room_created', roomId);
    io.to(roomId).emit('game_update', rooms.get(roomId));
  });

  socket.on('join_room', ({ roomId, playerName, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Attempt Reconnection
    const existingPlayer = room.players.find(p => p.uuid === playerId);
    if (existingPlayer) {
       // Clear disconnect timer
       if (disconnectTimers.has(playerId)) {
         clearTimeout(disconnectTimers.get(playerId));
         disconnectTimers.delete(playerId);
       }
       existingPlayer.id = socket.id;
       existingPlayer.disconnected = false;
       existingPlayer.isBot = false;
       socket.join(roomId);

       // Cancel any pending bot-takeover timer
       if (disconnectTimers.has(playerId)) {
         clearTimeout(disconnectTimers.get(playerId));
         disconnectTimers.delete(playerId);
       }

       io.to(roomId).emit('game_update', room);
       // Notify others this player came back
       if (room.started) {
         io.to(roomId).emit('player_reconnect_notify', { name: existingPlayer.name, id: existingPlayer.id });
       }

       // If the game is active and it was their turn, restart the turn timer for them
       if (room.started && !room.gameOver) {
         const playerIndex = room.players.findIndex(p => p.uuid === playerId);
         if (room.currentPlayerIndex === playerIndex) {
           startTurnTimer(roomId);
         }
       }
       return;
    }

    if (room.started) { // Using 'started' instead of 'gameState' for consistency with existing code
      socket.emit('error', 'Game already started');
      return;
    }
    if (room.players.length >= 5) {
      socket.emit('error', 'Room full');
      return;
    }

    room.players.push({ id: socket.id, uuid: playerId, name: playerName, hand: [], isHost: false, avatar: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${playerName}` });
    socket.join(roomId);
    io.to(roomId).emit('game_update', room);
  });

  socket.on('join_as_spectator', ({ roomId, playerName, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) { socket.emit('error', 'Room not found'); return; }

    // Reconnect existing spectator
    const existingSpec = room.spectators?.find(s => s.uuid === playerId);
    if (existingSpec) {
      existingSpec.id = socket.id;
      socket.join(roomId);
      io.to(roomId).emit('game_update', room);
      return;
    }

    if ((room.spectators?.length || 0) >= 4) {
      socket.emit('error', 'Spectator seats are full (max 4)');
      return;
    }

    if (!room.spectators) room.spectators = [];
    room.spectators.push({ id: socket.id, uuid: playerId, name: playerName, avatar: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${playerName}`, isSpectator: true });
    socket.join(roomId);
    io.to(roomId).emit('game_update', room);
  });

  socket.on('move_to_spectator', ({ roomId, targetPlayerId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const hostId = room.players[0]?.id;
    if (socket.id !== hostId) return; // Only host
    if ((room.spectators?.length || 0) >= 4) {
      socket.emit('error', 'Spectator seats are full (max 4)');
      return;
    }

    const playerIndex = room.players.findIndex(p => p.id === targetPlayerId);
    if (playerIndex === -1 || playerIndex === 0) return; // Can't move host

    const [player] = room.players.splice(playerIndex, 1);
    if (!room.spectators) room.spectators = [];
    room.spectators.push({ ...player, hand: [], isSpectator: true });
    io.to(roomId).emit('game_update', room);
  });

  socket.on('move_to_player', ({ roomId, targetSocketId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const hostId = room.players[0]?.id;
    if (socket.id !== hostId) return;
    if (room.players.length >= 5) {
      socket.emit('error', 'Room is full');
      return;
    }

    const specIndex = room.spectators?.findIndex(s => s.id === targetSocketId);
    if (specIndex === -1 || specIndex === undefined) return;

    const [spec] = room.spectators.splice(specIndex, 1);
    room.players.push({ ...spec, hand: [], isSpectator: false });
    io.to(roomId).emit('game_update', room);
  });

  // Helper to trigger turn timer and Bot logic
  function startTurnTimer(roomId) {
    const room = rooms.get(roomId);
    if (!room || !room.started || room.winner) return;
    
    // Clear existing timer
    if (roomTimers.has(roomId)) {
      clearTimeout(roomTimers.get(roomId));
    }

    // AUTO-ADVANCE: If the current player has already finished, skip them
    const activePlayers = room.players.filter(p => !p.finishedRank);
    if (activePlayers.length <= 1) {
      // Game should be over
      if (activePlayers.length === 1) {
        const finishedCount = room.players.filter(p => p.finishedRank).length;
        activePlayers[0].finishedRank = finishedCount + 1;
        activePlayers[0].points = 0;
      }
      room.gameOver = true;
      room.winner = room.players.find(p => p.finishedRank === 1)?.id;
      io.to(roomId).emit('game_update', room);
      return;
    }

    // If the current player is finished (won), advance to the next active player
    if (room.players[room.currentPlayerIndex]?.finishedRank) {
      let idx = room.currentPlayerIndex;
      let safety = 0;
      do {
        idx = (idx + room.direction + room.players.length) % room.players.length;
        safety++;
      } while (room.players[idx].finishedRank && safety < room.players.length);
      if (!room.players[idx].finishedRank) room.currentPlayerIndex = idx;
    }

    room.turnStartTime = Date.now();
    const currentPlayer = room.players[room.currentPlayerIndex];
    const isBot = currentPlayer?.isBot;
    const timeoutMs = isBot ? 1500 : 15000; // 15 seconds for human, 1.5s for bot

    room.turnDuration = timeoutMs;
    io.to(roomId).emit('game_update', room);

    const timerId = setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (!currentRoom || currentRoom.currentPlayerIndex !== room.currentPlayerIndex) return;

      // Safety guard: never auto-play for a finished player
      if (currentPlayer.finishedRank) {
        startTurnTimer(roomId);
        return;
      }

      const topCard = currentRoom.discardPile[currentRoom.discardPile.length - 1];
      const playableCard = currentPlayer.hand.find(card => 
        card.color === topCard.color || 
        card.value === topCard.value || 
        card.type === 'wild' || 
        (topCard.declaredColor && topCard.declaredColor === card.color)
      );

      if (playableCard) {
        let declaredColor = null;
        if (playableCard.type === 'wild') {
          const colors = ['red', 'blue', 'green', 'yellow'];
          declaredColor = colors[Math.floor(Math.random() * colors.length)];
        }
        handlePlayCard(roomId, currentPlayer.id, playableCard.id, declaredColor);
      } else {
        handleDrawCard(roomId, currentPlayer.id);
      }
    }, timeoutMs);

    roomTimers.set(roomId, timerId);
  }

  function handlePlayCard(roomId, playerId, cardId, declaredColor) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const player = room.players[room.currentPlayerIndex];
    if (player.id !== playerId) return; // Not their turn

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = player.hand[cardIndex];
    const topCard = room.discardPile[room.discardPile.length - 1];

    const isMatched = card.color === topCard.color || card.value === topCard.value || card.type === 'wild';
    if (!isMatched && (!topCard.declaredColor || card.color !== topCard.declaredColor)) return;

    player.hand.splice(cardIndex, 1);
    if (declaredColor) card.declaredColor = declaredColor;
    room.discardPile.push(card);

    if (player.hand.length === 1) {
       io.to(roomId).emit('player_uno', { name: player.name, id: player.id });
    }

    if (player.hand.length === 0 && !player.finishedRank) {
      const finishedCount = room.players.filter(p => p.finishedRank).length;
      player.finishedRank = finishedCount + 1;

      // Calculate UNO Points for this winner from remaining active players' hands
      let points = 0;
      room.players.forEach(p => {
        if (!p.finishedRank && p.id !== player.id) {
          p.hand.forEach(c => {
             if (c.type === 'wild') points += 50;
             else if (['skip', 'reverse', 'draw2'].includes(c.value)) points += 20;
             else points += parseInt(c.value, 10) || 0;
          });
        }
      });
      player.points = points;

      const activePlayers = room.players.filter(p => !p.finishedRank);
      if (activePlayers.length <= 1) {
        if (activePlayers.length === 1) {
           activePlayers[0].finishedRank = finishedCount + 2;
           activePlayers[0].points = 0; // Last player gets 0 points
        }
        room.gameOver = true;
        room.winner = room.players.find(p => p.finishedRank === 1)?.id; // Make the first finisher the ultimate winner for UI purposes
      }
    }

    let skipTurn = false;
    let drawAmount = 0;

    const activeCount = room.players.filter(p => !p.finishedRank).length;

    if (card.value === 'reverse') {
      if (activeCount <= 2) {
        skipTurn = true; // In 2-player UNO, Reverse acts identically to Skip
      } else {
        room.direction *= -1;
      }
    }
    if (card.value === 'skip') skipTurn = true;
    if (card.value === 'draw2') { drawAmount = 2; skipTurn = true; }
    if (card.value === 'wild4') { drawAmount = 4; skipTurn = true; }

    const getNextPlayerIndex = (startIdx) => {
      let idx = startIdx;
      if (activeCount === 0) return idx;
      let safety = 0;
      do {
        idx = (idx + room.direction) % room.players.length;
        if (idx < 0) idx += room.players.length;
        safety++;
      } while (room.players[idx].finishedRank && safety < room.players.length);
      return idx;
    };

    let nextIdx = getNextPlayerIndex(room.currentPlayerIndex);

    if (drawAmount > 0) {
      const nextPlayer = room.players[nextIdx];
      
      // Emit punishment event for UI animation
      io.to(roomId).emit('player_punished', { victimId: nextPlayer.id, amount: drawAmount });
      
      for (let i = 0; i < drawAmount; i++) {
        if (room.deck.length === 0 && room.discardPile.length > 1) {
           const topC = room.discardPile.pop();
           room.deck = room.discardPile.sort(() => Math.random() - 0.5);
           room.discardPile = [topC];
           room.deck.forEach(c => delete c.declaredColor);
        }
        if (room.deck.length > 0) nextPlayer.hand.push(room.deck.pop());
      }
    }

    if (card.value === 'skip' || (card.value === 'reverse' && activeCount <= 2)) {
      io.to(roomId).emit('player_skipped', { victimId: room.players[nextIdx].id });
    } else if (card.value === 'reverse') {
      io.to(roomId).emit('direction_reversed');
    }

    if (skipTurn) {
      room.currentPlayerIndex = getNextPlayerIndex(nextIdx); // Skip the immediate next active player
    } else {
      room.currentPlayerIndex = nextIdx;
    }

    // if game over, clear timers
    if (room.gameOver) {
       io.to(roomId).emit('game_update', room);
       if (roomTimers.has(roomId)) {
         clearTimeout(roomTimers.get(roomId));
       }
       return;
    }

    // game_update is emitted via startTurnTimer
    startTurnTimer(roomId);
  }

  function handleDrawCard(roomId, playerId) {
    const room = rooms.get(roomId);
    if (!room) return;

    if (room.players[room.currentPlayerIndex].id === playerId) {
       if (room.deck.length === 0) {
          const topCard = room.discardPile.pop();
          room.deck = room.discardPile.sort(() => Math.random() - 0.5);
          room.discardPile = [topCard];
          room.deck.forEach(c => delete c.declaredColor);
       }
       if (room.deck.length > 0) {
         room.players[room.currentPlayerIndex].hand.push(room.deck.pop());
         
         const activeCount = room.players.filter(p => !p.finishedRank).length;
         const getNextPlayerIndex = (startIdx) => {
           let idx = startIdx;
           if (activeCount === 0) return idx;
           let safety = 0;
           do {
             idx = (idx + room.direction) % room.players.length;
             if (idx < 0) idx += room.players.length;
             safety++;
           } while (room.players[idx].finishedRank && safety < room.players.length);
           return idx;
         };
         
         room.currentPlayerIndex = getNextPlayerIndex(room.currentPlayerIndex);
         startTurnTimer(roomId);
       }
    }
  }

  socket.on('add_bot', (roomId) => {
    const room = rooms.get(roomId);
    if (!room || room.started || room.players[0].id !== socket.id) return;
    if (room.players.length >= 5) return socket.emit('error', 'Room full');

    const botCount = room.players.filter(p => p.isBot).length + 1;
    const botId = 'bot-' + Math.random().toString(36).substr(2, 6);
    room.players.push({
      id: botId,
      name: `Bot ${botCount}`,
      hand: [],
      isHost: false,
      isBot: true,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${botId}`
    });
    
    io.to(roomId).emit('game_update', room);
  });

  socket.on('start_game', (roomId) => {
    const room = rooms.get(roomId);
    if (room && room.players[0].id === socket.id) {
      room.started = true;
      room.deck = createDeck();
      
      room.players.forEach(p => {
        p.hand = room.deck.splice(0, 7);
      });

      let firstCard = room.deck.pop();
      while (firstCard.type === 'wild') {
        room.deck.unshift(firstCard);
        firstCard = room.deck.pop();
      }
      room.discardPile.push(firstCard);
      room.currentPlayerIndex = 0;

      startTurnTimer(roomId);
    }
  });

  socket.on('play_card', ({ roomId, cardId, declaredColor }) => {
    handlePlayCard(roomId, socket.id, cardId, declaredColor);
  });

  socket.on('draw_card', (roomId) => {
    handleDrawCard(roomId, socket.id);
  });

  socket.on('send_emoji', ({ roomId, emoji }) => {
    const room = rooms.get(roomId);
    if (room) {
      io.to(roomId).emit('receive_emoji', { senderId: socket.id, emoji });
    }
  });

  function handlePlayerLeaving(socketId, explicitLeave = false) {
    for (const [roomId, room] of rooms.entries()) {
      let playerIndex = room.players.findIndex(p => p.id === socketId);
      if (playerIndex !== -1) {
        let player = room.players[playerIndex];
        
        if (room.started) {  // ✅ Fixed: was incorrectly checking room.gameState
          if (!explicitLeave) {
            // Unintentional disconnect: Start 15s grace period
            player.disconnected = true;
            io.to(roomId).emit('game_update', room);
            // Notify all other players: disconnect toast
            io.to(roomId).emit('player_disconnect_notify', { name: player.name, id: player.id });
            
            const timer = setTimeout(() => {
              if (rooms.has(roomId) && player.disconnected) {
                // Time expired -> AI takeover
                player.isBot = true;
                player.disconnected = false;
                io.to(roomId).emit('player_left', player.name + ' abandoned the match. AI took over!');
                io.to(roomId).emit('game_update', room);
                if (room.currentPlayerIndex === playerIndex && !player.finishedRank) {
                  startTurnTimer(roomId);
                }
                
                if (room.players.every(p => p.isBot)) rooms.delete(roomId);
              }
            }, 15000);
            
            disconnectTimers.set(player.uuid, timer);
            return;
          }

          // Explicit 'Leave Room' clicked: Convert instantly
          player.isBot = true;
          io.to(roomId).emit('player_left', player.name);
          
          if (room.players.every(p => p.isBot)) {
             rooms.delete(roomId);
             if (roomTimers.has(roomId)) {
               clearTimeout(roomTimers.get(roomId));
               roomTimers.delete(roomId);
             }
          } else {
             io.to(roomId).emit('game_update', room);
             // If it was exactly their turn, trigger the AI instantly
             if (room.currentPlayerIndex === playerIndex && !player.finishedRank) {
               startTurnTimer(roomId);
             }
          }
        } else {
          // Inside Lobby: Just remove them
          room.players.splice(playerIndex, 1);
          if (player.isHost && room.players.length > 0) {
             room.players[0].isHost = true;
          }
          if (room.players.length === 0 || room.players.every(p => p.isBot)) {
             rooms.delete(roomId);
          } else {
             io.to(roomId).emit('game_update', room);
          }
        }
      }
    }
  }

  socket.on('leave_room', (roomId) => {
    handlePlayerLeaving(socket.id, true);
    socket.leave(roomId);
  });

  socket.on('disband_room', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.players[0].id === socket.id) { // Verify it's the host
      io.to(roomId).emit('room_disbanded');
      rooms.delete(roomId);
      if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId));
        roomTimers.delete(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    handlePlayerLeaving(socket.id);
  });
});

server.listen(PORT, () => console.log(`UNO Sync server running on port ${PORT}`));

