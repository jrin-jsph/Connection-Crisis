import React, { useState, useEffect } from 'react';
import { 
  Wifi, Smartphone, Laptop, CheckCircle2, AlertTriangle, 
  Copy, ExternalLink, RefreshCw, X, ShieldAlert, Zap
} from 'lucide-react';

export default function HotspotGuideModal({ isOpen, onClose, hostIp, hostPort = 5173 }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('windows');

  if (!isOpen) return null;

  const playerUrl = hostIp ? `http://${hostIp}:${hostPort}` : `http://localhost:${hostPort}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(playerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 7, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="card" style={{
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderColor: '#00f2fe',
        background: 'rgba(10, 15, 30, 0.96)',
        boxShadow: '0 0 40px rgba(0, 242, 254, 0.2)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wifi size={24} color="#00f2fe" />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00f2fe', margin: 0 }}>
              WINDOWS HOTSPOT & PLAYER SETUP
            </h2>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Player Connection Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(255, 0, 127, 0.15))',
          border: '1px solid #00f2fe',
          borderRadius: 12,
          padding: '1rem',
          marginBottom: '1.25rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            👉 Share This URL with Players (No App Install Required):
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: 'rgba(0,0,0,0.6)',
            padding: '0.6rem 1rem',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#00f2fe' }}>
              {playerUrl}
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? '#10b981' : '#00f2fe',
                color: '#000',
                border: 'none',
                borderRadius: 6,
                padding: '0.4rem 0.75rem',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              <span>{copied ? 'COPIED!' : 'COPY'}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('windows')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 6,
              background: activeTab === 'windows' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
              border: activeTab === 'windows' ? '1px solid #00f2fe' : '1px solid transparent',
              color: activeTab === 'windows' ? '#00f2fe' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            1. Windows Hotspot (Recommended)
          </button>
          <button
            onClick={() => setActiveTab('phone')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 6,
              background: activeTab === 'phone' ? 'rgba(255, 0, 127, 0.2)' : 'transparent',
              border: activeTab === 'phone' ? '1px solid #ff007f' : '1px solid transparent',
              color: activeTab === 'phone' ? '#ff007f' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            2. Phone Hotspot Fallback
          </button>
          <button
            onClick={() => setActiveTab('troubleshoot')}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: 6,
              background: activeTab === 'troubleshoot' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              border: activeTab === 'troubleshoot' ? '1px solid #f59e0b' : '1px solid transparent',
              color: activeTab === 'troubleshoot' ? '#f59e0b' : '#94a3b8',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            3. Troubleshooting
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'windows' && (
          <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            <h4 style={{ color: '#00f2fe', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
              How to Turn On Windows Mobile Hotspot:
            </h4>
            <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0' }}>
              <li>Press <strong>Win + I</strong> on your laptop to open Settings.</li>
              <li>Go to <strong>Network &amp; internet</strong> &rarr; <strong>Mobile hotspot</strong>.</li>
              <li>Toggle <strong>Mobile hotspot</strong> to <strong>ON</strong>.</li>
              <li>Set Network Name (SSID) to <code>ConnectionCrisis</code> and password to <code>crisis1234</code>.</li>
              <li>Have players connect their phones to the <code>ConnectionCrisis</code> Wi-Fi.</li>
              <li>Players open Safari/Chrome and go to the link above.</li>
            </ol>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.8rem', color: '#94a3b8' }}>
              💡 <em>Pro-tip: You can also double click <code>scripts\start-hotspot.bat</code> in the project folder to open hotspot settings automatically!</em>
            </div>
          </div>
        )}

        {activeTab === 'phone' && (
          <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            <h4 style={{ color: '#ff007f', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
              Using a Phone Hotspot (If Windows Hotspot is Unavailable):
            </h4>
            <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0' }}>
              <li>Turn on <strong>Personal Hotspot</strong> on any phone (iOS or Android).</li>
              <li>Connect your Windows laptop to that phone hotspot.</li>
              <li>Connect all other player phones to the exact same phone hotspot.</li>
              <li>The Host Dashboard will automatically detect your laptop's Wi-Fi IP and display the link.</li>
              <li>All players can play together seamlessly with zero internet required!</li>
            </ol>
          </div>
        )}

        {activeTab === 'troubleshoot' && (
          <div style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.6 }}>
            <h4 style={{ color: '#f59e0b', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
              Troubleshooting & Firewall:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0' }}>
              <li><strong>Page doesn't load on phone?</strong> Check Windows Defender Firewall. Ensure port 5173 and port 3001 are allowed inbound.</li>
              <li><strong>Phones can't see each other on venue Wi-Fi?</strong> Public/hotel Wi-Fi often has "AP Isolation" enabled. Use Windows Mobile Hotspot or Phone Hotspot instead.</li>
              <li><strong>IP address changed?</strong> If you switch Wi-Fi networks, simply click the Refresh button on the dashboard to recalculate the URL.</li>
            </ul>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.5rem', fontWeight: 800, fontSize: '0.85rem' }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
