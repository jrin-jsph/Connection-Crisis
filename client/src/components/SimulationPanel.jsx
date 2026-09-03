import React, { useState } from 'react';
import { 
  Bot, UserPlus, Users, Zap, WifiOff, Trophy, RotateCcw, 
  Play, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { SOCKET_EVENTS } from '../../../shared/events.js';

export default function SimulationPanel({ socket, isConnected, hostData }) {
  const [customName, setCustomName] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleAddSinglePlayer = (name) => {
    if (!socket) return;
    socket.emit(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, { name: name || customName || undefined }, (res) => {
      if (res?.success) {
        showStatus(`✅ Added Virtual Bot: ${res.player.name}`);
        setCustomName('');
      } else {
        showStatus(`❌ ${res?.message || 'Failed to add player'}`);
      }
    });
  };

  const handleAddBatchPlayers = (count = 4) => {
    if (!socket) return;
    const batchNames = ['Marcus', 'Elena', 'Sophia', 'David', 'Kai', 'Nova', 'Liam', 'Zoe'];
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        socket.emit(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, { name: batchNames[i % batchNames.length] + '_' + Math.floor(Math.random() * 90 + 10) });
      }, i * 200);
    }
    showStatus(`⚡ Spawning ${count} simulated contenders...`);
  };

  const handleTriggerDoppelganger = () => {
    if (!socket) return;
    // Add player with very similar name to an existing one
    const active = hostData?.players?.filter(p => !p.eliminated) || [];
    if (active.length > 0) {
      const baseName = active[0].name;
      const doppelName = baseName.length > 3 ? baseName.slice(0, -1) : baseName + 'n';
      handleAddSinglePlayer(doppelName);
      showStatus(`🎭 Injected Doppelganger: "${doppelName}" vs "${baseName}"`);
    } else {
      handleAddSinglePlayer('Jerrin');
      setTimeout(() => handleAddSinglePlayer('Jerin'), 400);
      showStatus(`🎭 Injected Doppelganger Pair: Jerrin vs Jerin`);
    }
  };

  const handleSimulateDisconnect = () => {
    if (!socket) return;
    socket.emit('host:simulate_disconnect', { playerId: selectedPlayerId || undefined }, (res) => {
      if (res?.success) {
        showStatus(`🔌 Simulated network disconnect on ${res.player.name}`);
      } else {
        showStatus(`❌ ${res?.message || 'No active player to disconnect'}`);
      }
    });
  };

  const handleSimulateVictory = () => {
    if (!socket) return;
    socket.emit('host:simulate_victory', {}, (res) => {
      if (res?.success) {
        showStatus(`🏆 Simulated match victory! Winner: ${res.matchResult?.winnerId}`);
      } else {
        showStatus(`❌ ${res?.message || 'No active game to resolve'}`);
      }
    });
  };

  const handleResetRoom = () => {
    if (!socket) return;
    if (window.confirm('Reset all game state, players, and ban lists?')) {
      socket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, (res) => {
        showStatus(`🔄 Room state fully reset!`);
      });
    }
  };

  const activePlayers = hostData?.players?.filter(p => !p.eliminated) || [];

  return (
    <div className="card" style={{ borderColor: 'rgba(0, 242, 254, 0.4)', background: 'rgba(10, 15, 30, 0.85)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={22} color="#00f2fe" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00f2fe', margin: 0 }}>
            SIMULATION & QA CONTROL PANEL
          </h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          SANDBOX MODE ACTIVE
        </span>
      </div>

      {statusMsg && (
        <div style={{ background: 'rgba(0, 242, 254, 0.15)', border: '1px solid #00f2fe', color: '#00f2fe', padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Control Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        
        {/* 1. Add Single Simulated Player */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <UserPlus size={14} />
            <span>ADD SIMULATED BOT</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="text"
              placeholder="Name (or auto)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
            />
            <button
              onClick={() => handleAddSinglePlayer()}
              style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: '#00f2fe', color: '#000', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', border: 'none' }}
            >
              +1 BOT
            </button>
          </div>
        </div>

        {/* 2. Spawn Tournament Batch */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={14} />
            <span>BATCH BOT SPAWN</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => handleAddBatchPlayers(4)}
              style={{ flex: 1, padding: '0.4rem', borderRadius: 6, background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7', color: '#a855f7', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              +4 BOTS
            </button>
            <button
              onClick={() => handleAddBatchPlayers(8)}
              style={{ flex: 1, padding: '0.4rem', borderRadius: 6, background: 'rgba(168, 85, 247, 0.2)', border: '1px solid #a855f7', color: '#a855f7', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              +8 BOTS
            </button>
          </div>
        </div>

        {/* 3. Doppelganger Trigger */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ff007f', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ShieldAlert size={14} />
            <span>DOPPELGANGER INJECTION</span>
          </div>
          <button
            onClick={handleTriggerDoppelganger}
            style={{ width: '100%', padding: '0.4rem', borderRadius: 6, background: 'rgba(255, 0, 127, 0.2)', border: '1px solid #ff007f', color: '#ff007f', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            TRIGGER CRISIS (Jerrin/Jerin)
          </button>
        </div>

        {/* 4. Simulate Network Drop */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <WifiOff size={14} />
            <span>SIMULATE DISCONNECT</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', borderRadius: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
            >
              <option value="">Any Active</option>
              {activePlayers.map(p => (
                <option key={p.playerId} value={p.playerId}>{p.name}</option>
              ))}
            </select>
            <button
              onClick={handleSimulateDisconnect}
              style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#f59e0b', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              DROP
            </button>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
        <button
          onClick={handleSimulateVictory}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 8, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <Trophy size={16} />
          <span>AUTO-RESOLVE VICTORY</span>
        </button>

        <button
          onClick={handleResetRoom}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#ef4444', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <RotateCcw size={16} />
          <span>RESET ROOM STATE</span>
        </button>
      </div>

    </div>
  );
}
