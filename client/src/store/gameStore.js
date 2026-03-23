import { create } from 'zustand';
import { io } from 'socket.io-client';

const URL = import.meta.env.MODE === 'production' 
  ? (import.meta.env.VITE_SERVER_URL || window.location.origin) 
  : 'http://localhost:3001';

export const socket = io(URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

export const useGameStore = create((set, get) => ({
  playerName: '',
  roomId: '',
  gameState: null,
  socketId: null,
  isConnected: false,
  isCreatingRoom: false,
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
    set({ isCreatingRoom: true });
    socket.emit('create_room', { playerName: get().playerName, playerId });
    // Timeout safety — if no response in 10s, clear loading
    setTimeout(() => set({ isCreatingRoom: false }), 10000);
  },
  
  joinRoom: (roomId) => {
    const playerId = localStorage.getItem('unoish_uuid') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('unoish_uuid', playerId);
    // Persist session for refresh recovery
    localStorage.setItem('unoish_roomId', roomId);
    localStorage.setItem('unoish_playerName', get().playerName);
    localStorage.setItem('unoish_isSpectator', 'false');
    socket.emit('join_room', { roomId, playerName: get().playerName, playerId });
  },
  
  leaveRoom: () => {
    socket.emit('leave_room', get().roomId);
    // Clear persisted session
    localStorage.removeItem('unoish_roomId');
    localStorage.removeItem('unoish_isSpectator');
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
    // Persist session for refresh recovery
    localStorage.setItem('unoish_roomId', roomId);
    localStorage.setItem('unoish_playerName', get().playerName);
    localStorage.setItem('unoish_isSpectator', 'true');
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
  useGameStore.setState({ socketId: socket.id, isConnected: true });

  // Auto-reconnect if we have a saved session
  const savedRoom = localStorage.getItem('unoish_roomId');
  const savedName = localStorage.getItem('unoish_playerName');
  const savedIsSpectator = localStorage.getItem('unoish_isSpectator') === 'true';
  const savedUuid = localStorage.getItem('unoish_uuid');

  if (savedRoom && savedName && savedUuid) {
    // Restore name to store immediately so routing works
    useGameStore.setState({ playerName: savedName });

    if (savedIsSpectator) {
      socket.emit('join_as_spectator', { roomId: savedRoom, playerName: savedName, playerId: savedUuid });
    } else {
      socket.emit('join_room', { roomId: savedRoom, playerName: savedName, playerId: savedUuid });
    }
  }
});

socket.on('disconnect', () => {
  useGameStore.setState({ isConnected: false });
});

socket.on('connect_error', () => {
  useGameStore.setState({ isConnected: false, isCreatingRoom: false });
});

socket.on('room_created', (roomId) => {
  // Persist session for refresh recovery
  const { playerName } = useGameStore.getState();
  localStorage.setItem('unoish_roomId', roomId);
  localStorage.setItem('unoish_playerName', playerName);
  localStorage.setItem('unoish_isSpectator', 'false');
  useGameStore.setState({ roomId, isCreatingRoom: false });
});

socket.on('error', (message) => {
  // If server refuses reconnect (e.g. game ended), clear saved session
  if (message === 'Room not found' || message === 'Game already started') {
    localStorage.removeItem('unoish_roomId');
    localStorage.removeItem('unoish_isSpectator');
  }
  useGameStore.setState({ isCreatingRoom: false });
  alert(message);
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

socket.on('player_left', (text) => {
  const store = useGameStore.getState();
  const newMsg = { id: Math.random().toString(36).substr(2, 9), text, type: 'ai' };
  useGameStore.setState({ activeMessages: [...store.activeMessages, newMsg] });
  setTimeout(() => {
    const s = useGameStore.getState();
    useGameStore.setState({ activeMessages: s.activeMessages.filter(m => m.id !== newMsg.id) });
  }, 5000);
});

socket.on('player_disconnect_notify', ({ name }) => {
  const store = useGameStore.getState();
  const newMsg = { id: Math.random().toString(36).substr(2, 9), text: `${name} disconnected! Waiting 15s...`, type: 'disconnect' };
  useGameStore.setState({ activeMessages: [...store.activeMessages, newMsg] });
  setTimeout(() => {
    const s = useGameStore.getState();
    useGameStore.setState({ activeMessages: s.activeMessages.filter(m => m.id !== newMsg.id) });
  }, 6000);
});

socket.on('player_reconnect_notify', ({ name }) => {
  const store = useGameStore.getState();
  const newMsg = { id: Math.random().toString(36).substr(2, 9), text: `${name} reconnected! 🎉`, type: 'reconnect' };
  useGameStore.setState({ activeMessages: [...store.activeMessages, newMsg] });
  setTimeout(() => {
    const s = useGameStore.getState();
    useGameStore.setState({ activeMessages: s.activeMessages.filter(m => m.id !== newMsg.id) });
  }, 4000);
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
