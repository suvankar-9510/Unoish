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
  unoCalls: [],
  pendingRoomId: null,
  setPlayerName: (name) => set({ playerName: name }),
  setPendingRoomId: (id) => set({ pendingRoomId: id }),
  
  sendEmoji: (emoji) => {
    socket.emit('send_emoji', { roomId: get().roomId, emoji });
  },
  
  createRoom: () => {
    socket.emit('create_room', { playerName: get().playerName });
  },
  
  joinRoom: (roomId) => {
    socket.emit('join_room', { roomId, playerName: get().playerName });
  },
  
  leaveRoom: () => {
    socket.emit('leave_room', get().roomId);
    set({ gameState: null, roomId: '', activeEmojis: [], activePunishments: [], unoCalls: [], pendingRoomId: null });
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

socket.on('room_disbanded', () => {
  useGameStore.setState({ gameState: null, roomId: '', activeEmojis: [], activePunishments: [], unoCalls: [], pendingRoomId: null });
  alert('The room was disbanded by the host.');
});

socket.on('error', (message) => {
  alert('Error: ' + message);
});
