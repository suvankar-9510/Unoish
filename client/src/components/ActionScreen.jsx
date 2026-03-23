import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Scanner } from '@yudiel/react-qr-scanner';

export default function ActionScreen() {
  const { createRoom, joinRoom, playerName } = useGameStore();
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' or 'join'

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.trim().length === 4) {
      joinRoom(joinCode.trim().toUpperCase());
    }
  };

  return (
    <div className="font-body text-white min-h-screen flex flex-col overflow-x-hidden relative arena-bg items-center justify-center px-6">
      
      <div className="absolute top-10 left-10 text-xl font-bold font-headline text-white/80">
        Welcome, <span className="text-uno-yellow font-black animate-pulse">{playerName}</span>!
      </div>
      
      <div className="w-full max-w-md bg-surface-container/40 backdrop-blur-md p-10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] space-y-10 border border-white/20 z-10">
        
        <h1 className="font-headline font-black text-4xl text-center text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Select <span className="text-transparent bg-clip-text bg-gradient-to-r from-uno-blue to-uno-green">Mode</span>
        </h1>

        {!mode && (
          <div className="flex flex-col gap-6">
            <button 
              onClick={() => createRoom()}
              className="w-full bg-uno-blue text-white h-20 py-5 rounded-2xl font-headline font-black text-2xl shadow-[0_8px_0_0_#003076] hover:translate-y-[4px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-center gap-3 border-4 border-white/20"
            >
              CREATE ROOM
              <span className="material-symbols-outlined font-black text-3xl">add_circle</span>
            </button>
            <div className="flex gap-4">
              <button 
                onClick={() => setMode('join')}
                className="flex-1 bg-uno-green text-white h-20 py-5 rounded-2xl font-headline font-black text-2xl shadow-[0_8px_0_0_#004820] hover:translate-y-[4px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-center gap-2 border-4 border-white/20"
              >
                JOIN
                <span className="material-symbols-outlined font-black text-3xl">login</span>
              </button>
              <button 
                onClick={() => setMode('scan')}
                className="w-20 bg-uno-yellow text-uno-black h-20 rounded-2xl shadow-[0_8px_0_0_#cc8800] hover:translate-y-[4px] active:shadow-none active:translate-y-[8px] transition-all flex items-center justify-center border-4 border-white/20"
              >
                <span className="material-symbols-outlined font-black text-4xl">qr_code_scanner</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-8">
            <div className="space-y-4">
              <label className="font-headline font-black text-xs uppercase tracking-[0.2em] text-white/60 ml-2" htmlFor="room-code">
                Enter Room Code
              </label>
              <input 
                className="w-full bg-white/10 border-2 border-white/20 h-20 px-6 rounded-2xl font-headline font-black text-4xl text-center uppercase focus:ring-0 focus:border-uno-green focus:bg-white/20 transition-all placeholder:text-white/20 outline-none tracking-[0.3em] text-white shadow-inner" 
                id="room-code"
                maxLength={4}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="XXXX" 
                type="text"
              />
            </div>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setMode(null)}
                className="w-1/3 bg-surface-variant text-on-surface h-16 py-4 rounded-2xl font-headline font-black text-xl hover:bg-surface-dim transition-all flex items-center justify-center"
              >
                BACK
              </button>
              <button 
                type="submit"
                disabled={joinCode.length !== 4}
                className="w-2/3 bg-uno-green text-white h-16 py-4 rounded-2xl font-headline font-black text-xl shadow-[0_6px_0_0_#004820] active:shadow-none active:translate-y-[6px] transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                JOIN
              </button>
            </div>
          </form>
        )}

        {mode === 'scan' && (
          <div className="space-y-6">
            <h2 className="text-center font-headline font-bold text-on-surface-variant uppercase tracking-widest text-xs">Scan Room QR Code</h2>
            <div className="w-full h-64 overflow-hidden rounded-2xl border-4 border-dashed border-uno-blue">
              <Scanner 
                onScan={(detectedCodes) => {
                  if (detectedCodes.length > 0) {
                    const text = detectedCodes[0].rawValue;
                    try {
                      const url = new URL(text);
                      const room = url.searchParams.get('room');
                      if (room) joinRoom(room);
                    } catch (e) {
                      if (text && text.length === 4) joinRoom(text);
                    }
                  }
                }}
                onError={(error) => console.log(error?.message)}
                components={{ finder: true, audio: false }}
              />
            </div>
            <button 
                onClick={() => setMode(null)}
                className="w-full bg-surface-variant text-on-surface h-16 py-4 rounded-2xl font-headline font-black text-xl hover:bg-surface-dim transition-all flex items-center justify-center"
              >
                BACK
            </button>
          </div>
        )}
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-uno-blue/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-uno-green/20 rounded-full blur-[100px] pointer-events-none"></div>

      {/* Footer */}
      <footer className="absolute bottom-6 w-full text-center pointer-events-none z-50">
        <p className="font-headline font-black text-white/60 text-xs tracking-[0.3em] drop-shadow-sm">
          MADE WITH ❤️ BY <span className="text-uno-yellow drop-shadow-[0_0_10px_#ffaa00]">LORD SUVANKAR</span>
        </p>
      </footer>
    </div>
  );
}
