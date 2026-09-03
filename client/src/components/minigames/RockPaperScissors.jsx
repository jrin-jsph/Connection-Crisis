import React, { useState, useEffect } from 'react';
import { Trophy, Skull, Clock, CheckCircle2, Swords, Shield, Sparkles } from 'lucide-react';
import { SOCKET_EVENTS } from '../../../../shared/events.js';

const CHOICES = [
  { id: 'rock', name: 'Rock', icon: '🪨', color: '#00f2fe' },
  { id: 'paper', name: 'Paper', icon: '📄', color: '#ff007f' },
  { id: 'scissors', name: 'Scissors', icon: '✂️', color: '#a855f7' }
];

export default function RockPaperScissors({ socket, isConnected, gameData, currentPlayer, onGameFinished }) {
  const [gameState, setGameState] = useState(gameData || {
    round: 1,
    status: 'CHOOSING',
    secondsRemaining: 5,
    scores: {},
    hasChosen: {}
  });

  const [selectedChoice, setSelectedChoice] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data) => {
      if (data.gameId === gameData.gameId) {
        setGameState(prev => {
          const next = { ...prev, ...data.state };
          // If advancing to a new round, reset local selection
          if (next.round !== prev.round && next.status === 'CHOOSING') {
            setSelectedChoice(null);
          }
          return next;
        });
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

  const handleMakeChoice = (choiceId) => {
    if (selectedChoice || gameState.status !== 'CHOOSING' || resultData) return;
    setSelectedChoice(choiceId);

    socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId: gameData.gameId,
      playerId: currentPlayer.playerId,
      actionType: 'rps_choice',
      actionData: { choice: choiceId }
    });
  };

  const isWinner = resultData?.winnerId === currentPlayer?.playerId;
  const myScore = gameState.scores?.[currentPlayer?.playerId] || 0;
  const opponentId = Object.keys(gameState.scores || {}).find(id => id !== currentPlayer?.playerId);
  const opponentScore = gameState.scores?.[opponentId] || 0;

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
            {isWinner ? 'VICTORY!' : 'DEFEATED!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            {isWinner ? 'You won the Best of 3 Showdown!' : 'Opponent won more rounds.'}
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
        /* 2. ACTIVE RPS ARENA */
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderColor: 'rgba(0, 242, 254, 0.3)' }}>
          
          {/* Header & Scoreboard */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ textAlign: 'left' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                ROUND {gameState.round} (BEST OF 3)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.4)', padding: '0.35rem 0.75rem', borderRadius: 20 }}>
              <Clock size={14} color="#00f2fe" />
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: gameState.secondsRemaining <= 2 ? '#f43f5e' : '#00f2fe' }}>
                {gameState.secondsRemaining}s
              </span>
            </div>
          </div>

          {/* Score Indicator */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', margin: '0.75rem 0 1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>YOU</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#00f2fe' }}>{myScore}</div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dim)' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>OPPONENT</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ff007f' }}>{opponentScore}</div>
            </div>
          </div>

          {/* Reveal Screen (Between Rounds) */}
          {gameState.status === 'REVEAL' && gameState.lastRoundResult ? (
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', animation: 'pulse 1.5s infinite' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {CHOICES.find(c => c.id === gameState.lastRoundResult.choiceA)?.icon || '❓'}
                <span style={{ margin: '0 0.5rem', fontSize: '1.5rem' }}>⚡</span>
                {CHOICES.find(c => c.id === gameState.lastRoundResult.choiceB)?.icon || '❓'}
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: gameState.lastRoundResult.winnerId === currentPlayer.playerId ? '#34d399' : '#f87171' }}>
                {gameState.lastRoundResult.resultText}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Next round starting shortly...
              </div>
            </div>
          ) : (
            /* Choice Selection Buttons */
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                {selectedChoice 
                  ? '🔒 Choice locked in! Waiting for opponent...' 
                  : 'Select your move before time runs out:'}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                {CHOICES.map(c => {
                  const isSelected = selectedChoice === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleMakeChoice(c.id)}
                      disabled={selectedChoice !== null}
                      style={{
                        padding: '1.25rem 0.5rem',
                        borderRadius: 16,
                        background: isSelected ? 'rgba(0,242,254,0.2)' : 'rgba(18, 22, 40, 0.8)',
                        border: isSelected ? `2px solid ${c.color}` : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isSelected ? `0 0 20px ${c.color}66` : 'none',
                        cursor: selectedChoice ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontSize: '2.5rem' }}>{c.icon}</span>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? c.color : '#ffffff' }}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
