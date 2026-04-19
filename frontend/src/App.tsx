import React, { useState, useCallback } from 'react';
import { Shield, Search, Mail, BarChart2, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';

import Header          from './components/Header';
import ThreatPanel     from './components/ThreatPanel';
import InboxPanel      from './components/InboxPanel';
import MetricsDashboard from './components/MetricsDashboard';
import HistoryPanel    from './components/HistoryPanel';

type Tab = 'scanner' | 'inbox' | 'analytics' | 'history';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'scanner',   label: 'Threat Scanner', icon: <Search size={15} /> },
  { id: 'inbox',     label: 'Inbox',          icon: <Mail size={15} /> },
  { id: 'analytics', label: 'Analytics',      icon: <BarChart2 size={15} /> },
  { id: 'history',   label: 'History',        icon: <Clock size={15} /> },
];

const PAGE_VARIANTS = {
  initial:  { opacity: 0, y: 10 },
  animate:  { opacity: 1, y: 0  },
  exit:     { opacity: 0, y: -6 },
};

function App() {
  const [tab, setTab]             = useState<Tab>('scanner');
  const [scanCount, setScanCount] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);

  const handleScanComplete = useCallback(() => {
    setScanCount(c => c + 1);
    setHistoryKey(k => k + 1);
  }, []);

  return (
    <div className="app-shell">
      <Header scanCount={scanCount} />

      {/* Tab navigation */}
      <nav className="app-nav">
        <div className="tab-bar">
          {TABS.map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={`tab-btn${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <main className="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={PAGE_VARIANTS}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {tab === 'scanner' && (
              <ThreatPanel onScanComplete={handleScanComplete} />
            )}

            {tab === 'inbox' && (
              <InboxPanel onScanComplete={handleScanComplete} />
            )}

            {tab === 'analytics' && (
              <MetricsDashboard />
            )}

            {tab === 'history' && (
              <HistoryPanel refreshKey={historyKey} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '1rem 2rem',
        borderTop: '1px solid var(--glass-border)',
        color: 'var(--text-faint)',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
      }}>
        <Shield size={12} />
        Smart Spam AI v2.0 · Naive Bayes · SVM · DistilBERT
      </footer>
    </div>
  );
}

export default App;
