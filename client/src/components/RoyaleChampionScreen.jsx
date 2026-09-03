import React from 'react';
import { Crown, Sparkles, Trophy, ShieldCheck, ArrowRight, Flame } from 'lucide-react';

export default function RoyaleChampionScreen({ champion, isCurrentPlayer, totalRounds, onReturnToLobby }) {
  return (
    <div className="player-container" style={{ maxWidth: 500, margin: '0 auto', padding: '1.5rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Grand Royale Champion Showcase */}
      <div className="card" style={{
        borderColor: '#eab308',
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.2) 0%, rgba(10, 12, 24, 0.98) 100%)',
        boxShadow: '0 0 70px rgba(234, 179, 8, 0.6)',
        textAlign: 'center',
        padding: '3rem 1.75rem',
        animation: 'pulse 2s infinite alternate'
      }}>
        
        {/* Crown Icon Badge */}
        <div style={{
          width: 104,
          height: 104,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, rgba(10, 12, 24, 0.9) 100%)',
          border: '3px solid #eab308',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          boxShadow: '0 0 45px rgba(234, 179, 8, 0.8)'
        }}>
          <Crown size={58} color="#eab308" />
        </div>

        {/* Grand Title: THE ONLY REAL ONE */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#eab308', background: 'rgba(234,179,8,0.15)', border: '1px solid rgba(234,179,8,0.3)', padding: '0.4rem 1.25rem', borderRadius: 20, fontSize: '0.9rem', fontWeight: 900, letterSpacing: '1px', marginBottom: '1rem' }}>
          <Sparkles size={16} />
          <span>CONNECTION CRISIS ROYALE CHAMPION</span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#facc15', letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: '0.5rem' }}>
          THE ONLY REAL ONE
        </h1>

        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', marginBottom: '1.5rem' }}>
          {champion?.name || 'Grand Champion'} {isCurrentPlayer ? '(YOU)' : ''}
        </h2>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ROUNDS SURVIVED</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8' }}>{totalRounds || 'ALL'}</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SURVIVAL STATUS</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>UNBROKEN</div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onReturnToLobby}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '1.1rem',
            fontSize: '1.1rem',
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}
        >
          <span>RETURN TO LOBBY</span>
          <ArrowRight size={20} />
        </button>

      </div>
    </div>
  );
}
