import React, { useState, useEffect } from 'react';
import { WifiOff, Skull, AlertOctagon, RefreshCw, Terminal, Eye } from 'lucide-react';

export default function LoserScreen({ player, opponentName, matchResult, onSpectate }) {
  const [signalBars, setSignalBars] = useState(3);
  const [terminalLogs, setTerminalLogs] = useState([]);

  // Simulated Wi-Fi disconnection animation
  useEffect(() => {
    const t1 = setTimeout(() => {
      setSignalBars(2);
      setTerminalLogs(prev => [...prev, '> [NETWORK] Packet loss detected (35%)...']);
    }, 700);

    const t2 = setTimeout(() => {
      setSignalBars(1);
      setTerminalLogs(prev => [...prev, '> [AUTH] Doppelganger conflict resolved: Access Revoked.']);
    }, 1500);

    const t3 = setTimeout(() => {
      setSignalBars(0);
      setTerminalLogs(prev => [...prev, '> [CRISIS] CONNECTION TERMINATED. Client de-authenticated.']);
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="player-container" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Glitch Container Card */}
      <div className="card" style={{
        borderColor: '#f43f5e',
        boxShadow: '0 0 60px rgba(244, 63, 94, 0.5)',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        background: 'radial-gradient(circle, rgba(244, 63, 94, 0.15) 0%, rgba(10,12,24,0.95) 100%)'
      }}>
        
        {/* Animated Wi-Fi Drop / Skull Icon */}
        <div style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.2)',
          border: '3px solid #f43f5e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          boxShadow: '0 0 35px rgba(244, 63, 94, 0.6)',
          animation: 'pulse 1s infinite'
        }}>
          {signalBars === 0 ? (
            <WifiOff size={52} color="#f87171" />
          ) : (
            <Skull size={52} color="#f87171" />
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#f87171', letterSpacing: '-0.5px', marginBottom: '0.25rem' }}>
          YOU LOST
        </h1>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '1px', marginBottom: '0.75rem' }}>
          YOUR CONNECTION WAS TERMINATED
        </h2>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#f43f5e', background: 'rgba(244,63,94,0.2)', padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.5rem' }}>
          <AlertOctagon size={16} />
          <span>STATUS: ELIMINATED</span>
        </div>

        {/* Simulated Wi-Fi Signal Dropper */}
        <div style={{ background: 'rgba(0, 0, 0, 0.6)', borderRadius: 16, padding: '1rem', border: '1px solid rgba(244, 63, 94, 0.3)', marginBottom: '1.5rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Wi-Fi Hotspot Link:</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: signalBars > 0 ? '#eab308' : '#f87171' }}>
              {signalBars === 3 ? 'CONNECTED' : signalBars > 0 ? 'SIGNAL DEGRADING...' : 'DISCONNECTED (0 BARS)'}
            </span>
          </div>

          {/* Signal Strength Bar Animation */}
          <div style={{ display: 'flex', gap: '0.4rem', height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: '1rem' }}>
            <div style={{ flex: 1, background: signalBars >= 1 ? '#f43f5e' : 'transparent', transition: 'background 0.3s ease' }} />
            <div style={{ flex: 1, background: signalBars >= 2 ? '#f43f5e' : 'transparent', transition: 'background 0.3s ease' }} />
            <div style={{ flex: 1, background: signalBars >= 3 ? '#f43f5e' : 'transparent', transition: 'background 0.3s ease' }} />
          </div>

          {/* Terminal Console Logs */}
          <div style={{ background: 'rgba(0,0,0,0.8)', borderRadius: 8, padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#38bdf8', minHeight: 70, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: 'var(--text-dim)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Terminal size={12} />
              <span>TERMINAL DISCONNECT LOG</span>
            </div>
            {terminalLogs.map((log, i) => (
              <div key={i} style={{ color: log.includes('TERMINATED') ? '#f87171' : '#94a3b8' }}>
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Spectator Mode / Standby Button */}
        <button
          onClick={onSpectate}
          style={{
            width: '100%',
            padding: '1rem',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <Eye size={18} color="#00f2fe" />
          <span>SPECTATE TOURNAMENT</span>
        </button>

      </div>
    </div>
  );
}
