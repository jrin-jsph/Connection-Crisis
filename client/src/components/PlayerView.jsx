import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, User, Smartphone, ShieldCheck, CheckCircle2, 
  Clock, Wifi, AlertCircle, LogOut, Loader2, Users 
} from 'lucide-react';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../../../shared/events.js';
import ChallengeScreen from './ChallengeScreen.jsx';
import GameSelectionScreen from './GameSelectionScreen.jsx';
import WinnerScreen from './WinnerScreen.jsx';
import LoserScreen from './LoserScreen.jsx';
import RoyaleChampionScreen from './RoyaleChampionScreen.jsx';
import ReactionRush from './minigames/ReactionRush.jsx';
import RockPaperScissors from './minigames/RockPaperScissors.jsx';
import MemoryMatch from './minigames/MemoryMatch.jsx';
import QuickMath from './minigames/QuickMath.jsx';
import TargetClick from './minigames/TargetClick.jsx';

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'Android Device';
  if (/iPad|iPhone|iPod/.test(ua)) return 'Apple iOS Device';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Macintosh/i.test(ua)) return 'macOS Device';
  if (/Linux/i.test(ua)) return 'Linux Device';
  return 'Web Browser';
}

export default function PlayerView({ socket, isConnected, onSwitchToHost }) {
  const [playerName, setPlayerName] = useState('');
  const [playerData, setPlayerData] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [activeSelection, setActiveSelection] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [matchOutcome, setMatchOutcome] = useState(null); // { type: 'WIN'|'LOSS', ... }
  const [royaleChampion, setRoyaleChampion] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lobbyStats, setLobbyStats] = useState({ playerCount: 0, activeCount: 0 });

  // Check for saved session in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('cc_player_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPlayerData(parsed);
      } catch (e) {
        sessionStorage.removeItem('cc_player_session');
      }
    }
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on(SOCKET_EVENTS.HOST_STATUS_UPDATE, (data) => {
      setLobbyStats({
        playerCount: data.playerCount || 0,
        activeCount: data.activeCount || 0
      });

      // Update current player info
      if (playerData?.playerId) {
        const current = data.players?.find(p => p.playerId === playerData.playerId);
        if (current && (current.status !== playerData.status || current.eliminated !== playerData.eliminated)) {
          setPlayerData(prev => ({ ...prev, ...current }));
          sessionStorage.setItem('cc_player_session', JSON.stringify({ ...playerData, ...current }));
        }

        // Check if there is an active challenge for current player
        const relevantChallenge = data.activeChallenges?.find(
          ch => ch.playerA?.playerId === playerData.playerId || ch.playerB?.playerId === playerData.playerId
        );

        if (relevantChallenge) {
          setActiveChallenge(relevantChallenge);
        } else if (activeChallenge) {
          setActiveChallenge(null);
        }
      }
    });

    const handleChallengeCreated = (data) => {
      const ch = data.challenge;
      if (playerData?.playerId && (ch.playerA?.playerId === playerData.playerId || ch.playerB?.playerId === playerData.playerId)) {
        setActiveChallenge(ch);
      }
    };

    const handleChallengeTimeout = (data) => {
      if (activeChallenge?.challengeId === data.challengeId) {
        setTimeout(() => {
          setActiveChallenge(null);
          setActiveSelection(null);
        }, 4000);
      }
    };

    const handleGameSelected = (data) => {
      if (playerData?.playerId && (data.playerA?.playerId === playerData.playerId || data.playerB?.playerId === playerData.playerId)) {
        setActiveSelection(data);
      }
    };

    const handleGameStarted = (data) => {
      if (playerData?.playerId && (data.playerAId === playerData.playerId || data.playerBId === playerData.playerId)) {
        setActiveSelection(null);
        setActiveGame(data);
        setMatchOutcome(null);
      }
    };

    const handleGameFinished = (data) => {
      if (playerData?.playerId && (data.winnerId === playerData.playerId || data.loserId === playerData.playerId)) {
        const isWinner = data.winnerId === playerData.playerId;
        const opponentName = isWinner ? data.loserName : data.winnerName;
        setMatchOutcome({
          type: isWinner ? 'WIN' : 'LOSS',
          opponentName,
          result: data
        });
        setActiveGame(null);
        setActiveChallenge(null);
      }
    };

    const handlePlayerEliminated = (data) => {
      if (playerData?.playerId === data.playerId) {
        setPlayerData(prev => ({ ...prev, status: PLAYER_STATUS.ELIMINATED, eliminated: true }));
        setMatchOutcome({
          type: 'LOSS',
          result: data
        });
      }
    };

    const handleRoyaleFinished = (data) => {
      setRoyaleChampion(data);
      setActiveGame(null);
      setActiveChallenge(null);
      setActiveSelection(null);
      setMatchOutcome(null);
    };

    socket.on(SOCKET_EVENTS.CHALLENGE_CREATED, handleChallengeCreated);
    socket.on(SOCKET_EVENTS.CHALLENGE_TIMEOUT, handleChallengeTimeout);
    socket.on(SOCKET_EVENTS.GAME_SELECTED, handleGameSelected);
    socket.on(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
    socket.on(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);
    socket.on(SOCKET_EVENTS.PLAYER_ELIMINATED, handlePlayerEliminated);
    socket.on(SOCKET_EVENTS.ROYALE_FINISHED, handleRoyaleFinished);

    return () => {
      socket.off(SOCKET_EVENTS.HOST_STATUS_UPDATE);
      socket.off(SOCKET_EVENTS.CHALLENGE_CREATED, handleChallengeCreated);
      socket.off(SOCKET_EVENTS.CHALLENGE_TIMEOUT, handleChallengeTimeout);
      socket.off(SOCKET_EVENTS.GAME_SELECTED, handleGameSelected);
      socket.off(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
      socket.off(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);
      socket.off(SOCKET_EVENTS.PLAYER_ELIMINATED, handlePlayerEliminated);
      socket.off(SOCKET_EVENTS.ROYALE_FINISHED, handleRoyaleFinished);
    };
  }, [socket, playerData, activeChallenge]);

  const handleRegister = (e) => {
    e?.preventDefault();
    setErrorMsg('');

    const trimmed = playerName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a valid player name');
      return;
    }

    if (trimmed.length < 2) {
      setErrorMsg('Name must be at least 2 characters');
      return;
    }

    if (trimmed.length > 20) {
      setErrorMsg('Name cannot exceed 20 characters');
      return;
    }

    if (!socket || !isConnected) {
      setErrorMsg('Connecting to game server... Please wait a moment.');
      return;
    }

    setIsSubmitting(true);
    const device = getDeviceName();

    socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: trimmed, device }, (res) => {
      setIsSubmitting(false);
      if (res?.success && res.player) {
        setPlayerData(res.player);
        sessionStorage.setItem('cc_player_session', JSON.stringify(res.player));
      } else {
        setErrorMsg(res?.error || 'Failed to register. Please try again.');
      }
    });
  };

  const handleLeaveLobby = () => {
    sessionStorage.removeItem('cc_player_session');
    setPlayerData(null);
    setActiveChallenge(null);
    setActiveGame(null);
    setRoyaleChampion(null);
    setPlayerName('');
  };

  // If Royale has crowned THE ONLY REAL ONE champion
  if (playerData && royaleChampion) {
    return (
      <RoyaleChampionScreen
        champion={royaleChampion.champion}
        isCurrentPlayer={playerData.playerId === royaleChampion.champion?.playerId}
        totalRounds={royaleChampion.totalRounds}
        onReturnToLobby={() => {
          setRoyaleChampion(null);
        }}
      />
    );
  }

  // If player won the showdown, show WinnerScreen
  if (playerData && matchOutcome?.type === 'WIN') {
    return (
      <WinnerScreen
        player={playerData}
        opponentName={matchOutcome.opponentName}
        matchResult={matchOutcome.result}
        onKeepPlaying={() => {
          setMatchOutcome(null);
          setActiveGame(null);
          setActiveChallenge(null);
        }}
      />
    );
  }

  // If player lost the showdown / eliminated, show LoserScreen
  if (playerData && (matchOutcome?.type === 'LOSS' || playerData.status === PLAYER_STATUS.ELIMINATED || playerData.eliminated)) {
    return (
      <LoserScreen
        player={playerData}
        opponentName={matchOutcome?.opponentName}
        matchResult={matchOutcome?.result}
        onSpectate={() => {
          setMatchOutcome(null);
        }}
      />
    );
  }

  // If player is in 3-second random game selection phase
  if (playerData && activeSelection) {
    return (
      <GameSelectionScreen
        selectedGameType={activeSelection.selectedGameType}
        durationSec={activeSelection.durationSec || 3}
      />
    );
  }

  // If player is in active Minigame, show appropriate game
  if (playerData && (activeGame || activeChallenge?.status === 'GAME_RUNNING')) {
    const gData = activeGame || {
      gameId: 'game_' + activeChallenge?.challengeId,
      playerAId: activeChallenge?.playerA?.playerId,
      playerBId: activeChallenge?.playerB?.playerId,
      gameType: activeGame?.gameType || 'reaction_rush'
    };

    const isRPS = gData.gameType === 'rock_paper_scissors';
    const isMemory = gData.gameType === 'memory_match';
    const isMath = gData.gameType === 'quick_math';
    const isTarget = gData.gameType === 'target_click';

    if (isTarget) {
      return (
        <TargetClick
          socket={socket}
          isConnected={isConnected}
          gameData={gData}
          currentPlayer={playerData}
          onGameFinished={(result) => {
            setTimeout(() => {
              setActiveGame(null);
              setActiveChallenge(null);
            }, 5000);
          }}
        />
      );
    }

    if (isMath) {
      return (
        <QuickMath
          socket={socket}
          isConnected={isConnected}
          gameData={gData}
          currentPlayer={playerData}
          onGameFinished={(result) => {
            setTimeout(() => {
              setActiveGame(null);
              setActiveChallenge(null);
            }, 5000);
          }}
        />
      );
    }

    if (isMemory) {
      return (
        <MemoryMatch
          socket={socket}
          isConnected={isConnected}
          gameData={gData}
          currentPlayer={playerData}
          onGameFinished={(result) => {
            setTimeout(() => {
              setActiveGame(null);
              setActiveChallenge(null);
            }, 5000);
          }}
        />
      );
    }

    if (isRPS) {
      return (
        <RockPaperScissors
          socket={socket}
          isConnected={isConnected}
          gameData={gData}
          currentPlayer={playerData}
          onGameFinished={(result) => {
            setTimeout(() => {
              setActiveGame(null);
              setActiveChallenge(null);
            }, 5000);
          }}
        />
      );
    }

    return (
      <ReactionRush
        socket={socket}
        isConnected={isConnected}
        gameData={gData}
        currentPlayer={playerData}
        onGameFinished={(result) => {
          setTimeout(() => {
            setActiveGame(null);
            setActiveChallenge(null);
          }, 5000);
        }}
      />
    );
  }

  // If player is in an active Doppelganger Challenge countdown, show ChallengeScreen
  if (playerData && activeChallenge) {
    return (
      <ChallengeScreen
        socket={socket}
        isConnected={isConnected}
        challenge={activeChallenge}
        currentPlayer={playerData}
        onLeave={handleLeaveLobby}
      />
    );
  }

  return (
    <div className="player-container" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, rgba(0,242,254,0.2), rgba(255,0,127,0.2))', border: '1px solid rgba(0,242,254,0.4)', marginBottom: '1rem', boxShadow: '0 0 24px rgba(0,242,254,0.3)' }}>
          <Gamepad2 size={36} color="#00f2fe" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #00f2fe 0%, #ff007f 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          CONNECTION CRISIS
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Local Multiplayer Wi-Fi Showdown
        </p>
      </div>

      {!playerData ? (
        /* REGISTRATION FORM */
        <div className="card" style={{ borderColor: 'rgba(0, 242, 254, 0.3)', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#ffffff' }}>
              Enter your name
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Choose a moniker for the lobby
            </p>
          </div>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Player Name"
                  value={playerName}
                  maxLength={20}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.9rem 1rem 0.9rem 2.8rem',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    color: '#ffffff',
                    fontSize: '1.1rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00f2fe'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
                />
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {playerName.length}/20
                </span>
              </div>

              {errorMsg && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.82rem', marginTop: '0.5rem', fontWeight: 600 }}>
                  <AlertCircle size={15} />
                  {errorMsg}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Smartphone size={14} color="#00f2fe" /> Detected Device:
              </span>
              <span className="code-pill">{getDeviceName()}</span>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting}
              style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem', marginTop: '0.5rem' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> JOINING...
                </>
              ) : (
                'JOIN'
              )}
            </button>
          </form>
        </div>
      ) : (
        /* WAITING LOBBY SCREEN */
        <div className="card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)' }}>
          {/* Status Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="badge badge-online">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', animation: 'pulse 1.5s infinite' }} />
              ACTIVE CONTENDER
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {playerData.device}
            </span>
          </div>

          {/* Profile Card */}
          <div style={{ textAlign: 'center', margin: '1.75rem 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #00f2fe, #ff007f)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: '#07080d', boxShadow: '0 0 25px rgba(0,242,254,0.4)' }}>
              {playerData.name.charAt(0).toUpperCase()}
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ffffff' }}>
              {playerData.name}
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.5)', padding: '0.2rem 0.6rem', borderRadius: 8, marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>ID:</span>
              <span style={{ color: '#00f2fe' }}>{playerData.playerId}</span>
            </div>
          </div>

          {/* Waiting Status Animation */}
          <div style={{ background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: 14, padding: '1.25rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800, color: '#00f2fe', marginBottom: '0.35rem' }}>
              <Clock size={18} />
              <span>WAITING FOR SHOWDOWN</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Stay on this screen. When a Doppelganger is detected or host starts a round, your challenge will appear automatically.
            </p>
          </div>

          {/* Lobby Info Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Users size={16} color="#34d399" />
              <span>Players in Lobby:</span>
            </span>
            <span style={{ fontWeight: 800, color: '#34d399' }}>
              {lobbyStats.playerCount} Contenders
            </span>
          </div>

          <button 
            onClick={handleLeaveLobby} 
            className="btn btn-secondary" 
            style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem', gap: '0.4rem' }}
          >
            <LogOut size={15} /> Leave Lobby / Change Name
          </button>
        </div>
      )}

      {/* Switch to Host View Option (for paired testing) */}
      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button 
          onClick={onSwitchToHost} 
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-mono)' }}
        >
          ⚙️ Switch to Host Dashboard
        </button>
      </div>
    </div>
  );
}
