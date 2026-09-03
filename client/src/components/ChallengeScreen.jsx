import React, { useState, useEffect } from 'react';
import { Swords, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';
import { SOCKET_EVENTS, CHALLENGE_STATUS } from '../../../shared/events.js';

export default function ChallengeScreen({ socket, isConnected, challenge, currentPlayer, onLeave }) {
  const [countdown, setCountdown] = useState(challenge?.countdownRemaining || 60);
  const [enteredPlayers, setEnteredPlayers] = useState(challenge?.enteredPlayers || []);
  const [hasEntered, setHasEntered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challengeStatus, setChallengeStatus] = useState(challenge?.status || CHALLENGE_STATUS.COUNTDOWN);

  useEffect(() => {
    if (!socket || !challenge) return;

    // Check if current player already entered
    if (challenge.enteredPlayers?.includes(currentPlayer?.playerId)) {
      setHasEntered(true);
    }

    // Listen for server authoritative timer ticks
    const handleTick = (data) => {
      if (data.challengeId === challenge.challengeId) {
        setCountdown(data.countdownRemaining);
        if (data.enteredPlayers) setEnteredPlayers(data.enteredPlayers);
      }
    };

    const handlePlayerEntered = (data) => {
      if (data.challengeId === challenge.challengeId) {
        setEnteredPlayers(data.enteredPlayers || []);
        if (data.playerId === currentPlayer?.playerId) {
          setHasEntered(true);
        }
      }
    };

    const handleChallengeStarted = (data) => {
      if (data.challenge?.challengeId === challenge.challengeId) {
        setChallengeStatus(CHALLENGE_STATUS.GAME_RUNNING);
      }
    };

    const handleChallengeTimeout = (data) => {
      if (data.challengeId === challenge.challengeId) {
        setChallengeStatus(CHALLENGE_STATUS.TIMEOUT);
      }
    };

    socket.on('challenge:tick', handleTick);
    socket.on('challenge:player_entered', handlePlayerEntered);
    socket.on(SOCKET_EVENTS.CHALLENGE_STARTED, handleChallengeStarted);
    socket.on(SOCKET_EVENTS.CHALLENGE_TIMEOUT, handleChallengeTimeout);

    return () => {
      socket.off('challenge:tick', handleTick);
      socket.off('challenge:player_entered', handlePlayerEntered);
      socket.off(SOCKET_EVENTS.CHALLENGE_STARTED, handleChallengeStarted);
      socket.off(SOCKET_EVENTS.CHALLENGE_TIMEOUT, handleChallengeTimeout);
    };
  }, [socket, challenge, currentPlayer]);

  const handleEnterChallenge = () => {
    if (!socket || !isConnected || hasEntered || isSubmitting) return;

    setIsSubmitting(true);
    socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, {
      challengeId: challenge.challengeId,
      playerId: currentPlayer.playerId
    }, (res) => {
      setIsSubmitting(false);
      if (res?.success) {
        setHasEntered(true);
      }
    });
  };

  const isPlayerA = currentPlayer?.playerId === challenge?.playerA?.playerId;
  const opponent = isPlayerA ? challenge?.playerB : challenge?.playerA;
  const isOpponentEntered = enteredPlayers.includes(opponent?.playerId);

  const timerPercent = Math.max(0, Math.min(100, (countdown / 60) * 100));
  const isUrgent = countdown <= 15;

  return (
    <div className="player-container" style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Challenge Card */}
      <div className="card" style={{
        borderColor: isUrgent ? '#f87171' : 'rgba(255, 0, 127, 0.5)',
        boxShadow: isUrgent ? '0 0 35px rgba(248, 113, 113, 0.4)' : '0 12px 45px rgba(255, 0, 127, 0.25)',
        background: 'rgba(18, 15, 28, 0.92)'
      }}>
        
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#ff007f', fontWeight: 900, fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <Sparkles size={16} />
            <span>Identity Conflict Alert</span>
          </div>
          <h1 style={{
            fontSize: '1.9rem',
            fontWeight: 900,
            letterSpacing: '-0.5px',
            background: 'linear-gradient(135deg, #ff007f 0%, #ff4b2b 50%, #00f2fe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(255,0,127,0.4)'
          }}>
            DOPPELGANGER CRISIS
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Similar names detected on the local Wi-Fi network!
          </p>
        </div>

        {/* 1v1 Contender Showdown Box */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'rgba(0, 0, 0, 0.5)',
          padding: '1.25rem 1rem',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.5rem'
        }}>
          {/* Player A */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
              margin: '0 auto 0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.3rem',
              color: '#07080d',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              {challenge?.playerA?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
              {challenge?.playerA?.name}
            </div>
            <div style={{ marginTop: '0.35rem' }}>
              {enteredPlayers.includes(challenge?.playerA?.playerId) ? (
                <span className="badge badge-online" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                  <CheckCircle2 size={12} /> ENTERED
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                  WAITING
                </span>
              )}
            </div>
          </div>

          {/* VS Center Badge */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(255, 0, 127, 0.2)',
              border: '1px solid rgba(255, 0, 127, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#ff007f',
              fontSize: '0.9rem'
            }}>
              VS
            </div>
          </div>

          {/* Player B */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff007f, #7928ca)',
              margin: '0 auto 0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.3rem',
              color: '#ffffff',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              {challenge?.playerB?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
              {challenge?.playerB?.name}
            </div>
            <div style={{ marginTop: '0.35rem' }}>
              {enteredPlayers.includes(challenge?.playerB?.playerId) ? (
                <span className="badge badge-online" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                  <CheckCircle2 size={12} /> ENTERED
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                  WAITING
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 60-Second Countdown Status */}
        {challengeStatus === CHALLENGE_STATUS.COUNTDOWN && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
              "You have 60 seconds to enter."
            </p>

            {/* Countdown Digit & Progress Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '2.4rem',
              fontWeight: 900,
              fontFamily: 'var(--font-display)',
              color: isUrgent ? '#f87171' : '#00f2fe',
              textShadow: isUrgent ? '0 0 15px rgba(248,113,113,0.7)' : '0 0 15px rgba(0,242,254,0.5)'
            }}>
              <Clock size={28} />
              <span>{countdown}s</span>
            </div>

            <div className="progress-bar-bg" style={{ height: 8, marginTop: '0.75rem' }}>
              <div 
                className="progress-bar-fill" 
                style={{ 
                  width: `${timerPercent}%`,
                  background: isUrgent ? '#f87171' : 'linear-gradient(90deg, #00f2fe, #ff007f)'
                }} 
              />
            </div>
          </div>
        )}

        {/* Timeout State */}
        {challengeStatus === CHALLENGE_STATUS.TIMEOUT && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 800, fontSize: '1.1rem' }}>
              <AlertTriangle size={20} />
              <span>CHALLENGE TIMEOUT</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              One or both players failed to enter before the timer ended.
            </p>
          </div>
        )}

        {/* Game Running / Both Entered State */}
        {challengeStatus === CHALLENGE_STATUS.GAME_RUNNING && (
          <div style={{
            background: 'rgba(0, 242, 254, 0.15)',
            border: '1px solid rgba(0, 242, 254, 0.4)',
            borderRadius: '12px',
            padding: '1.25rem',
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#00f2fe', fontWeight: 800, fontSize: '1.1rem' }}>
              <Swords size={20} />
              <span>BOTH CONTENDERS READY!</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Random minigame selection in progress...
            </p>
          </div>
        )}

        {/* Enter Challenge Button */}
        {challengeStatus === CHALLENGE_STATUS.COUNTDOWN && (
          <div>
            {!hasEntered ? (
              <button 
                onClick={handleEnterChallenge} 
                disabled={isSubmitting}
                className="btn btn-royale" 
                style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', letterSpacing: '0.5px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> ENTERING...
                  </>
                ) : (
                  <>
                    <Swords size={20} /> ENTER CHALLENGE
                  </>
                )}
              </button>
            ) : (
              <button 
                disabled
                className="btn btn-primary" 
                style={{
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1rem',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  cursor: 'default',
                  boxShadow: 'none'
                }}
              >
                <CheckCircle2 size={20} /> ENTERED — WAITING FOR OPPONENT ({enteredPlayers.length}/2)
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
