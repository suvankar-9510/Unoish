import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

function TurnTimer({ turnStartTime, turnDuration }) {
  const [timeLeft, setTimeLeft] = useState(turnDuration / 1000);

  useEffect(() => {
    if (!turnStartTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, turnDuration - (Date.now() - turnStartTime));
      setTimeLeft(Math.ceil(remaining / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [turnStartTime, turnDuration]);

  const percentage = (timeLeft / (turnDuration / 1000)) * 100;
  const isDanger = timeLeft <= 3;

  return (
    <div className="absolute top-0 left-0 w-full h-1.5 bg-surface-variant overflow-hidden z-[100]">
      <div 
        className={`h-full transition-all duration-100 ${isDanger ? 'bg-uno-red animate-pulse' : 'bg-uno-green'}`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}

export default function GameBoard() {
  const { gameState, socketId, playCard, drawCard, sendEmoji, activeEmojis, activePunishments, unoCalls, activeMessages, activeSkips, isReversing } = useGameStore();
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [peekPlayerId, setPeekPlayerId] = useState(null); // Spectator long-press peek
  const longPressTimer = React.useRef(null);

  const startLongPress = (playerId) => {
    longPressTimer.current = setTimeout(() => setPeekPlayerId(playerId), 400);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  if (!gameState) return null;

  const myPlayerIndex = gameState.players.findIndex(p => p.id === socketId);
  const myPlayer = gameState.players[myPlayerIndex];
  const amIPreGameSpectator = gameState.spectators?.some(s => s.id === socketId) || false;
  // Full spectator = either pre-game spectator who joined with code, OR a player who won
  const amISpectating = amIPreGameSpectator || (myPlayer?.finishedRank > 0);
  const spectatorCount = gameState.spectators?.length || 0;
  
  // For pre-game spectators: show ALL players; for players: show only opponents
  const opponents = amIPreGameSpectator
    ? gameState.players // all players visible as "opponents" to the spectator
    : gameState.players.filter((_, idx) => idx !== myPlayerIndex);

  const isMyTurn = gameState.currentPlayerIndex === myPlayerIndex;
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  const handleCardClick = (card) => {
    if (!isMyTurn) return;
    
    // Check basic validity locally first (optional)
    const canPlay = card.color === topCard.color || card.value === topCard.value 
      || card.type === 'wild' || (topCard.declaredColor === card.color);

    if (canPlay) {
      if (card.type === 'wild') {
        setShowColorPicker(card.id);
      } else {
        playCard(card.id);
      }
    }
  };

  const handleColorPicked = (color) => {
    playCard(showColorPicker, color);
    setShowColorPicker(null);
  };

  const getCardBgColor = (color) => {
    switch(color) {
      case 'red': return 'bg-uno-red';
      case 'blue': return 'bg-uno-blue';
      case 'green': return 'bg-uno-green';
      case 'yellow': return 'bg-uno-yellow';
      default: return 'bg-uno-black';
    }
  };

  const getCardTextColor = (color) => {
    switch(color) {
      case 'red': return 'text-uno-red';
      case 'blue': return 'text-uno-blue';
      case 'green': return 'text-uno-green';
      case 'yellow': return 'text-uno-yellow';
      default: return 'text-uno-black';
    }
  };

  const renderCardValue = (value) => {
    if (value === 'skip') return <span className="material-symbols-outlined font-black" style={{fontVariationSettings: "'FILL' 1"}}>block</span>;
    if (value === 'reverse') return <span className="material-symbols-outlined font-black" style={{fontVariationSettings: "'FILL' 1"}}>sync</span>;
    if (value === 'draw2') return '+2';
    if (value === 'wild') return <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>auto_fix_high</span>;
    if (value === 'wild4') return '+4';
    return value;
  };

  return (
    <div className={`arena-bg font-body text-white overflow-hidden h-screen flex flex-col relative ${activePunishments.find(p => p.victimId === socketId) ? 'animate-[bounce_0.2s_infinite]' : ''}`}>
      <TurnTimer turnStartTime={gameState.turnStartTime} turnDuration={gameState.turnDuration} />
      
      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-black/40 backdrop-blur-xl rounded-b-3xl shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-white font-headline tracking-tight uppercase">Room: {gameState.id}</span>
          {/* Spectator Counter */}
          {spectatorCount > 0 && (
            <div className="flex items-center gap-1 bg-uno-yellow/20 border border-uno-yellow/40 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-uno-yellow text-sm">visibility</span>
              <span className="text-uno-yellow font-black text-xs">{spectatorCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {amIPreGameSpectator ? (
            <div className="flex items-center gap-2 bg-uno-yellow/20 border border-uno-yellow/40 px-3 py-1 rounded-full">
              <span className="material-symbols-outlined text-uno-yellow text-base">visibility</span>
              <span className="text-uno-yellow font-black text-xs uppercase tracking-wider">Spectating</span>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-surface-variant">
              <img src={myPlayer?.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${myPlayer?.name}`} alt="Me" className="w-full h-full object-cover"/>
            </div>
          )}
          <span 
            onClick={() => setShowSettings(true)} 
            className="material-symbols-outlined text-white/60 cursor-pointer hover:text-white transition hover:rotate-90"
          >
            settings
          </span>
        </div>
      </header>

      {/* Floating Emojis */}
      {activeEmojis.map(e => {
        const isMe = e.senderId === socketId;
        return (
          <div 
            key={e.id} 
            className={`fixed z-[200] text-7xl animate-bounce pointer-events-none drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] ${isMe ? 'bottom-40 left-10' : 'top-32 left-1/2'} -translate-x-1/2`}
          >
            {e.emoji}
          </div>
        );
      })}

      {/* Emoji Bar */}
      <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
        {['🔥', '😂', '😭', '😡'].map(em => (
          <button 
            key={em}
            onClick={() => sendEmoji(em)}
            className="w-14 h-14 bg-white/10 hover:bg-white/30 backdrop-blur-md rounded-full text-3xl flex items-center justify-center border border-white/20 hover:scale-110 active:scale-95 transition-all shadow-lg"
          >
            {em}
          </button>
        ))}
      </div>

      {/* Main Board */}
      <main className={`flex-1 relative mt-20 mb-24 px-6 overflow-hidden transition-transform duration-500 will-change-transform ${isReversing ? 'rotate-[-3deg] scale-[0.98]' : 'rotate-0 scale-100'}`}>
        <div className="absolute inset-0 table-glow pointer-events-none"></div>
        
        {/* Opponents — grid layout for spectators, flex row for players */}
        <div className={`absolute top-4 md:top-6 left-1/2 -translate-x-1/2 w-full px-2 md:px-6 z-20
          ${ amIPreGameSpectator
            ? `grid place-items-center gap-x-2 gap-y-6 md:gap-x-4
               ${ opponents.length <= 2 ? 'grid-cols-2'
                  : opponents.length === 3 ? 'grid-cols-3'
                  : opponents.length === 4 ? 'grid-cols-4'
                  : 'grid-cols-5' }`
            : 'flex justify-center gap-2 md:gap-8 flex-wrap' }`}>
          {opponents.map((opp, i) => {
            const punish = activePunishments.find(p => p.victimId === opp.id);
            const isSkipped = activeSkips.some(s => s.victimId === opp.id);
            return (
              <div key={opp.id} className={`flex flex-col items-center justify-center relative ${opp.finishedRank ? 'opacity-50 saturate-50' : ''} ${isSkipped ? 'animate-[bounce_0.2s_ease-in-out_infinite]' : ''}`}>
                {isSkipped && (
                  <div className="absolute top-12 md:top-14 z-[250] font-headline font-black text-lg md:text-2xl text-uno-red drop-shadow-[0_0_15px_#ff5555] rotate-[-15deg] border-[3px] border-uno-red bg-black/80 backdrop-blur-sm px-2 py-0 rounded">
                    SKIPPED!
                  </div>
                )}
                {punish && (
                  <div className="absolute -bottom-10 z-[200] font-headline font-black text-5xl text-uno-red animate-ping drop-shadow-[0_0_20px_#ff5555]">
                    +{punish.amount}
                  </div>
                )}
                <div className={`relative rounded-full p-1 border-2
                  ${amIPreGameSpectator ? 'w-14 h-14 md:w-20 md:h-20' : 'w-12 h-12 md:w-16 md:h-16'}
                  ${gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === opp.id) ? 'glow-active border-uno-green bg-uno-green/20 pulse-ring' : 'border-transparent bg-white/10'}
                  ${opp.disconnected ? 'opacity-30 grayscale' : ''}`}>
                   <div className="absolute inset-1 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center relative">
                      <img src={opp.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${opp.name}`} alt="avatar" className="w-full h-full object-cover" />
                      {opp.disconnected && (
                         <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                            <span className="material-symbols-outlined text-white animate-spin text-sm md:text-xl">sync</span>
                         </div>
                      )}
                   </div>
                   
                   {/* Flashing UNO Warning Badge */}
                   {opp.hand?.length === 1 && !opp.finishedRank && !opp.disconnected && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-uno-red text-white text-[9px] md:text-[11px] font-black px-2 py-1 rounded-full shadow-[0_0_15px_#ff5555] border-2 border-white z-[60] skew-x-[-10deg]"
                      >
                        UNO!
                      </motion.div>
                   )}
                </div>
                <span className={`font-label font-bold text-[10px] md:text-xs uppercase tracking-widest ${opp.disconnected ? 'text-uno-red animate-pulse' : 'text-white/70'} mt-1 md:mt-2 max-w-[60px] md:max-w-none truncate text-center flex flex-col items-center leading-tight`}>
                  {opp.name}
                  {opp.finishedRank ? (
                    <span className="text-uno-yellow font-black text-[12px] md:text-sm drop-shadow-md mt-1 animate-bounce">🏆 WINNER {opp.finishedRank}</span>
                  ) : opp.disconnected ? (
                    <span className="text-[10px] mt-1">(Wait...)</span>
                  ) : null}
                </span>

                {!opp.finishedRank && !myPlayer?.finishedRank && (
                  <div className="absolute -bottom-2 -right-2 md:bottom-2 md:-right-2 bg-uno-red text-white text-[10px] md:text-xs font-black w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full border border-white shadow-lg z-50">
                    {opp.hand?.length || opp.cardCount}
                  </div>
                )}

                {/* Spectator Mode: show card count + long-press hint badge */}
                {amISpectating && !opp.finishedRank && (
                  <div
                    onMouseDown={() => startLongPress(opp.id)}
                    onMouseUp={cancelLongPress}
                    onTouchStart={() => startLongPress(opp.id)}
                    onTouchEnd={cancelLongPress}
                    className="absolute -bottom-2 -right-2 bg-uno-yellow text-uno-black text-[9px] md:text-[10px] font-black w-8 h-8 md:w-9 md:h-9 flex flex-col items-center justify-center rounded-full border-2 border-white shadow-lg z-50 cursor-pointer select-none"
                  >
                    <span>{opp.hand?.length ?? '?'}</span>
                    <span style={{fontSize: '7px', lineHeight: '1'}}>hold</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* UNO Call Animation Overlay */}
        {unoCalls?.map(uc => (
          <div key={uc.uid} className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center z-[250] animate-[bounce_0.5s_cubic-bezier(0,0,0.2,1)_3]">
            <div className="bg-black/60 backdrop-blur-sm p-8 md:p-16 rounded-[2rem] md:rounded-[4rem] flex flex-col items-center border-[4px] md:border-[8px] border-uno-red shadow-[0_0_50px_rgba(255,85,85,0.8)] md:shadow-[0_0_100px_rgba(255,85,85,0.8)] transform -rotate-12 scale-100 md:scale-125">
              <span className="font-headline font-black text-[80px] md:text-[150px] text-transparent bg-clip-text bg-gradient-to-br from-uno-yellow to-uno-red drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] mb-2 md:mb-4">UNO!</span>
              <span className="font-label font-bold text-xl md:text-4xl text-uno-black bg-uno-yellow px-4 md:px-8 py-2 md:py-3 rounded-full shadow-2xl skew-x-[-10deg] border-2 md:border-4 border-white">{uc.name.toUpperCase()} HAS 1 CARD!</span>
            </div>
          </div>
        ))}

        {/* System Messages Overlay */}
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 pointer-events-none items-center">
          {activeMessages?.map(msg => {
            const styles = {
              disconnect: 'bg-uno-red/90 text-white border-white/30 shadow-[0_5px_15px_rgba(255,85,85,0.5)]',
              reconnect:  'bg-uno-green/90 text-white border-white/30 shadow-[0_5px_15px_rgba(0,200,100,0.5)]',
              ai:         'bg-uno-yellow text-uno-black border-white shadow-[0_5px_15px_rgba(255,170,0,0.5)]',
            }[msg.type] || 'bg-uno-yellow text-uno-black border-white shadow-[0_5px_15px_rgba(255,170,0,0.5)]';
            const icon = { disconnect: '📡', reconnect: '✅', ai: '🤖' }[msg.type] || '🤖';
            return (
              <div key={msg.id} className={`${styles} font-headline font-black text-xs md:text-sm px-5 py-2 rounded-full border-2 animate-[bounce_0.5s_ease] flex items-center gap-2 whitespace-nowrap`}>
                <span>{icon}</span> {msg.text}
              </div>
            );
          })}
        </div>

        {/* Center Field */}
        <div className="h-full flex items-center justify-center shrink-0 mt-8 md:mt-0">
          <div className="relative w-full max-w-sm ml-0 md:ml-12 aspect-square flex flex-col items-center justify-center">
            <div className="absolute inset-0 border-[3px] border-dashed border-white/5 rounded-full pulse-ring"></div>
            
            {/* Rotate Direction */}
            <div className="absolute -top-6 md:-top-10 left-1/2 -translate-x-1/2 text-white/40">
              <span className={`material-symbols-outlined text-4xl md:text-5xl ${gameState.direction === 1 ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_4s_linear_infinite_reverse]'}`}>sync</span>
            </div>

            <div className="flex justify-center items-center gap-8 md:gap-24 z-10 scale-90 md:scale-[1.2] pt-4 -mt-8 md:mt-0">
              {/* Draw Pile */}
              <div onClick={drawCard} className="relative w-[6.5rem] h-36 bg-uno-black rounded-[14px] shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-transform border-[3px] border-white/90 shrink-0 group">
                <div className="absolute inset-1 border border-white/40 rounded-lg pointer-events-none z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 pointer-events-none z-10"></div>
                <div className="w-[3.5rem] h-[4.5rem] bg-uno-red rounded-t-full rounded-b-full shadow-lg border-2 border-uno-yellow flex items-center justify-center rotate-[-20deg]">
                  <span className="font-black text-2xl text-white rotate-[20deg] tracking-tighter">UNO</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-full h-full bg-white/20 rounded-xl -z-10 translate-x-1 translate-y-1"></div>
                <div className="absolute -top-1 -left-1 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded-br text-[10px] font-black shadow z-20">
                  {gameState.deck.length}
                </div>
              </div>

              {/* Discard Pile History (Top 5 cards) */}
              <div className="relative w-[6.5rem] h-36 shrink-0">
                <AnimatePresence>
                {gameState.discardPile.slice(-5).map((dc, idx, arr) => {
                  const isTop = idx === arr.length - 1;
                  return (
                    <motion.div 
                      key={dc.id} 
                      initial={isTop ? { scale: 1.5, rotate: Math.random() * 60 - 30, opacity: 0, y: -100 } : false}
                      animate={{ scale: 1, rotate: isTop ? 1 : -6 + (idx * 3), y: -idx * 3, x: idx * 4, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className={`absolute inset-0 ${getCardBgColor(dc.declaredColor || dc.color)} rounded-[14px] ${isTop ? 'shadow-[0_0_50px_rgba(255,255,255,0.4)]' : 'shadow-xl'} flex flex-col justify-between p-2 border-[3px] border-white/90`}
                      style={{ 
                        zIndex: 10 + idx
                      }}
                    >
                      <div className="absolute inset-1 border border-white/40 rounded-lg pointer-events-none z-10"></div>
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 rounded-[11px] pointer-events-none z-10"></div>
                      
                      <span className="font-headline font-black text-xl text-white drop-shadow-md leading-none z-10 pl-1">{renderCardValue(dc.value)}</span>
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        {dc.type === 'wild' ? (
                           <div className="w-[3.5rem] h-[4.5rem] bg-uno-black rounded-t-full rounded-b-full flex items-center justify-center shadow-lg border-2 border-white/50 rotate-[-20deg]">
                             <span className="material-symbols-outlined text-white text-4xl drop-shadow-md rotate-[20deg]" style={{fontVariationSettings: "'FILL' 1"}}>auto_fix_high</span>
                           </div>
                        ) : (
                           <div className="w-[3.5rem] h-[4.5rem] bg-white rounded-t-full rounded-b-full flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.4)] rotate-[-20deg]">
                             <div className="absolute inset-1 border border-black/10 rounded-t-full rounded-b-full pointer-events-none"></div>
                             <span className={`font-black text-4xl ${getCardTextColor(dc.declaredColor || dc.color)} drop-shadow-md rotate-[20deg]`}>{renderCardValue(dc.value)}</span>
                           </div>
                        )}
                      </div>
                      
                      <span className="font-headline font-black text-xl text-white drop-shadow-md leading-none rotate-180 self-end z-10 pr-1">{renderCardValue(dc.value)}</span>
                      
                      {dc.type === 'wild' && (
                         <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 -z-10 rounded-lg overflow-hidden opacity-50">
                            <div className="bg-uno-red"></div><div className="bg-uno-blue"></div>
                            <div className="bg-uno-yellow"></div><div className="bg-uno-green"></div>
                         </div>
                      )}
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Player Hand — hidden for pre-game spectators who have no cards */}
        {!amIPreGameSpectator && <div className={`absolute bottom-[-50px] md:bottom-[-60px] left-1/2 -translate-x-1/2 w-[100vw] max-w-6xl px-2 md:px-4 overflow-x-auto no-scrollbar pt-10 pb-16 md:pb-8 transition-transform duration-500 origin-bottom flex justify-center ${activeSkips.some(s => s.victimId === socketId) ? 'animate-[bounce_0.2s_ease-in-out_infinite] blur-[2px]' : ''}`}>
          
          {/* My Player Skips / Action Overlay */}
          {activeSkips.some(s => s.victimId === socketId) && (
             <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[300] font-headline font-black text-4xl md:text-6xl text-uno-red drop-shadow-[0_0_25px_#ff5555] rotate-[-5deg] border-4 border-uno-red bg-black/80 px-6 py-2 rounded-xl">
               YOU WERE SKIPPED!
             </div>
          )}
          <motion.div 
             layout
             className={`flex justify-center min-w-max pb-8 shrink-0 transition-transform origin-bottom duration-500 will-change-transform ${!isMyTurn || myPlayer?.finishedRank ? 'scale-[0.55] sm:scale-75 translate-y-[40px] md:translate-y-24 opacity-60' : 'scale-[0.70] sm:scale-95 opacity-100 hover:translate-y-[-10px] md:hover:translate-y-[-20px]'}`}
             style={{ marginLeft: `${myPlayer?.hand.length > 5 ? Math.max(0, (myPlayer.hand.length - 5) * 15) : 0}px` }}
          >
            <AnimatePresence mode="popLayout">
            {myPlayer?.hand?.map((card, i) => {
              const baseBg = getCardBgColor(card.color);
              const textC = getCardTextColor(card.color);

              // A card is playable if it's my turn AND the card matches
              const canPlay = isMyTurn && !myPlayer.finishedRank && topCard && (
                card.color === topCard.color ||
                card.value === topCard.value ||
                card.type === 'wild' ||
                (topCard.declaredColor && card.color === topCard.declaredColor)
              );
              // Not my turn at all → full grey
              const notMyTurn = !isMyTurn || myPlayer?.finishedRank;
              // My turn but this specific card is unplayable
              const unplayable = !notMyTurn && !canPlay;

              return (
                <motion.div 
                  layout
                  initial={{ y: 200, opacity: 0, scale: 0.5 }}
                  animate={{ y: Math.abs(i - myPlayer.hand.length/2) * 2, opacity: 1, scale: 1, rotate: (i - myPlayer.hand.length/2) * 5 }}
                  exit={{ y: -300, scale: 1.5, opacity: 0, rotate: Math.random() * 45 - 20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  key={card.id} 
                  onClick={() => handleCardClick(card)}
                  className={`relative w-[6.5rem] h-36 shrink-0 rounded-[14px] flex flex-col justify-between p-2 border-[3px] shadow-[0_15px_30px_rgba(0,0,0,0.6)] cursor-pointer group origin-bottom -ml-8 md:-ml-10
                    ${baseBg}
                    ${canPlay
                      ? 'border-[#FFD700] ring-4 ring-[#FFD700]/70 ring-offset-0 shadow-[0_0_22px_5px_rgba(255,215,0,0.55)] z-20 hover:-translate-y-12 hover:z-30 hover:scale-105 brightness-110 animate-[pulse_1.5s_ease-in-out_infinite]'
                      : unplayable
                        ? 'border-white/30 opacity-45 grayscale hover:z-30 hover:-translate-y-2 cursor-not-allowed'
                        : 'border-white/30 opacity-40 grayscale-[0.6] hover:-translate-y-2'}
                  `}
                  style={{ zIndex: 10 + i }}
                >
                  {/* Golden "playable" shimmer overlay */}
                  {canPlay && (
                    <div className="absolute inset-0 rounded-[11px] pointer-events-none z-20 bg-gradient-to-tr from-yellow-300/20 via-transparent to-yellow-100/10 animate-[pulse_1.5s_ease-in-out_infinite]" />
                  )}
                  <div className="absolute inset-1 border border-white/40 rounded-lg pointer-events-none z-10"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 rounded-[11px] pointer-events-none z-10"></div>
                  
                  <span className="font-headline font-black text-xl text-white drop-shadow-md leading-none z-10 pl-1">{renderCardValue(card.value)}</span>
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    {card.type === 'wild' ? (
                       <div className="w-[3.5rem] h-[4.5rem] bg-uno-black rounded-t-full rounded-b-full flex items-center justify-center shadow-lg border-2 border-white/50 rotate-[-20deg]">
                         <span className="material-symbols-outlined text-white text-4xl drop-shadow-md rotate-[20deg]" style={{fontVariationSettings: "'FILL' 1"}}>auto_fix_high</span>
                       </div>
                    ) : (
                       <div className="w-[3.5rem] h-[4.5rem] bg-white rounded-t-full rounded-b-full flex items-center justify-center shadow-[inset_0_0_15px_rgba(0,0,0,0.4)] rotate-[-20deg]">
                         <div className="absolute inset-1 border border-black/10 rounded-t-full rounded-b-full pointer-events-none"></div>
                         <span className={`font-black text-4xl ${textC} drop-shadow-md rotate-[20deg]`}>{renderCardValue(card.value)}</span>
                       </div>
                    )}
                  </div>
                  
                  <span className="font-headline font-black text-xl text-white drop-shadow-md leading-none rotate-180 self-end z-10 pr-1">{renderCardValue(card.value)}</span>
                  
                  {card.type === 'wild' && (
                     <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 -z-10 rounded-lg overflow-hidden opacity-50">
                        <div className="bg-uno-red"></div><div className="bg-uno-blue"></div>
                        <div className="bg-uno-yellow"></div><div className="bg-uno-green"></div>
                     </div>
                  )}
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        </div>}
      </main>

      {/* My Player Punishment Overlay */}
      {activePunishments.find(p => p.victimId === socketId) && (
         <div className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center">
           <div className="text-[250px] font-black text-uno-red animate-ping drop-shadow-[0_0_100px_#ff5555]">
              +{activePunishments.find(p => p.victimId === socketId).amount}
           </div>
           <div className="absolute inset-0 bg-red-500/20 animate-pulse"></div>
         </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-md flex items-center justify-center px-4">
          <div className="bg-surface-container-high p-6 md:p-8 rounded-3xl md:rounded-[3rem] text-center space-y-6 max-w-sm w-full border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <h2 className="text-3xl md:text-4xl font-black text-white">Options</h2>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => {
                  useGameStore.getState().leaveRoom();
                  setShowSettings(false);
                }} 
                className="w-full bg-uno-red text-white py-4 rounded-xl font-black text-xl hover:scale-105 active:scale-95 transition shadow-lg"
              >
                Leave Room
              </button>
              <button 
                onClick={() => setShowSettings(false)} 
                className="w-full bg-surface-variant text-white py-4 rounded-xl font-bold text-xl hover:scale-105 active:scale-95 transition shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm">
          <div className="bg-surface p-8 rounded-3xl text-center space-y-6">
            <h2 className="text-3xl font-black text-on-surface">Choose Color</h2>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => handleColorPicked('red')} className="w-24 h-24 bg-uno-red rounded-xl hover:scale-110 transition border-4 border-transparent hover:border-white"></button>
              <button onClick={() => handleColorPicked('blue')} className="w-24 h-24 bg-uno-blue rounded-xl hover:scale-110 transition border-4 border-transparent hover:border-white"></button>
              <button onClick={() => handleColorPicked('green')} className="w-24 h-24 bg-uno-green rounded-xl hover:scale-110 transition border-4 border-transparent hover:border-white"></button>
              <button onClick={() => handleColorPicked('yellow')} className="w-24 h-24 bg-uno-yellow rounded-xl hover:scale-110 transition border-4 border-transparent hover:border-white"></button>
            </div>
            <button onClick={() => setShowColorPicker(null)} className="text-on-surface-variant font-bold mt-4">Cancel</button>
          </div>
        </div>
      )}

      {/* Spectator Mode Banner — winner spectators AND pre-game spectators */}
      {amISpectating && !gameState.gameOver && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none z-[60] w-full px-4">
          <div className="max-w-md mx-auto bg-uno-yellow/90 backdrop-blur-xl px-5 py-3 rounded-full shadow-2xl border-2 border-white flex items-center gap-3 justify-center">
            <span className="text-2xl">👁️</span>
            <p className="font-headline font-black text-sm md:text-base text-uno-black uppercase tracking-widest">
              {amIPreGameSpectator ? '👁️ Spectating — Hold any badge to peek cards!' : '🏆 Spectator — Hold a player badge to peek their hand!'}
            </p>
          </div>
        </div>
      )}

      {/* Turn overlay — only show for active players */}
      {!isMyTurn && !myPlayer?.finishedRank && gameState.players[gameState.currentPlayerIndex] && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 pointer-events-none z-50">
          <div className="bg-uno-green/80 backdrop-blur-xl px-6 py-3 rounded-full shadow-2xl border border-uno-green flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping"></div>
            <p className="font-label font-black text-xs text-white uppercase tracking-wider">
              {gameState.players[gameState.currentPlayerIndex].name} is choosing a card...
            </p>
          </div>
        </div>
      )}

      {/* Winner / Points Overlay Table */}
      {gameState.gameOver && (
        <div className="fixed inset-0 bg-black/90 z-[300] flex flex-col items-center justify-center backdrop-blur-md p-8 overflow-y-auto">
          <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-uno-yellow via-uno-red to-uno-blue mb-10 drop-shadow-[0_0_20px_#ffffff] text-center leading-tight">
            Final Standings
          </h1>
          <div className="w-full max-w-3xl bg-surface-container/10 p-6 md:p-10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/20 space-y-4">
            {[...gameState.players]
              .sort((a, b) => {
                 if (a.finishedRank && b.finishedRank) return a.finishedRank - b.finishedRank;
                 if (a.finishedRank) return -1;
                 if (b.finishedRank) return 1;
                 const aCards = a.hand?.length || a.cardCount || 99;
                 const bCards = b.hand?.length || b.cardCount || 99;
                 return aCards - bCards;
              })
              .map((p, i) => (
              <div key={p.id} className={`flex justify-between items-center bg-surface-container/80 backdrop-blur-md px-6 py-4 rounded-2xl border-l-[8px] ${i === 0 ? 'border-uno-yellow scale-[1.02] shadow-2xl z-10' : 'border-surface-variant'}`}>
                 <div className="flex items-center gap-4 md:gap-6">
                    <span className={`text-4xl font-black w-8 text-center ${i === 0 ? 'text-uno-yellow drop-shadow-md' : 'text-white/40'}`}>{i + 1}</span>
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/50 bg-black/20 shrink-0">
                      <img src={p.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${p.name}`} className="w-full h-full object-cover" alt="avatar" />
                    </div>
                    <span className="text-2xl font-bold text-white truncate max-w-[150px] md:max-w-xs">{p.name} {p.id === socketId && <span className="text-xs font-black tracking-widest text-uno-green bg-uno-green/20 px-3 py-1 rounded ml-3">YOU</span>}</span>
                 </div>
                 <div className="text-right font-black shrink-0 ml-4 flex flex-col">
                    {p.finishedRank ? (
                      <>
                        <span className="text-uno-yellow text-xl md:text-3xl tracking-widest">{p.points || 0} PTS</span>
                        <span className="text-white/40 text-xs tracking-widest uppercase">Rank {p.finishedRank}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-uno-red text-lg md:text-xl">{(p.hand?.length || p.cardCount)} CARDS</span>
                        <span className="text-white/40 text-xs tracking-widest uppercase">0 PTS</span>
                      </>
                    )}
                 </div>
              </div>
            ))}
          </div>
          <button 
             onClick={() => window.location.reload()} 
             className="mt-12 bg-white text-uno-black px-12 py-5 rounded-full font-black text-2xl hover:scale-110 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.6)]"
          >
             Play Again
          </button>
        </div>
      )}
      {/* Spectator Peek Modal (long-press) */}
      {peekPlayerId && (() => {
        const peekedPlayer = gameState.players.find(p => p.id === peekPlayerId);
        if (!peekedPlayer || !peekedPlayer.hand) return null;
        return (
          <div
            className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center gap-4 p-4"
            onMouseUp={() => setPeekPlayerId(null)}
            onTouchEnd={() => setPeekPlayerId(null)}
          >
            <div className="flex items-center gap-3 mb-2">
              <img src={peekedPlayer.avatar || `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${peekedPlayer.name}`} alt="avatar" className="w-12 h-12 rounded-full border-4 border-uno-yellow shadow-lg" />
              <div>
                <p className="font-headline font-black text-2xl md:text-3xl text-white">{peekedPlayer.name}</p>
                <p className="text-uno-yellow text-xs font-bold uppercase tracking-widest">{peekedPlayer.hand.length} cards in hand</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-xl w-full overflow-y-auto max-h-[60vh]">
              {peekedPlayer.hand.map((card, idx) => (
                <div key={card.id + idx} className={`relative w-14 h-20 md:w-20 md:h-28 rounded-xl flex flex-col justify-between p-1.5 md:p-2 border-2 border-white/80 shadow-xl shrink-0 ${getCardBgColor(card.color)}`}>
                  <div className="absolute inset-0.5 border border-white/30 rounded-[10px] pointer-events-none z-10"></div>
                  <span className="font-headline font-black text-xs md:text-sm text-white z-10 leading-none">{renderCardValue(card.value)}</span>
                  <div className="flex items-center justify-center">
                    {card.type === 'wild' ? (
                      <span className="material-symbols-outlined text-white text-xl md:text-3xl" style={{fontVariationSettings:"'FILL' 1"}}>auto_fix_high</span>
                    ) : (
                      <div className={`w-7 md:w-10 h-10 md:h-14 bg-white rounded-t-full rounded-b-full flex items-center justify-center shadow-inner rotate-[-15deg]`}>
                        <span className={`font-black text-lg md:text-2xl ${getCardTextColor(card.color)} rotate-[15deg] leading-none`}>{renderCardValue(card.value)}</span>
                      </div>
                    )}
                  </div>
                  <span className="font-headline font-black text-xs md:text-sm text-white rotate-180 self-end z-10 leading-none">{renderCardValue(card.value)}</span>
                  {card.type === 'wild' && (
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 -z-10 rounded-xl overflow-hidden opacity-40">
                      <div className="bg-uno-red"></div><div className="bg-uno-blue"></div>
                      <div className="bg-uno-yellow"></div><div className="bg-uno-green"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs mt-2">Release to close</p>
          </div>
        );
      })()}

    </div>
  );
}
