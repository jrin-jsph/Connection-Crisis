import React, { useState, useEffect } from 'react';
import { Trophy, Skull, Eye, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { SOCKET_EVENTS } from '../../../../shared/events.js';

const COLOR_PADS = [
  { id: 'RED', label: 'RED', color: '#ef4444', activeColor: '#fca5a5', glow: 'rgba(239, 68, 68, 0.8)' },
  { id: 'BLUE', label: 'BLUE', color: '#3b82f6', activeColor: '#93c5fd', glow: 'rgba(59, 130, 246, 0.8)' },
  { id: 'GREEN', label: 'GREEN', color: '#10b981', activeColor: '#86efac', glow: 'rgba(16, 185, 129, 0.8)' },
  { id: 'YELLOW', label: 'YELLOW', color: '#eab308', activeColor: '#fef08a', glow: 'rgba(234, 179, 8, 0.8)' }
];

export default function MemoryMatch({ socket, isConnected, gameData, currentPlayer, onGameFinished }) {
  const [gameState, setGameState] = useState(gameData || {
    round: 1,
    status: 'SHOWING_PATTERN',
    sequenceLength: 3,
    sequence: []
  });

  const [activeFlashingColor, setActiveFlashingColor] = useState(null);
  const [playerInputSequence, setPlayerInputSequence] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [isInputLocked, setIsInputLocked] = useState(true);

  // Handle server updates
  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data) => {
      if (data.gameId === gameData.gameId) {
        const next = data.state;
        setGameState(prev => ({ ...prev, ...next }));

        // If server provided new sequence, animate the playback
        if (next.sequence && next.sequence.length > 0) {
          playSequenceAnimation(next.sequence);
        } else if (next.status === 'INPUT_PHASE') {
          setIsInputLocked(false);
        }
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

    // Initial sequence animation if provided in initial state
    if (gameState.sequence && gameState.sequence.length > 0) {
      playSequenceAnimation(gameState.sequence);
    }

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_UPDATE, handleStateUpdate);
      socket.off(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);
    };
  }, [socket, gameData, onGameFinished]);

  const playSequenceAnimation = (sequence) => {
    setIsInputLocked(true);
    setPlayerInputSequence([]);

    sequence.forEach((color, idx) => {
      setTimeout(() => {
        setActiveFlashingColor(color);
        setTimeout(() => setActiveFlashingColor(null), 400);
      }, (idx * 750) + 400);
    });

    setTimeout(() => {
      setIsInputLocked(false);
      setGameState(prev => ({ ...prev, status: 'INPUT_PHASE' }));
    }, (sequence.length * 750) + 600);
  };

  const handleColorClick = (colorId) => {
    if (isInputLocked || resultData) return;

    // Flash clicked pad
    setActiveFlashingColor(colorId);
    setTimeout(() => setActiveFlashingColor(null), 200);

    const nextInputs = [...playerInputSequence, colorId];
    setPlayerInputSequence(nextInputs);

    socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId: gameData.gameId,
      playerId: currentPlayer.playerId,
      actionType: 'memory_step',
      actionData: { color: colorId }
    }, (res) => {
      if (res?.roundComplete) {
        setIsInputLocked(true);
      }
    });
  };

  const isWinner = resultData?.winnerId === currentPlayer?.playerId;
  const isMistake = resultData?.reason === 'INCORRECT_SEQUENCE_MISTAKE';

  return (
    <div className="player-container" style={{ maxWidth: 480, margin: '0 auto', padding: '1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* 1. RESULT SCREEN */}
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
            {isWinner ? 'PERFECT MEMORY!' : 'WRONG PATTERN!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            {isWinner 
              ? 'You memorized the sequence flawlessly!' 
              : 'One wrong step cost you the match.'}
          </p>
        </div>
      ) : (
        /* 2. ACTIVE MEMORY MATCH ARENA */
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderColor: 'rgba(0, 242, 254, 0.3)' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.8rem' }}>
              ROUND {gameState.round}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Length: <b>{gameState.sequenceLength || 3}</b>
            </span>
          </div>

          {/* Status Instruction */}
          <div style={{ marginBottom: '1.5rem' }}>
            {isInputLocked ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#00f2fe', fontWeight: 700, fontSize: '1rem' }}>
                <Eye size={18} />
                <span>WATCH THE PATTERN...</span>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '1rem' }}>
                <Sparkles size={18} />
                <span>YOUR TURN: REPEAT SEQUENCE ({playerInputSequence.length}/{gameState.sequenceLength || 3})</span>
              </div>
            )}
          </div>

          {/* 4 Colored Pads */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', maxWidth: 320, margin: '0 auto' }}>
            {COLOR_PADS.map(pad => {
              const isFlashing = activeFlashingColor === pad.id;
              return (
                <button
                  key={pad.id}
                  onClick={() => handleColorClick(pad.id)}
                  disabled={isInputLocked}
                  style={{
                    height: 120,
                    borderRadius: 20,
                    background: isFlashing ? pad.activeColor : pad.color,
                    border: isFlashing ? '4px solid #ffffff' : '2px solid rgba(255,255,255,0.2)',
                    boxShadow: isFlashing ? `0 0 35px ${pad.glow}` : '0 6px 16px rgba(0,0,0,0.4)',
                    transform: isFlashing ? 'scale(1.06)' : 'scale(1)',
                    transition: 'all 0.1s ease',
                    cursor: isInputLocked ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.1rem', textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                    {pad.label}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
