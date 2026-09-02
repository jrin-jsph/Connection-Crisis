import React, { useState } from 'react';
import { 
  Wifi, Server, Users, Swords, Skull, Activity, Play, Crown, RotateCcw, 
  Bot, Trash2, Smartphone, ShieldCheck, Database, RefreshCw, AlertTriangle
} from 'lucide-react';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../../../shared/events.js';

export default function HostDashboard({ socket, isConnected, hostData, onRequestRefresh }) {
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  const showNotification = (msg, type = 'info') => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleStartGame = () => {
    if (!socket || !isConnected) return;
    socket.emit(SOCKET_EVENTS.HOST_START_GAME, {}, (res) => {
      if (res?.success) {
        showNotification('1v1 Game Challenge initiated!', 'success');
      } else {
        showNotification(res?.message || 'Could not start game', 'warning');
      }
    });
  };

  const handleStartRoyale = () => {
    if (!socket || !isConnected) return;
    socket.emit(SOCKET_EVENTS.HOST_START_ROYALE, {}, (res) => {
      if (res?.success) {
        showNotification(res.message || 'Royale Tournament initiated!', 'success');
      } else {
        showNotification(res?.message || 'Could not start Royale', 'warning');
      }
    });
  };

  const handleResetRoom = () => {
    if (!socket || !isConnected) return;
    if (window.confirm('Are you sure you want to reset the room and clear all players?')) {
      socket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, (res) => {
        showNotification('Game room reset successfully.', 'info');
      });
    }
  };

  const handleSimulatePlayer = (name) => {
    if (!socket || !isConnected) return;
    socket.emit(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, { name }, (res) => {
      if (res?.success) {
        showNotification(`Simulated player added: ${res.player.name}`, 'success');
      }
    });
  };

  const handleSimulateMultiple = (count) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        handleSimulatePlayer();
      }, i * 150);
    }
  };

  const handleSimulateDoppelganger = () => {
    // Add two players with close names
    handleSimulatePlayer('Jerrin');
    setTimeout(() => {
      handleSimulatePlayer('Jerin');
      setTimeout(() => {
        if (socket) {
          socket.emit(SOCKET_EVENTS.HOST_SIMULATE_CHALLENGE, {}, (res) => {
            if (res?.success) {
              showNotification('Doppelganger Crisis challenge triggered!', 'success');
            }
          });
        }
      }, 300);
    }, 200);
  };

  const handleRemovePlayer = (playerId) => {
    if (!socket || !isConnected) return;
    socket.emit(SOCKET_EVENTS.HOST_REMOVE_PLAYER, { playerId }, (res) => {
      if (res?.success) {
        showNotification('Player removed.', 'info');
      }
    });
  };

  const hostIp = hostData?.hostIps?.[0]?.address || 'localhost';
  const players = hostData?.players || [];
  const activePlayers = players.filter(p => p.status !== PLAYER_STATUS.ELIMINATED);
  const eliminatedPlayers = hostData?.eliminatedPlayers || players.filter(p => p.status === PLAYER_STATUS.ELIMINATED);
  const activeChallenges = hostData?.activeChallenges || [];
  const logs = hostData?.activityLog || [];

  return (
    <div className="dashboard-container">
      {/* Header Banner */}
      <header className="dash-header">
        <div className="logo-brand">
          <Wifi size={32} color="#00f2fe" />
          <span>CONNECTION CRISIS</span>
          <span className="badge badge-cyan" style={{ fontSize: '0.72rem', marginLeft: '0.5rem' }}>HOST CONSOLE</span>
        </div>

        <div className="header-badges">
          <div className="badge badge-online">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
            HOTSPOT: {hostData?.hotspotStatus?.type?.toUpperCase() || 'MOCK'} (ACTIVE)
          </div>

          <div className={`badge ${isConnected ? 'badge-online' : 'badge-offline'}`}>
            <Server size={14} />
            SERVER: {isConnected ? `ONLINE (:3001)` : 'OFFLINE'}
          </div>

          <div className="badge badge-magenta">
            <Database size={14} />
            DB: {hostData?.database?.type || 'IN-MEMORY'}
          </div>

          <button className="btn btn-secondary" onClick={onRequestRefresh} title="Refresh Status" style={{ padding: '0.35rem 0.6rem' }}>
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div style={{
          background: actionNotice.type === 'warning' ? 'rgba(245,158,11,0.2)' : 'rgba(0,242,254,0.15)',
          border: `1px solid ${actionNotice.type === 'warning' ? '#f59e0b' : '#00f2fe'}`,
          padding: '0.65rem 1rem',
          borderRadius: '12px',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={18} color={actionNotice.type === 'warning' ? '#f59e0b' : '#00f2fe'} />
          {actionNotice.msg}
        </div>
      )}

      {/* Quick Stats Bar */}
      <section className="stats-bar">
        <div className="stat-card">
          <div>
            <div className="stat-label">Host IP & Join URL</div>
            <div className="code-pill" style={{ marginTop: '0.3rem', fontSize: '0.95rem' }}>
              http://{hostIp}:5173
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(0,242,254,0.15)', color: '#00f2fe' }}>
            <Wifi size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Active Players</div>
            <div className="stat-value" style={{ color: '#34d399' }}>{activePlayers.length}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Active Challenges</div>
            <div className="stat-value" style={{ color: '#ff007f' }}>{activeChallenges.length}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(255,0,127,0.15)', color: '#ff007f' }}>
            <Swords size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Eliminated Players</div>
            <div className="stat-value" style={{ color: '#f87171' }}>{eliminatedPlayers.length}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            <Skull size={24} />
          </div>
        </div>
      </section>

      {/* Host Controls Action Bar */}
      <section className="action-bar">
        <button className="btn btn-primary" onClick={handleStartGame}>
          <Play size={18} /> Start Game (1v1)
        </button>

        <button className="btn btn-royale" onClick={handleStartRoyale}>
          <Crown size={18} /> Start Royale {activePlayers.length < 10 && `(${activePlayers.length}/10)`}
        </button>

        <button className="btn btn-danger" onClick={handleResetRoom}>
          <RotateCcw size={18} /> Reset Room
        </button>

        <button 
          className="btn btn-sim" 
          onClick={() => setShowSimPanel(!showSimPanel)}
          style={{ marginLeft: 'auto' }}
        >
          <Bot size={18} /> {showSimPanel ? 'Hide Simulation Mode' : 'Simulation Mode'}
        </button>
      </section>

      {/* Simulation Mode Drawer */}
      {showSimPanel && (
        <div className="sim-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: '#c084fc' }}>
            <Bot size={20} />
            <span>Virtual Player & Crisis Simulation Controls</span>
          </div>
          <div className="sim-buttons">
            <button className="btn btn-secondary" onClick={() => handleSimulatePlayer()}>
              +1 Random Virtual Player
            </button>
            <button className="btn btn-secondary" onClick={() => handleSimulateMultiple(5)}>
              +5 Virtual Players
            </button>
            <button className="btn btn-secondary" onClick={() => handleSimulateMultiple(10)}>
              +10 Players (Royale Ready)
            </button>
            <button className="btn btn-secondary" style={{ borderColor: 'rgba(255,0,127,0.4)', color: '#ff007f' }} onClick={handleSimulateDoppelganger}>
              ⚡ Trigger Doppelganger (Jerrin vs Jerin)
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Players & Challenges; Right = Eliminated & Activity Log */}
      <main className="dash-grid">
        {/* Left Column: Registered Players & Active Challenges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Active Challenges Box */}
          {activeChallenges.length > 0 && (
            <div className="card" style={{ borderColor: 'rgba(255,0,127,0.4)' }}>
              <div className="card-header">
                <h3 className="card-title" style={{ color: '#ff007f' }}>
                  <Swords size={20} />
                  Active Doppelganger Showdowns ({activeChallenges.length})
                </h3>
                <span className="badge badge-magenta">COUNTDOWN</span>
              </div>

              {activeChallenges.map((ch) => (
                <div key={ch.challengeId} className="challenge-box">
                  <div className="versus-bar">
                    <span style={{ color: '#00f2fe' }}>{ch.playerAName}</span>
                    <span className="vs-badge">VS</span>
                    <span style={{ color: '#ff007f' }}>{ch.playerBName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Status: <b>{ch.status}</b></span>
                    <span>Similarity: <b>{Math.round((ch.similarityScore || 0.9) * 100)}%</b></span>
                    <span>Timer: <b>{ch.countdownRemaining || 60}s</b></span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: '80%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Registered Players List */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Users size={20} color="#00f2fe" />
                Registered Players ({players.length})
              </h3>
              <span className="badge badge-cyan">{activePlayers.length} Active</span>
            </div>

            <div className="players-list">
              {players.length === 0 ? (
                <div className="empty-placeholder">
                  No players have connected yet.<br />
                  Players can connect to the Wi-Fi hotspot and browse to <b>http://{hostIp}:5173</b>
                </div>
              ) : (
                players.map((p) => (
                  <div key={p.playerId} className="player-row">
                    <div className="player-info">
                      <div className="player-avatar">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="player-name">
                          {p.name}
                          {p.isSimulated && (
                            <span className="badge badge-magenta" style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', fontSize: '0.65rem' }}>
                              VIRTUAL
                            </span>
                          )}
                        </div>
                        <div className="player-meta">
                          <Smartphone size={12} />
                          <span>{p.device || 'Browser'}</span>
                          <span>•</span>
                          <span>ID: {p.playerId.slice(0, 8)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span className={`badge ${
                        p.status === PLAYER_STATUS.ACTIVE ? 'badge-online' :
                        p.status === PLAYER_STATUS.IN_CHALLENGE ? 'badge-magenta' :
                        p.status === PLAYER_STATUS.ELIMINATED ? 'badge-offline' : 'badge-warning'
                      }`}>
                        {p.status}
                      </span>
                      <button 
                        onClick={() => handleRemovePlayer(p.playerId)} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                        title="Kick Player"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Eliminated Players & Real-Time Activity Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Eliminated Players */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Skull size={20} color="#f87171" />
                Eliminated Players ({eliminatedPlayers.length})
              </h3>
              <span className="badge badge-offline">KNOCKED OUT</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
              {eliminatedPlayers.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '0.75rem 0' }}>
                  No players eliminated yet.
                </div>
              ) : (
                eliminatedPlayers.map((p) => (
                  <div key={p.playerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.6rem', background: 'rgba(239,68,68,0.1)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <span style={{ fontWeight: 700, color: '#f87171' }}>{p.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Eligible to Rejoin</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Activity size={20} color="#10b981" />
                Real-Time Host Activity Log
              </h3>
              <span className="badge badge-online">LIVE STREAM</span>
            </div>

            <div className="log-stream">
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Waiting for activity...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="log-entry">
                    <span className="log-time">[{log.timestamp}]</span>
                    <span 
                      className="log-msg"
                      style={{
                        color: log.type === 'challenge' ? '#ff007f' :
                               log.type === 'royale' ? '#c084fc' :
                               log.type === 'player' ? '#00f2fe' :
                               log.type === 'warning' ? '#f59e0b' :
                               log.type === 'disconnect' ? '#f87171' : '#34d399'
                      }}
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
