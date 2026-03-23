import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function LobbyScreen() {
  const { gameState, socketId, startGame, addBot, moveToSpectator, moveToPlayer } = useGameStore();
  const [showQR, setShowQR] = useState(false);

  if (!gameState) return null;

  const isHost = gameState.players[0]?.id === socketId;
  const playerCount = gameState.players.length;
  const spectators = gameState.spectators || [];
  const amISpectator = spectators.some(s => s.id === socketId);

  return (
    <div className="font-body text-white min-h-screen flex flex-col relative arena-bg items-center justify-center p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-surface-container/40 backdrop-blur-md p-6 md:p-10 rounded-3xl md:rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] space-y-6 md:space-y-8 border border-white/20 z-10 text-center mt-8 md:mt-0">

        {/* Room Code */}
        <div className="flex flex-col items-center justify-center gap-2">
           <p className="font-headline font-black tracking-widest text-white/60 uppercase text-xs md:text-sm">ROOM CODE</p>
           <div className="flex flex-col sm:flex-row gap-4 items-center">
             <h1 className="font-headline font-extrabold text-5xl md:text-7xl text-uno-yellow tracking-widest bg-black/40 py-4 px-6 md:px-8 rounded-xl border-4 border-dashed border-uno-blue shadow-inner break-all">
               {gameState.id}
             </h1>
             <button onClick={() => setShowQR(true)} className="w-14 md:w-16 h-14 md:h-16 bg-white/10 rounded-xl hover:bg-white/20 flex items-center justify-center border-2 border-white/20 shadow-lg active:scale-95 transition">
               <span className="material-symbols-outlined text-2xl md:text-3xl text-white">qr_code_2</span>
             </button>
           </div>
           {amISpectator && (
             <div className="mt-2 bg-uno-yellow/20 text-uno-yellow border border-uno-yellow/40 px-4 py-1 rounded-full font-bold text-sm flex items-center gap-2">
               <span className="material-symbols-outlined text-lg">visibility</span> You are a Spectator
             </div>
           )}
        </div>

        {/* Players */}
        <div className="py-4 border-b border-white/20">
           <h2 className="text-xl md:text-2xl font-extrabold mb-4 text-white drop-shadow-md text-left">
             Players ({playerCount}/5)
           </h2>
          <div className="flex flex-col gap-3">
            {gameState.players.map((p, index) => (
              <div key={p.id} className="flex justify-between items-center bg-black/40 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl border-l-[6px] border-uno-red shadow-md backdrop-blur-sm border-t border-r border-b border-white/10">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-white/10 overflow-hidden border-2 border-white/30 shrink-0">
                    <img src={p.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${p.name}`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-bold text-base md:text-lg text-white truncate max-w-[100px] sm:max-w-xs text-left">
                    {p.name} {p.id === socketId && <span className="text-[10px] md:text-sm font-black text-uno-green bg-uno-green/20 px-1 md:px-2 py-0.5 md:py-1 rounded ml-1 md:ml-2 align-middle">YOU</span>}
                    {p.isBot && <span className="text-[10px] font-black text-white/50 bg-white/10 px-1 rounded ml-1 align-middle">BOT</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {p.isHost && <span className="bg-uno-yellow text-black font-black text-[10px] md:text-xs px-2 md:px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_15px_rgba(255,170,0,0.6)]">HOST</span>}
                  {isHost && !p.isHost && !p.isBot && (
                    <button
                      onClick={() => moveToSpectator(p.id)}
                      title="Move to Spectator"
                      className="text-white/40 hover:text-uno-yellow transition text-sm flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/10"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span className="text-[10px] font-bold hidden sm:block">→ SPEC</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {[...Array(Math.max(0, 5 - playerCount))].map((_, i) => (
              <div key={`empty-${i}`} className="flex justify-start items-center bg-black/20 px-6 py-4 rounded-2xl border border-dashed border-white/20 opacity-50">
                <span className="font-medium text-lg text-white/50">Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spectators Section */}
        {(spectators.length > 0 || isHost) && (
          <div className="py-4 border-b border-white/10">
            <h2 className="text-lg md:text-xl font-extrabold mb-4 text-uno-yellow/80 text-left flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">visibility</span>
              Spectators ({spectators.length}/4)
            </h2>
            <div className="flex flex-col gap-3">
              {spectators.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-uno-yellow/10 px-4 md:px-6 py-3 rounded-xl border-l-[6px] border-uno-yellow/60 border-t border-r border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border-2 border-uno-yellow/30 shrink-0">
                      <img src={s.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${s.name}`} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-sm md:text-base text-uno-yellow/80 truncate max-w-[120px] sm:max-w-xs text-left">
                      {s.name} {s.id === socketId && <span className="text-[10px] font-black text-uno-yellow bg-uno-yellow/20 px-1 rounded ml-1 align-middle">YOU</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-uno-yellow/60 text-[10px] font-black uppercase tracking-widest hidden sm:block">SPECTATOR</span>
                    {isHost && playerCount < 5 && (
                      <button
                        onClick={() => moveToPlayer(s.id)}
                        title="Move to Players"
                        className="text-white/40 hover:text-uno-green transition text-sm flex items-center gap-1 bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg border border-white/10"
                      >
                        <span className="material-symbols-outlined text-base">person_add</span>
                        <span className="text-[10px] font-bold hidden sm:block">→ PLAY</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {spectators.length === 0 && (
                <div className="flex justify-start items-center bg-black/10 px-6 py-3 rounded-2xl border border-dashed border-uno-yellow/20 opacity-50">
                  <span className="font-medium text-sm text-uno-yellow/40">No spectators yet...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Host Controls / Waiting */}
        {!amISpectator ? (
          isHost ? (
            <div className="space-y-4">
              <button onClick={addBot} disabled={playerCount >= 5} className="w-full bg-white/10 text-white h-16 py-4 rounded-2xl font-headline font-bold text-xl hover:bg-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed border-2 border-white/20 shadow-lg">
                ADD AI BOT <span className="material-symbols-outlined font-black text-2xl">smart_toy</span>
              </button>
              <button onClick={startGame} disabled={playerCount < 2} className="w-full bg-uno-red text-white h-20 py-5 rounded-2xl font-headline font-black text-2xl shadow-[0_8px_0_0_#b31b25] active:shadow-none active:translate-y-[8px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-3 border-4 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed">
                START GAME <span className="material-symbols-outlined font-black text-3xl">rocket_launch</span>
              </button>
              <button onClick={() => useGameStore.getState().disbandRoom()} className="w-full bg-transparent text-uno-red h-14 py-2 rounded-2xl font-headline font-bold text-lg hover:bg-uno-red/10 transition-all flex items-center justify-center gap-3 border-2 border-uno-red opacity-80 hover:opacity-100">
                DISBAND ROOM <span className="material-symbols-outlined font-black text-2xl">cancel</span>
              </button>
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center border-4 border-dashed border-uno-yellow rounded-2xl bg-uno-yellow/10">
              <span className="font-headline font-bold text-uno-yellow animate-pulse text-xl">WAITING FOR HOST TO START...</span>
            </div>
          )
        ) : (
          <div className="h-20 flex items-center justify-center border-4 border-dashed border-uno-yellow/50 rounded-2xl bg-uno-yellow/5">
            <span className="font-headline font-bold text-uno-yellow/70 text-base text-center px-4">👁️ Spectating — The game will start soon. You can see all cards in hand!</span>
          </div>
        )}
      </div>

      {showQR && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center">
          <div className="bg-surface-container-high p-8 rounded-[3rem] text-center space-y-6 flex flex-col items-center max-w-sm w-full border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-3xl font-black text-white">Scan to Join</h2>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '?room=' + gameState.id)}`} alt="Join QR" className="w-[200px] h-[200px] rounded-2xl border-8 border-white shadow-2xl" />
            <button onClick={() => setShowQR(false)} className="w-full bg-uno-red text-white py-4 rounded-xl font-bold text-xl hover:scale-105 active:scale-95 transition shadow-lg mt-4">Close</button>
          </div>
        </div>
      )}

      <footer className="absolute bottom-4 md:bottom-6 w-full text-center pointer-events-none z-50">
        <p className="font-headline font-black text-white/60 text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.3em] drop-shadow-sm px-4">
          MADE WITH ❤️ BY <span className="text-uno-yellow drop-shadow-[0_0_10px_#ffaa00]">LORD SUVANKAR</span>
        </p>
      </footer>
    </div>
  );
}
