import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import WelcomeScreen from './components/WelcomeScreen';
import ActionScreen from './components/ActionScreen';
import LobbyScreen from './components/LobbyScreen';
import GameBoard from './components/GameBoard';

function App() {
  const { playerName, roomId, gameState } = useGameStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      useGameStore.getState().setPendingRoomId(roomParam);
    }
  }, []);

  if (!playerName) {
    return <WelcomeScreen />;
  }

  if (!roomId && !gameState) {
    return <ActionScreen />;
  }

  if (gameState && !gameState.started) {
    return <LobbyScreen />;
  }

  if (gameState && gameState.started) {
    return <GameBoard />;
  }

  return <div>Loading...</div>;
}

export default App;
