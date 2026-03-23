import { create } from 'zustand';
import { io } from 'socket.io-client';

const URL = import.meta.env.MODE === 'production' 
  ? (import.meta.env.VITE_SERVER_URL || window.location.origin) 
  : 'http://localhost:3001';
export const socket = io(URL);

export const useGameStore = create((set, get) => ({
  playerName: '',
  roomId: '',
  gameState: null,
  socketId: null,
  activeEmojis: [],
  activePunishments: [],
  activeSkips: [],
  unoCalls: [],
  activeMessages: [],
  isReversing: false,
  pendingRoomId: null,
  setPlayerName: (name) => set({ playerName: name }),
  setPendingRoomId: (id) => set({ pendingRoomId: id }),
  
  sendEmoji: (emoji) => {
    socket.emit('send_emoji', { roomId: get().roomId, emoji });
  },
  
  createRoom: () => {
    const playerId = localStorage.getItem('unoish_uuid') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('unoish_uuid', playerId);
    socket.emit('create_room', { playerName: get().playerName, playerId });
  },
  
  joinRoom: (roomId) => {
    const playerId = localStorage.getItem('unoish_uuid') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('unoish_uuid', playerId);
    socket.emit('join_room', { roomId, playerName: get().playerName, playerId });
  },
  
  leaveRoom: () => {
    socket.emit('leave_room', get().roomId);
    set({ gameState: null, roomId: '', activeEmojis: [], activePunishments: [], activeSkips: [], unoCalls: [], activeMessages: [], isReversing: false, pendingRoomId: null });
  },

  disbandRoom: () => {
    socket.emit('disband_room', get().roomId);
  },

  addBot: () => {
    socket.emit('add_bot', get().roomId);
  },

  startGame: () => {
    socket.emit('start_game', get().roomId);
  },

  playCard: (cardId, declaredColor = null) => {
    socket.emit('play_card', { roomId: get().roomId, cardId, declaredColor });
  },

  drawCard: () => {
    socket.emit('draw_card', get().roomId);
  },

  joinAsSpectator: (roomId) => {
    const playerId = localStorage.getItem('unoish_uuid') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('unoish_uuid', playerId);
    socket.emit('join_as_spectator', { roomId, playerName: get().playerName, playerId });
  },

  moveToSpectator: (targetPlayerId) => {
    socket.emit('move_to_spectator', { roomId: get().roomId, targetPlayerId });
  },

  moveToPlayer: (targetSocketId) => {
    socket.emit('move_to_player', { roomId: get().roomId, targetSocketId });
  },

  isSpectatorMode: () => {
    const { gameState, socketId } = get();
    if (!gameState) return false;
    return gameState.spectators?.some(s => s.id === socketId) || false;
  }
}));

socket.on('connect', () => {
  useGameStore.setState({ socketId: socket.id });
});

socket.on('room_created', (roomId) => {
  useGameStore.setState({ roomId });
});

socket.on('game_update', (roomData) => {
  useGameStore.setState({ gameState: roomData, roomId: roomData.id });
});

socket.on('receive_emoji', ({ senderId, emoji }) => {
  const store = useGameStore.getState();
  const newEmoji = {
    id: Math.random().toString(36).substr(2, 9),
    senderId,
    emoji,
    timestamp: Date.now()
  };
  
  useGameStore.setState({ 
    activeEmojis: [...store.activeEmojis, newEmoji] 
  });

  // Automatically remove emoji after 3 seconds
  setTimeout(() => {
    const currentStore = useGameStore.getState();
    useGameStore.setState({
      activeEmojis: currentStore.activeEmojis.filter(e => e.id !== newEmoji.id)
    });
  }, 3000);
});

socket.on('player_punished', (data) => {
  const store = useGameStore.getState();
  const newPunish = { ...data, id: Math.random().toString(36).substr(2, 9) };
  
  useGameStore.setState({ 
    activePunishments: [...store.activePunishments, newPunish] 
  });

  setTimeout(() => {
    const currentStore = useGameStore.getState();
    useGameStore.setState({
      activePunishments: currentStore.activePunishments.filter(p => p.id !== newPunish.id)
    });
  }, 3000); // UI animation duration 3 seconds
});

socket.on('player_uno', (data) => {
  const store = useGameStore.getState();
  const newUno = { ...data, uid: Math.random().toString(36).substr(2, 9) };
  
  useGameStore.setState({ 
    unoCalls: [...store.unoCalls, newUno] 
  });

  setTimeout(() => {
    const currentStore = useGameStore.getState();
    useGameStore.setState({
      unoCalls: currentStore.unoCalls.filter(u => u.uid !== newUno.uid)
    });
  }, 4000); // UI animation duration 4 seconds
});

socket.on('player_left', (playerName) => {
  const store = useGameStore.getState();
  const newMsg = { id: Math.random().toString(36).substr(2, 9), text: `${playerName} disconnected. An AI robot took their place!` };
  
  useGameStore.setState({ 
    activeMessages: [...store.activeMessages, newMsg] 
  });

  setTimeout(() => {
    const currentStore = useGameStore.getState();
    useGameStore.setState({
      activeMessages: currentStore.activeMessages.filter(m => m.id !== newMsg.id)
    });
  }, 5000);
});

socket.on('direction_reversed', () => {
  useGameStore.setState({ isReversing: true });
  setTimeout(() => {
    useGameStore.setState({ isReversing: false });
  }, 1000); // UI animation duration 1 second
});

socket.on('player_skipped', (data) => {
  const store = useGameStore.getState();
  const newSkip = { ...data, id: Math.random().toString(36).substr(2, 9) };
  
  useGameStore.setState({ 
    activeSkips: [...store.activeSkips, newSkip] 
  });

  setTimeout(() => {
    const currentStore = useGameStore.getState();
    useGameStore.setState({
      activeSkips: currentStore.activeSkips.filter(s => s.id !== newSkip.id)
    });
  }, 2000); // UI animation duration 2 seconds
});

socket.on('room_disbanded', () => {
  useGameStore.setState({ gameState: null, roomId: '', activeEmojis: [], activePunishments: [], activeSkips: [], unoCalls: [], activeMessages: [], isReversing: false, pendingRoomId: null });
  alert('The room was disbanded by the host.');
});

socket.on('error', (message) => {
  alert('Error: ' + message);
});
