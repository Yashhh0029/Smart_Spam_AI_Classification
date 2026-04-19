import React from 'react';
import { Shield, Activity } from 'lucide-react';

interface HeaderProps {
  scanCount: number;
  onLogout?: () => void;
  userEmail?: string;
  rightSlot?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ scanCount, rightSlot }) => {
  return (
    <header className="app-header">
      <div className="app-logo">
        <div className="app-logo-icon">
          <Shield size={18} color="#fff" />
        </div>
        <h1>Smart Spam AI</h1>
      </div>

      <div className="app-header-right">
        {scanCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: '20px', padding: '5px 12px',
            fontSize: '0.78rem', fontWeight: 600,
            color: 'var(--primary-light)'
          }}>
            <Activity size={12} />
            {scanCount} Scan{scanCount !== 1 ? 's' : ''} Run
          </div>
        )}

        <div className="status-pill">
          <span className="status-dot" />
          System Online
        </div>

        {rightSlot}
      </div>
    </header>
  );
};

export default Header;
