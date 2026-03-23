import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function LobbyScreen() {
  const { gameState, socketId, startGame, addBot } = useGameStore();
  const [showQR, setShowQR] = useState(false);

  if (!gameState) return null;

  const isHost = gameState.players[0].id === socketId;
  const playerCount = gameState.players.length;

  return (
    <div className="font-body text-white min-h-screen flex flex-col relative arena-bg items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-surface-container/40 backdrop-blur-md p-10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] space-y-8 border border-white/20 z-10 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
           <p className="font-headline font-black tracking-widest text-white/60 uppercase text-sm">ROOM CODE</p>
           <div className="flex gap-4 items-center">
             <h1 className="font-headline font-extrabold text-7xl text-uno-yellow tracking-widest bg-black/40 py-4 px-8 rounded-xl border-4 border-dashed border-uno-blue shadow-inner">
               {gameState.id}
             </h1>
             <button onClick={() => setShowQR(true)} className="w-16 h-16 bg-white/10 rounded-xl hover:bg-white/20 flex items-center justify-center border-2 border-white/20 shadow-lg active:scale-95 transition">
               <span className="material-symbols-outlined text-3xl text-white">qr_code_2</span>
             </button>
           </div>
        </div>

        <div className="py-6 border-b border-white/20">
           <h2 className="text-2xl font-extrabold mb-6 text-white drop-shadow-md">Players ({playerCount}/5)</h2>
          <div className="flex flex-col gap-4">
            {gameState.players.map((p, index) => (
              <div key={p.id} className="flex justify-between items-center bg-black/40 px-6 py-4 rounded-2xl border-l-[8px] border-uno-red shadow-md backdrop-blur-sm shadow-[0_10px_20px_rgba(0,0,0,0.3)] border-t border-r border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden border-2 border-white/30">
                    <img src={p.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${p.name}`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold text-lg text-white">{p.name} {p.id === socketId && <span className="text-sm font-black text-uno-green bg-uno-green/20 px-2 py-1 rounded ml-2">YOU</span>}</span>
                </div>
                {p.isHost && <span className="bg-uno-yellow text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(255,170,0,0.6)]">HOST</span>}
              </div>
            ))}
            {[...Array(5 - playerCount)].map((_, i) => (
              <div key={`empty-${i}`} className="flex justify-start items-center bg-black/20 px-6 py-4 rounded-2xl border border-dashed border-white/20 opacity-50">
                <span className="font-medium text-lg text-white/50">Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <div className="space-y-4">
            <button 
              onClick={addBot}
              disabled={playerCount >= 5}
              className="w-full bg-white/10 text-white h-16 py-4 rounded-2xl font-headline font-bold text-xl hover:bg-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed border-2 border-white/20 shadow-lg"
            >
              ADD AI BOT
              <span className="material-symbols-outlined font-black text-2xl">smart_toy</span>
            </button>
            <button 
              onClick={startGame}
              disabled={playerCount < 2}
              className="w-full bg-uno-red text-white h-20 py-5 rounded-2xl font-headline font-black text-2xl shadow-[0_8px_0_0_#b31b25] active:shadow-none active:translate-y-[8px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-3 border-4 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              START GAME
              <span className="material-symbols-outlined font-black text-3xl">rocket_launch</span>
            </button>
            <button 
              onClick={() => useGameStore.getState().disbandRoom()}
              className="w-full bg-transparent text-uno-red h-14 py-2 rounded-2xl font-headline font-bold text-lg hover:bg-uno-red/10 transition-all flex items-center justify-center gap-3 border-2 border-uno-red opacity-80 hover:opacity-100"
            >
              DISBAND ROOM
              <span className="material-symbols-outlined font-black text-2xl">cancel</span>
            </button>
          </div>
        ) : (
          <div className="h-20 flex items-center justify-center border-4 border-dashed border-uno-yellow rounded-2xl bg-uno-yellow/10">
            <span className="font-headline font-bold text-uno-yellow animate-pulse text-xl">
              WAITING FOR HOST TO START...
            </span>
          </div>
        )}

      </div>

      {showQR && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-surface-container-high p-8 rounded-[3rem] text-center space-y-6 flex flex-col items-center max-w-sm w-full border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-3xl font-black text-white">Scan to Join</h2>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '?room=' + gameState.id)}`} alt="Join QR" className="w-[200px] h-[200px] rounded-2xl border-8 border-white shadow-2xl" />
            <button onClick={() => setShowQR(false)} className="w-full bg-uno-red text-white py-4 rounded-xl font-bold text-xl hover:scale-105 active:scale-95 transition shadow-lg mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center pointer-events-none z-50">
        <p className="font-headline font-black text-white/60 text-xs tracking-[0.3em] drop-shadow-sm">
          MADE WITH ❤️ BY <span className="text-uno-yellow drop-shadow-[0_0_10px_#ffaa00]">LORD SUVANKAR</span>
        </p>
      </footer>
    </div>
  );
}
