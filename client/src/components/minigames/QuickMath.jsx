import React, { useState, useEffect } from 'react';
import { Trophy, Skull, Calculator, Check, X, Target, Zap } from 'lucide-react';
import { SOCKET_EVENTS } from '../../../../shared/events.js';

export default function QuickMath({ socket, isConnected, gameData, currentPlayer, onGameFinished }) {
  const [gameState, setGameState] = useState(gameData || {
    targetScore: 3,
    questionNumber: 1,
    question: { text: 'Loading problem...', options: [] },
    scores: {}
  });

  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [resultData, setResultData] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (data) => {
      if (data.gameId === gameData.gameId) {
        setGameState(prev => ({ ...prev, ...data.state }));
        if (data.state?.lastFeedback) {
          setFeedback(data.state.lastFeedback);
          setTimeout(() => setFeedback(null), 2500);
        }
        setSelectedOption(null);
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

  const handleSelectAnswer = (option) => {
    if (selectedOption !== null || resultData) return;
    setSelectedOption(option);

    socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId: gameData.gameId,
      playerId: currentPlayer.playerId,
      actionType: 'math_answer',
      actionData: { selectedAnswer: option }
    });
  };

  const isWinner = resultData?.winnerId === currentPlayer?.playerId;
  const myScore = gameState.scores?.[currentPlayer?.playerId] || 0;
  const opponentId = Object.keys(gameState.scores || {}).find(id => id !== currentPlayer?.playerId);
  const opponentScore = gameState.scores?.[opponentId] || 0;

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
            {isWinner ? 'MATH CHAMPION!' : 'DEFEATED!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
            {isWinner ? 'You solved the calculations faster!' : 'Opponent reached 3 points first.'}
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
        /* 2. ACTIVE QUICK MATH ARENA */
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderColor: 'rgba(0, 242, 254, 0.3)' }}>
          
          {/* Header & Scoreboard */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.8rem' }}>
              FIRST TO 3 POINTS
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Q#{gameState.questionNumber || 1}
            </span>
          </div>

          {/* Scoreboard Tally */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', margin: '0.5rem 0 1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>YOU</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#00f2fe' }}>{myScore} / 3</div>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-dim)' }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>OPPONENT</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ff007f' }}>{opponentScore} / 3</div>
            </div>
          </div>

          {/* Question Box */}
          <div style={{
            background: 'radial-gradient(circle, rgba(0, 242, 254, 0.15) 0%, rgba(18, 22, 40, 0.8) 100%)',
            border: '2px solid rgba(0, 242, 254, 0.4)',
            borderRadius: 20,
            padding: '1.75rem 1rem',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>
              {gameState.question?.text || '...'}
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div style={{
              background: feedback.isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${feedback.isCorrect ? '#10b981' : '#ef4444'}`,
              borderRadius: 12,
              padding: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: feedback.isCorrect ? '#34d399' : '#f87171'
            }}>
              {feedback.message}
            </div>
          )}

          {/* 4 Multiple Choice Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            {(gameState.question?.options || []).map((opt, i) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(opt)}
                  disabled={selectedOption !== null}
                  style={{
                    padding: '1.25rem 0.5rem',
                    borderRadius: 16,
                    background: isSelected ? 'rgba(0, 242, 254, 0.3)' : 'rgba(18, 22, 40, 0.9)',
                    border: isSelected ? '2px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: isSelected ? '0 0 25px rgba(0, 242, 254, 0.5)' : 'none',
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    color: '#ffffff',
                    cursor: selectedOption !== null ? 'default' : 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>

        </div>
      )}
    </div>
  );
}
