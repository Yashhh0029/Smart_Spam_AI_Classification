import React, { useEffect, useState, useCallback } from 'react';
import { Clock, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

interface HistoryRecord {
  id: number;
  email_id: string;
  sender: string;
  subject: string;
  body_preview: string;
  is_spam: boolean;
  spam_score: number;
  severity: string;
  threat_category: string;
  heuristic_flags: string[];
  scanned_at: string;
}

interface HistoryPanelProps {
  refreshKey: number;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ refreshKey }) => {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/scan-history?limit=50`);
      setHistory(res.data);
    } catch {
      // Backend offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const fmt = (iso: string) => {
    try {
      return new Date(iso + 'Z').toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const catColor: Record<string, string> = {
    phishing:   'var(--danger)',
    spam:       'var(--warning)',
    legitimate: 'var(--success)',
  };

  const spamCount   = history.filter(h => h.is_spam).length;
  const phishCount  = history.filter(h => h.threat_category === 'phishing').length;
  const cleanCount  = history.filter(h => !h.is_spam).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total Scans',         value: history.length, color: 'var(--primary-light)' },
          { label: 'Threats Detected',    value: spamCount,      color: 'var(--danger)'  },
          { label: 'Phishing Attempts',   value: phishCount,     color: '#ff6b9d'        },
          { label: 'Clean Emails',        value: cleanCount,     color: 'var(--success)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-title" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)', marginBottom: 0 }}>
          <div className="card-icon icon-purple"><Clock size={16} /></div>
          <h2>Scan History</h2>
          <button className="btn-outline" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '0.78rem' }} onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {/* Column headers */}
        <div className="history-row" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--text-faint)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          <span>Sender</span>
          <span>Subject</span>
          <span>Category</span>
          <span>Score</span>
          <span>Time</span>
        </div>

        {loading && [...Array(6)].map((_, i) => (
          <div key={i} style={{ padding: '12px 16px' }}>
            <div className="skeleton" style={{ height: 16, borderRadius: 4, width: `${60 + Math.random() * 30}%` }} />
          </div>
        ))}

        {!loading && history.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)' }}>
            <Clock size={30} style={{ marginBottom: 10, opacity: 0.3 }} />
            <p>No scans recorded yet. Analyze an email to get started.</p>
          </div>
        )}

        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {history.map((row, i) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="history-row"
            >
              <span style={{ color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.sender}>
                {row.sender || '—'}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.subject}>
                {row.subject || '(No subject)'}
              </span>
              <span>
                {row.is_spam
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: catColor[row.threat_category] || 'var(--warning)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <ShieldAlert size={12} />
                      {(row.threat_category || 'spam').charAt(0).toUpperCase() + (row.threat_category || 'spam').slice(1)}
                    </span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <ShieldCheck size={12} /> Clean
                    </span>
                }
              </span>
              <span>
                <span style={{
                  fontWeight: 700, fontSize: '0.85rem',
                  color: row.is_spam
                    ? (row.severity === 'High' ? 'var(--danger)' : row.severity === 'Medium' ? 'var(--warning)' : 'var(--warning)')
                    : 'var(--success)'
                }}>
                  {row.spam_score?.toFixed(1)}%
                </span>
              </span>
              <span style={{ color: 'var(--text-faint)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                {fmt(row.scanned_at)}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
