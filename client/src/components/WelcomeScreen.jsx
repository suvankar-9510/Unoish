import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function WelcomeScreen() {
  const [name, setName] = useState('');
  const setPlayerName = useGameStore(state => state.setPlayerName);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      useGameStore.getState().setPlayerName(name.trim());
      const state = useGameStore.getState();
      if (state.pendingRoomId) {
        state.joinRoom(state.pendingRoomId);
      }
    }
  };

  return (
    <div className="font-body text-white overflow-hidden min-h-screen flex flex-col relative arena-bg">
      <main className="flex-grow flex flex-col items-center justify-center px-6 z-10">
        <div className="w-full max-w-md flex flex-col gap-8">
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative w-36 h-48 flex items-center justify-center hover:scale-110 transition-transform duration-500 z-20">
              <div className="absolute inset-0 bg-uno-yellow rotate-[-20deg] rounded-2xl border-4 border-white flex items-center justify-center shadow-[0_0_30px_rgba(255,170,0,0.4)] animate-[pulse_4s_infinite]">
                <span className="absolute top-2 left-2 text-white font-black text-xs">2</span>
                <div className="w-16 h-20 bg-white/20 rounded-full rotate-[-20deg]"></div>
              </div>
              <div className="absolute inset-0 bg-uno-blue rotate-[15deg] translate-x-6 rounded-2xl border-4 border-white flex items-center justify-center shadow-[0_0_30px_rgba(0,85,255,0.4)] animate-[pulse_4s_infinite_1s]">
                <span className="absolute top-2 left-2 text-white font-black text-xs">7</span>
                <div className="w-16 h-20 bg-white/20 rounded-full rotate-[15deg]"></div>
              </div>
              <div className="absolute inset-0 bg-uno-red rounded-2xl border-4 border-white flex items-center justify-center shadow-[0_0_50px_rgba(255,85,85,0.6)] animate-[bounce_2s_infinite]">
                <div className="w-20 h-28 bg-white rounded-t-full rounded-b-full shadow-inner flex items-center justify-center rotate-[-20deg]">
                  <span className="font-black text-uno-red text-6xl rotate-[20deg] drop-shadow-md">C</span>
                </div>
              </div>
            </div>
            
            <h1 className="font-headline font-black text-6xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-uno-yellow via-white to-uno-red mt-8 drop-shadow-[0_0_20px_#ffffff]">
              Card Clash
            </h1>
            <p className="font-body text-white/80 font-medium max-w-[280px]">
              The ultimate fast-paced arena for legendary tacticians.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-surface-container/40 p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/20 space-y-8 backdrop-blur-md">
            <div className="space-y-3">
              <label className="font-headline font-black text-xs uppercase tracking-[0.2em] text-white/60 ml-2" htmlFor="player-name">
                Identify Yourself
              </label>
              <div className="relative group">
                <input 
                  className="w-full bg-white/10 border-2 border-white/20 h-16 px-6 rounded-2xl font-headline font-bold text-xl text-white focus:ring-0 focus:border-uno-blue focus:bg-white/20 transition-all placeholder:text-white/40 outline-none shadow-inner" 
                  id="player-name" 
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="WildPlayer_99" 
                  type="text"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-uno-red text-white h-20 py-5 rounded-2xl font-headline font-black text-2xl shadow-[0_8px_0_0_#b31b25] hover:translate-y-[4px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-center gap-3 border-4 border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              PLAY
              <span className="material-symbols-outlined font-black text-3xl">play_arrow</span>
            </button>
          </form>
          
        </div>
      </main>

      {/* Decorative Blur Orbs */}
      <div className="absolute -top-20 -right-20 w-[600px] h-[600px] bg-uno-red/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-uno-blue/30 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center pointer-events-none z-50">
        <p className="font-headline font-black text-white/60 text-xs tracking-[0.3em] drop-shadow-sm">
          MADE WITH ❤️ BY <span className="text-uno-yellow drop-shadow-[0_0_10px_#ffaa00]">LORD SUVANKAR</span>
        </p>
      </footer>
    </div>
  );
}
