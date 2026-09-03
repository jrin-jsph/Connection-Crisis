import React, { useState, useEffect } from 'react';
import { Trophy, Skull, Crosshair, Clock, Zap, Target } from 'lucide-react';
import { SOCKET_EVENTS } from '../../../../shared/events.js';

export default function TargetClick({ socket, isConnected, gameData, currentPlayer, onGameFinished }) {
  const [gameState, setGameState] = useState(gameData || {
    secondsRemaining: 10,
    currentTarget: { x: 50, y: 50, size: 60, targetId: 'init' },
    scores: {}
  });

  const [resultData, setResultData] = useState(null);
  const [hitRipples, setHitRipples] = useState([]);

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

  const handleTargetClick = (e) => {
    if (resultData || !gameState.currentTarget?.targetId) return;

    const targetId = gameState.currentTarget.targetId;
    const ripple = {
      id: Date.now() + Math.random(),
      x: gameState.currentTarget.x,
      y: gameState.currentTarget.y
    };
    setHitRipples(prev => [...prev.slice(-4), ripple]);

    socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId: gameData.gameId,
      playerId: currentPlayer.playerId,
      actionType: 'target_click',
      actionData: { targetId }
    });
  };

  const isWinner = resultData?.winnerId === currentPlayer?.playerId;
  const myScore = gameState.scores?.[currentPlayer?.playerId] || 0;
  const opponentId = Object.keys(gameState.scores || {}).find(id => id !== currentPlayer?.playerId);
  const opponentScore = gameState.scores?.[opponentId] || 0;
  const target = gameState.currentTarget;

  return (
    <div className="player-container" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* 1. MATCH RESULT SCREEN */}
      {resultData ? (
        <div className="card" style={{
          borderColor: isWinner ? '#10b981' : '#f43f5e',
          boxShadow: isWinner ? '0 0 40px rgba(16, 185, 129, 0.4)' : '0 0 40px rgba(244, 63, 94, 0.4)',
          textAlign: 'center',
          padding: '2.5rem 1.5rem'
        }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: isWinner ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', border: `2px solid ${isWinner ? '#10b981' : '#f87171'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            {isWinner ? <Trophy size={48} color="#10b981" /> : <Skull size={48} color="#f87171" />}
          </div>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: isWinner ? '#34d399' : '#f87171', letterSpacing: '-0.5px' }}>
            {isWinner ? 'TARGET MASTER!' : 'TIME UP!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            {isWinner 
              ? 'You tapped the most targets in 10 seconds!' 
              : 'Opponent collected more targets.'}
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>You</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#00f2fe' }}>{myScore}</div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'rgba(255,255,255,0.2)' }}>:</div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Opponent</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ff007f' }}>{opponentScore}</div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. ACTIVE TARGET CLICK ARENA */
        <div className="card" style={{ padding: '1.25rem', borderColor: 'rgba(0, 242, 254, 0.3)', display: 'flex', flexDirection: 'column', height: '480px', position: 'relative', overflow: 'hidden' }}>
          
          {/* Header Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} color="#00f2fe" />
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#ffffff' }}>
                TARGET CLICK
              </span>
            </div>

            {/* Timer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.5)', padding: '0.35rem 0.75rem', borderRadius: 20 }}>
              <Clock size={14} color={gameState.secondsRemaining <= 3 ? '#f43f5e' : '#00f2fe'} />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, color: gameState.secondsRemaining <= 3 ? '#f43f5e' : '#00f2fe' }}>
                {gameState.secondsRemaining}s
              </span>
            </div>
          </div>

          {/* Scoreboard Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-around', margin: '0.75rem 0', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: 12, zIndex: 10 }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>YOU: </span>
              <span style={{ fontWeight: 900, color: '#00f2fe', fontSize: '1.1rem' }}>{myScore}</span>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OPPONENT: </span>
              <span style={{ fontWeight: 900, color: '#ff007f', fontSize: '1.1rem' }}>{opponentScore}</span>
            </div>
          </div>

          {/* Interactive Touch Arena Area */}
          <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(circle, rgba(0,242,254,0.05) 0%, rgba(10,12,24,0.8) 100%)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            
            {/* Render Spawning Target Orb */}
            {target && (
              <div
                onClick={handleTargetClick}
                style={{
                  position: 'absolute',
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: target.size || 60,
                  height: target.size || 60,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #ff007f 0%, #7928ca 100%)',
                  border: '3px solid #ffffff',
                  boxShadow: '0 0 25px rgba(255, 0, 127, 0.9), inset 0 0 15px #ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  animation: 'pulse 1s infinite alternate',
                  zIndex: 20
                }}
              >
                <Crosshair size={24} color="#ffffff" />
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Tap the pulsing target orb as many times as you can!
          </div>

        </div>
      )}
    </div>
  );
}
