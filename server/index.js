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

  socket.on('create_room', ({ playerName }) => {
    const roomId = Math.random().toString(36).substr(2, 4).toUpperCase();
    rooms.set(roomId, {
      id: roomId,
      players: [{ id: socket.id, name: playerName, hand: [], isHost: true, avatar: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${playerName}` }],
      deck: [],
      discardPile: [],
      direction: 1, // 1 for clockwise, -1 for counter-clockwise
      currentPlayerIndex: 0,
      started: false
    });
    
    socket.join(roomId);
    socket.emit('room_created', roomId);
    io.to(roomId).emit('game_update', rooms.get(roomId));
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    const room = rooms.get(roomId);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.started) return socket.emit('error', 'Game already started');
    if (room.players.length >= 5) return socket.emit('error', 'Room full');

    if (!room.players.find(p => p.id === socket.id)) {
      room.players.push({ id: socket.id, name: playerName, hand: [], isHost: false, avatar: `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${playerName}` });
    }
    
    socket.join(roomId);
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

    room.turnStartTime = Date.now();
    const currentPlayer = room.players[room.currentPlayerIndex];
    const isBot = currentPlayer?.isBot;
    const timeoutMs = isBot ? 1500 : 15000; // 15 seconds for human, 1.5s for bot

    room.turnDuration = timeoutMs;
    io.to(roomId).emit('game_update', room);

    const timerId = setTimeout(() => {
      const currentRoom = rooms.get(roomId);
      if (!currentRoom || currentRoom.currentPlayerIndex !== room.currentPlayerIndex) return;

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

    if (card.value === 'reverse') room.direction *= -1;
    if (card.value === 'skip') skipTurn = true;
    if (card.value === 'draw2') { drawAmount = 2; skipTurn = true; }
    if (card.value === 'wild4') { drawAmount = 4; skipTurn = true; }

    const nextPlayerIndex = () => {
      let idx = room.currentPlayerIndex;
      const activeCount = room.players.filter(p => !p.finishedRank).length;
      if (activeCount === 0) return idx;

      do {
        idx = (idx + room.direction) % room.players.length;
        if (idx < 0) idx += room.players.length;
      } while (room.players[idx].finishedRank);
      return idx;
    };

    let nextIdx = nextPlayerIndex();

    if (drawAmount > 0) {
      const nextPlayer = room.players[nextIdx];
      
      // Emit punishment event for UI animation
      io.to(roomId).emit('player_punished', { victimId: nextPlayer.id, amount: drawAmount });
      
      for (let i = 0; i < drawAmount; i++) {
        if (room.deck.length > 0) nextPlayer.hand.push(room.deck.pop());
      }
    }

    if (skipTurn) {
      room.currentPlayerIndex = nextPlayerIndex();
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
         let idx = (room.currentPlayerIndex + room.direction) % room.players.length;
         if (idx < 0) idx += room.players.length;
         room.currentPlayerIndex = idx;

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

  socket.on('leave_room', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0 || room.players.every(p => p.isBot)) {
      rooms.delete(roomId);
      if (roomTimers.has(roomId)) {
        clearTimeout(roomTimers.get(roomId));
        roomTimers.delete(roomId);
      }
    } else {
      io.to(roomId).emit('game_update', room);
    }
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
    // Optional: handle player leaving logic, e.g., pass host
  });
});

const PORT = 3001;
server.listen(PORT, () => console.log(`UNO Sync server running on port ${PORT}`));
