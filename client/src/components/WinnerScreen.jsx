import React from 'react';
import { Trophy, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function WinnerScreen({ player, opponentName, matchResult, onKeepPlaying }) {
  return (
    <div className="player-container" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="card" style={{
        borderColor: '#10b981',
        boxShadow: '0 0 50px rgba(16, 185, 129, 0.45)',
        textAlign: 'center',
        padding: '3rem 1.75rem',
        animation: 'pulse 2s infinite alternate'
      }}>
        {/* Trophy Badge */}
        <div style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(10,12,24,0.9) 100%)',
          border: '3px solid #10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 0 35px rgba(16, 185, 129, 0.6)'
        }}>
          <Trophy size={54} color="#10b981" />
        </div>

        {/* Title */}
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#34d399', letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
          YOU WON
        </h1>

        <p style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Identity Claimed & Verified
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '0.4rem 1rem', borderRadius: 20, fontSize: '0.85rem', fontWeight: 800, marginBottom: '1.75rem' }}>
          <ShieldCheck size={16} />
          <span>STATUS: ACTIVE CONTENDER</span>
        </div>

        {/* Match Details */}
        <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: 16, padding: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '2rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Contender:</span>
            <span style={{ color: '#00f2fe', fontWeight: 700 }}>{player?.name} (YOU)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Opponent:</span>
            <span style={{ color: '#ff007f', fontWeight: 700 }}>{opponentName || 'Doppelganger'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Outcome:</span>
            <span style={{ color: '#34d399', fontWeight: 800 }}>Opponent Eliminated</span>
          </div>
        </div>

        {/* Keep Playing Button */}
        <button
          onClick={onKeepPlaying}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '1.1rem',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
        >
          <span>KEEP PLAYING</span>
          <ArrowRight size={20} />
        </button>

      </div>
    </div>
  );
}
