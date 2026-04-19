import React, { useState } from 'react';
import { Mail, RefreshCw, ShieldAlert, ShieldCheck, Zap, User, Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

interface Email {
  id: string;
  sender: string;
  subject: string;
  body: string;
  date: string;
}

interface ScanResult {
  is_spam: boolean;
  spam_score: number;
  severity: string;
  threat_category: string;
  heuristic_flags: string[];
  phishing_indicators: string[];
}

interface EmailWithResult extends Email {
  result?: ScanResult;
  scanning?: boolean;
}

interface InboxPanelProps {
  onScanComplete: () => void;
}

const severityColor: Record<string, string> = {
  High:   'var(--danger)',
  Medium: 'var(--warning)',
  Low:    'var(--success)',
};

function getEmailCardClass(em: EmailWithResult): string {
  if (!em.result) return 'email-card unscanned';
  const sev = em.result.severity;
  return `email-card threat-${sev.toLowerCase()}`;
}

const InboxPanel: React.FC<InboxPanelProps> = ({ onScanComplete }) => {
  const [emails, setEmails]       = useState<EmailWithResult[]>([]);
  const [loading, setLoading]     = useState(false);
  const [scanningAll, setScanAll] = useState(false);
  const [isMock, setIsMock]       = useState(false);
  const [error, setError]         = useState('');

  // IMAP direct connection state
  const [showImapForm, setShowImapForm] = useState(false);
  const [imapEmail, setImapEmail]       = useState('');
  const [imapPassword, setImapPassword] = useState('');

  // ── Fetch via Mock / OAuth (Fallback) ────────────────────────────────────
  const fetchEmails = async () => {
    setLoading(true);
    setError('');
    setShowImapForm(false);
    try {
      const res = await axios.post(`${API_BASE}/fetch-emails`, {
        use_mock: true,
        access_token: null,
      });
      setEmails(res.data.data.map((e: Email) => ({ ...e })));
      setIsMock(res.data.is_mock);
    } catch (e: any) {
      setError('Failed to load demo emails. Backend may be offline.');
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch via IMAP (Direct, No OAuth Needed) ─────────────────────────────
  const fetchImapEmails = async () => {
    if (!imapEmail || !imapPassword) {
      setError('Please provide both email and app password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/fetch-emails-imap`, {
        email_address: imapEmail.trim(),
        app_password: imapPassword.trim(),
        max_results: 15
      });
      setEmails(res.data.data.map((e: Email) => ({ ...e })));
      setIsMock(res.data.is_mock);
      setShowImapForm(false);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to connect. Make sure you are using an App Password, not your real password.');
    } finally {
      setLoading(false);
    }
  };

  // ── Scan single ──────────────────────────────────────────────────────────
  const scanEmail = async (id: string) => {
    const em = emails.find(e => e.id === id);
    if (!em || em.scanning) return;

    setEmails(prev => prev.map(e => e.id === id ? { ...e, scanning: true } : e));
    try {
      const res = await axios.post(`${API_BASE}/scan-email`, {
        email_id: id,
        sender:   em.sender,
        subject:  em.subject,
        body:     em.body,
      });
      setEmails(prev => prev.map(e =>
        e.id === id ? { ...e, scanning: false, result: res.data } : e
      ));
      onScanComplete();
    } catch {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, scanning: false } : e));
    }
  };

  // ── Scan all ─────────────────────────────────────────────────────────────
  const scanAll = async () => {
    setScanAll(true);
    for (const em of emails) {
      if (!em.result) await scanEmail(em.id);
    }
    setScanAll(false);
  };

  const unscannedCount = emails.filter(e => !e.result).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Action bar */}
      <div className="card" style={{ padding: '1.25rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className="card-icon icon-blue" style={{ flexShrink: 0 }}><Mail size={16} /></div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Inbox Scanner</h2>
          {isMock && (
            <span style={{
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)',
              borderRadius: '20px', padding: '3px 10px', color: 'var(--secondary)',
            }}>Demo Mode</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button id="btn-load-demo" className="btn-outline" onClick={() => fetchEmails()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Load Demo
            </button>
            <button
              id="btn-connect-gmail"
              className="btn-primary"
              style={{ padding: '9px 18px', fontSize: '0.87rem' }}
              onClick={() => setShowImapForm(!showImapForm)}
              disabled={loading}
            >
              <Mail size={14} /> Connect Gmail
            </button>

            {emails.length > 0 && unscannedCount > 0 && (
              <button id="btn-scan-all" className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.87rem', background: 'linear-gradient(135deg,#f43f5e,#f59e0b)' }}
                onClick={scanAll} disabled={scanningAll}>
                {scanningAll
                  ? <><span className="spin"><Zap size={14} /></span> Scanning…</>
                  : <><ShieldAlert size={14} /> Scan All ({unscannedCount})</>}
              </button>
            )}
          </div>
        </div>

        {/* IMAP Connect Form (Replaces OAuth Popup) */}
        <AnimatePresence>
          {showImapForm && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ 
                background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.2)', 
                borderRadius: '12px', padding: '16px' 
              }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', padding: '0 12px' }}>
                    <User size={14} color="#64748b" />
                    <input 
                      type="email" 
                      placeholder="Your Gmail address" 
                      value={imapEmail} 
                      onChange={e => setImapEmail(e.target.value)} 
                      style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px', width: '100%', outline: 'none', fontSize: '0.9rem' }} 
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', padding: '0 12px' }}>
                    <Lock size={14} color="#64748b" />
                    <input 
                      type="password" 
                      placeholder="16-character App Password" 
                      value={imapPassword} 
                      onChange={e => setImapPassword(e.target.value)} 
                      style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px', width: '100%', outline: 'none', fontSize: '0.9rem', letterSpacing: '2px' }} 
                    />
                  </div>
                  <button className="btn-primary" onClick={fetchImapEmails} disabled={loading} style={{ background: '#0ea5e9' }}>
                    {loading ? 'Connecting...' : 'Connect'}
                  </button>
                  <button className="btn-outline" onClick={() => setShowImapForm(false)} style={{ padding: '0 12px' }}>
                    <X size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#94a3b8', marginTop: '12px' }}>
                  <span style={{ color: '#0ea5e9', fontWeight: 700 }}>Note:</span> Do not use your real password. Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none' }}>Google Account → App Passwords</a> to generate a 16-character passkey. Credentials are never saved.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div style={{ marginTop: '10px', padding: '8px 14px', background: 'var(--danger-bg)', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </div>

      {/* Email list */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '64px', borderRadius: '14px' }} />
          ))}
        </div>
      )}

      {!loading && emails.length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-faint)' }}>
          <Mail size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p>Connect your Gmail or load demo emails to begin scanning.</p>
        </div>
      )}

      <AnimatePresence>
        {emails.map((em, idx) => (
          <motion.div
            key={em.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className={getEmailCardClass(em)}
          >
            {/* Avatar */}
            <div className="email-avatar">
              <User size={16} />
            </div>

            {/* Info */}
            <div style={{ minWidth: 0 }}>
              <div className="email-sender">{em.sender}</div>
              <div className="email-subject">{em.subject}</div>
              {em.date && <div className="email-date">{em.date}</div>}

              {/* Inline result */}
              {em.result && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  {em.result.is_spam
                    ? <ShieldAlert size={13} color={severityColor[em.result.severity]} />
                    : <ShieldCheck size={13} color="var(--success)" />
                  }
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 700,
                    color: em.result.is_spam ? severityColor[em.result.severity] : 'var(--success)',
                  }}>
                    {em.result.is_spam ? `${em.result.threat_category?.toUpperCase()} · ${em.result.spam_score}%` : 'CLEAN'}
                  </span>
                  {em.result.is_spam && (
                    <span className={`badge badge-${em.result.severity.toLowerCase()}`} style={{ fontSize: '0.7rem', padding: '2px 7px' }}>
                      {em.result.severity}
                    </span>
                  )}
                  {em.result.heuristic_flags.slice(0, 1).map((f, i) => (
                    <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      · {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Scan button */}
            <div style={{ flexShrink: 0 }}>
              {!em.result && !em.scanning && (
                <button className="btn-outline" style={{ padding: '7px 14px', fontSize: '0.8rem' }} onClick={() => scanEmail(em.id)}>
                  <Zap size={13} /> Scan
                </button>
              )}
              {em.scanning && (
                <span style={{ color: 'var(--primary-light)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="spin"><Zap size={14} /></span> Scanning
                </span>
              )}
              {em.result && !em.scanning && (
                <button className="btn-outline" style={{ padding: '7px 12px', fontSize: '0.78rem', opacity: 0.6 }} onClick={() => scanEmail(em.id)}>
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default InboxPanel;
