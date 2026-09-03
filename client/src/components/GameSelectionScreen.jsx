import React, { useState, useEffect } from 'react';
import { Zap, Scissors, Brain, Calculator, Target, Sparkles, Clock } from 'lucide-react';

const MINIGAME_INFO = {
  reaction_rush: {
    id: 'reaction_rush',
    title: 'Reaction Rush',
    icon: Zap,
    color: '#00f2fe',
    description: 'Fastest reaction wins! Wait for the signal and tap instantly.',
    rule: '⚡ Tap only when CLICK! appears. False start = Loss.'
  },
  rock_paper_scissors: {
    id: 'rock_paper_scissors',
    title: 'Rock Paper Scissors',
    icon: Scissors,
    color: '#ff007f',
    description: 'Best of 3 classic showdown with 5-second rounds.',
    rule: '✂️ Secret choices revealed simultaneously.'
  },
  memory_match: {
    id: 'memory_match',
    title: 'Memory Match',
    icon: Brain,
    color: '#a855f7',
    description: 'Simon Says color sequence reproduction.',
    rule: '🧠 Pattern expands each round. One mistake = Elimination.'
  },
  quick_math: {
    id: 'quick_math',
    title: 'Quick Math',
    icon: Calculator,
    color: '#3b82f6',
    description: 'Fast arithmetic speed calculation.',
    rule: '🔢 +1 pt for correct answer, -1 pt penalty. First to 3 wins.'
  },
  target_click: {
    id: 'target_click',
    title: 'Target Click',
    icon: Target,
    color: '#10b981',
    description: '10-second rapid precision target tapping.',
    rule: '🎯 Tap spawning targets quickly. Most points wins.'
  }
};

const ALL_GAMES = Object.values(MINIGAME_INFO);

export default function GameSelectionScreen({ selectedGameType, durationSec = 3, onSelectionComplete }) {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSec);
  const [cyclingIndex, setCyclingIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const targetGame = MINIGAME_INFO[selectedGameType] || MINIGAME_INFO.reaction_rush;

  // Rapid cycling roulette effect during first 1.8 seconds
  useEffect(() => {
    let cycleInterval = null;
    if (!isLocked) {
      cycleInterval = setInterval(() => {
        setCyclingIndex((prev) => (prev + 1) % ALL_GAMES.length);
      }, 120);
    }

    const lockTimer = setTimeout(() => {
      if (cycleInterval) clearInterval(cycleInterval);
      setIsLocked(true);
    }, 1500);

    return () => {
      if (cycleInterval) clearInterval(cycleInterval);
      clearTimeout(lockTimer);
    };
  }, [isLocked]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onSelectionComplete) onSelectionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onSelectionComplete]);

  const displayedGame = isLocked ? targetGame : ALL_GAMES[cyclingIndex];
  const IconComponent = displayedGame.icon;

  return (
    <div className="player-container" style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '0.4rem 1rem', borderRadius: 20, marginBottom: '0.75rem' }}>
          <Sparkles size={16} color="#00f2fe" />
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#00f2fe', letterSpacing: '1px' }}>
            RANDOM ARENA SELECTION
          </span>
        </div>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px' }}>
          SELECTING MINIGAME...
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          <Clock size={14} />
          <span>Starting showdown in <b style={{ color: '#00f2fe' }}>{secondsRemaining}s</b></span>
        </div>
      </div>

      {/* Main Selected / Cycling Game Card */}
      <div className="card" style={{
        borderColor: isLocked ? displayedGame.color : 'rgba(255, 255, 255, 0.2)',
        boxShadow: isLocked ? `0 0 45px ${displayedGame.color}66` : '0 10px 30px rgba(0,0,0,0.5)',
        textAlign: 'center',
        padding: '2.5rem 1.5rem',
        transition: 'all 0.2s ease',
        transform: isLocked ? 'scale(1.02)' : 'scale(1)'
      }}>
        {/* Animated Icon Badge */}
        <div style={{
          width: 88,
          height: 88,
          borderRadius: 24,
          background: `radial-gradient(circle, ${displayedGame.color}33 0%, rgba(10,12,24,0.8) 100%)`,
          border: `2px solid ${displayedGame.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          boxShadow: `0 0 25px ${displayedGame.color}55`,
          animation: isLocked ? 'pulse 1.5s infinite' : 'none'
        }}>
          <IconComponent size={48} color={displayedGame.color} />
        </div>

        {/* Title */}
        <h3 style={{ fontSize: '1.8rem', fontWeight: 900, color: displayedGame.color, letterSpacing: '-0.5px', marginBottom: '0.5rem' }}>
          {displayedGame.title}
        </h3>

        {/* Description */}
        <p style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', lineHeight: 1.4 }}>
          {displayedGame.description}
        </p>

        {/* Rules Capsule */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          padding: '0.75rem',
          fontSize: '0.85rem',
          color: 'rgba(255, 255, 255, 0.85)',
          textAlign: 'left'
        }}>
          {displayedGame.rule}
        </div>
      </div>

      {/* Mini Carousel Indicators for 5 Games */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginTop: '1.5rem' }}>
        {ALL_GAMES.map((g) => {
          const isCurrent = displayedGame.id === g.id;
          const GIcon = g.icon;
          return (
            <div
              key={g.id}
              style={{
                background: isCurrent ? `${g.color}33` : 'rgba(18, 22, 40, 0.6)',
                border: isCurrent ? `2px solid ${g.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 12,
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                transition: 'all 0.15s ease',
                transform: isCurrent ? 'scale(1.08)' : 'scale(1)'
              }}
            >
              <GIcon size={20} color={isCurrent ? g.color : 'rgba(255,255,255,0.4)'} style={{ margin: '0 auto' }} />
            </div>
          );
        })}
      </div>

    </div>
  );
}
