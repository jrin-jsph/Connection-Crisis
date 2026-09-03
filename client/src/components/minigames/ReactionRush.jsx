import React, { useState, useEffect } from 'react';
import { Zap, AlertOctagon, Trophy, Skull, Clock, RotateCcw } from 'lucide-react';
import { SOCKET_EVENTS } from '../../../../shared/events.js';

export default function ReactionRush({ socket, isConnected, gameData, currentPlayer, onGameFinished }) {
  const [gameState, setGameState] = useState(gameData || { status: 'COUNTDOWN', countdown: 3 });
  const [clicked, setClicked] = useState(false);
  const [myReactionTime, setMyReactionTime] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data) => {
      if (data.gameId === gameData.gameId) {
        setGameState(prev => ({ ...prev, ...data.state }));
      }
    };

    const handleGameFinished = (data) => {
      if (data.gameId === gameData.gameId) {
        setResultData(data);
        if (onGameFinished) onGameFinished(data);
      }
    };

    socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
    socket.on(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);
    };
  }, [socket, gameData, onGameFinished]);

  const handleClick = () => {
    if (clicked || resultData) return;
    setClicked(true);
    const now = Date.now();

    socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId: gameData.gameId,
      playerId: currentPlayer.playerId,
      actionType: 'reaction_click',
      actionData: { timestamp: now }
    }, (res) => {
      if (res?.reactionMs) {
        setMyReactionTime(res.reactionMs);
      }
    });
  };

  const isWinner = resultData?.winnerId === currentPlayer?.playerId;
  const isLoser = resultData?.loserId === currentPlayer?.playerId;
  const isFalseStart = resultData?.reason === 'FALSE_START_PENALTY';

  return (
    <div className="player-container" style={{ maxWidth: 500, margin: '0 auto', padding: '1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* 1. RESULT SCREEN */}
      {resultData ? (
        <div className="card" style={{
          borderColor: isWinner ? '#10b981' : '#f43f5e',
          boxShadow: isWinner ? '0 0 35px rgba(16, 185, 129, 0.4)' : '0 0 35px rgba(244, 63, 94, 0.4)',
          textAlign: 'center',
          padding: '2rem 1.5rem'
        }}>
          {isWinner ? (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.2)', border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Trophy size={40} color="#10b981" />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px' }}>
                YOU WON!
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                Faster reflexes saved your identity!
              </p>
            </div>
          ) : (
            <div>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', border: '2px solid #f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Skull size={40} color="#f87171" />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#f87171', letterSpacing: '-0.5px' }}>
                {isFalseStart ? 'FALSE START!' : 'YOU LOST!'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                {isFalseStart ? 'You clicked before the signal.' : 'Opponent reacted faster.'}
              </p>
            </div>
          )}

          {myReactionTime && myReactionTime > 0 && (
            <div style={{ marginTop: '1.5rem', background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)' }}>
              <Clock size={16} color="#00f2fe" />
              <span>Your Reaction Time: <b>{myReactionTime} ms</b></span>
            </div>
          )}
        </div>
      ) : (
        /* 2. ACTIVE REACTION ARENA */
        <div 
          onClick={handleClick}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            borderRadius: 24,
            padding: '3rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '380px',
            transition: 'all 0.15s ease',
            background: gameState.signalActive 
              ? 'radial-gradient(circle, #00f2fe 0%, #0575e6 100%)'
              : gameState.status === 'COUNTDOWN'
              ? 'rgba(18, 22, 40, 0.85)'
              : 'radial-gradient(circle, #ff007f 0%, #7928ca 100%)',
            border: gameState.signalActive 
              ? '4px solid #ffffff' 
              : '2px solid rgba(255,255,255,0.15)',
            boxShadow: gameState.signalActive 
              ? '0 0 60px rgba(0, 242, 254, 0.8)' 
              : '0 12px 40px rgba(0,0,0,0.5)'
          }}
        >
          {/* Countdown State */}
          {gameState.status === 'COUNTDOWN' && (
            <div>
              <div style={{ fontSize: '4.5rem', fontWeight: 900, color: '#00f2fe', fontFamily: 'var(--font-display)' }}>
                {gameState.countdown || 3}
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem' }}>
                GET READY...
              </div>
            </div>
          )}

          {/* Waiting State (Do NOT click) */}
          {gameState.status === 'WAITING' && !gameState.signalActive && (
            <div>
              <AlertOctagon size={64} color="#ffffff" style={{ animation: 'pulse 1s infinite' }} />
              <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ffffff', letterSpacing: '2px', marginTop: '1rem' }}>
                WAIT...
              </div>
              <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.5rem', fontWeight: 600 }}>
                Do NOT click early! False start = Loss.
              </div>
            </div>
          )}

          {/* CLICK NOW Signal */}
          {gameState.signalActive && (
            <div>
              <Zap size={72} color="#050b14" style={{ transform: 'scale(1.2)' }} />
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#050b14', letterSpacing: '1px', marginTop: '0.5rem' }}>
                CLICK!
              </div>
              <div style={{ fontSize: '1rem', color: '#050b14', fontWeight: 800, marginTop: '0.25rem' }}>
                TAP ANYWHERE FAST!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Opponent Info Header */}
      <div style={{ textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        <span>1v1 Minigame: <b>Reaction Rush</b></span>
      </div>
    </div>
  );
}
