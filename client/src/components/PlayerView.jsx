import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, User, Smartphone, ShieldCheck, CheckCircle2, 
  Clock, Wifi, AlertCircle, LogOut, Loader2, Users 
} from 'lucide-react';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../../../shared/events.js';

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
      // Check if current player status changed (e.g. eliminated or challenged)
      if (playerData?.playerId) {
        const current = data.players?.find(p => p.playerId === playerData.playerId);
        if (current && current.status !== playerData.status) {
          setPlayerData(prev => ({ ...prev, ...current }));
          sessionStorage.setItem('cc_player_session', JSON.stringify({ ...playerData, ...current }));
        }
      }
    });

    return () => {
      socket.off(SOCKET_EVENTS.HOST_STATUS_UPDATE);
    };
  }, [socket, playerData]);

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
    setPlayerName('');
  };

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
