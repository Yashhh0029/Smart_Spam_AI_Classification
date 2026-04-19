import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import ThreatGauge from './ThreatGauge';
import ExplainabilityPanel from './ExplainabilityPanel';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

interface PredictionResult {
  is_spam: boolean;
  spam_score: number;
  severity: string;
  threat_category: string;
  models: { naive_bayes: number; svm: number; transformer: number };
  explainability: { word: string; spam_score: number }[];
  heuristic_flags: string[];
  phishing_indicators: string[];
}

interface ThreatPanelProps {
  onScanComplete: () => void;
}

const ThreatPanel: React.FC<ThreatPanelProps> = ({ onScanComplete }) => {
  const [sender, setSender]   = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody]       = useState('');

  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<PredictionResult | null>(null);
  const [error, setError]           = useState('');

  const canScan = (body.trim() || subject.trim()) && !loading;

  const handleScan = async () => {
    if (!canScan) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await axios.post(`${API_BASE}/predict`, { sender, subject, body });
      setResult(res.data);
      onScanComplete();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Scan failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setSender(''); setSubject(''); setBody(''); setResult(null); setError(''); };

  const categoryLabel = (cat: string) => {
    if (cat === 'phishing') return { label: 'Phishing', cls: 'badge badge-phishing' };
    if (cat === 'spam')     return { label: 'Spam',     cls: 'badge badge-spam' };
    return { label: 'Legitimate',   cls: 'badge badge-clean' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Input card */}
      <div className="card">
        <div className="card-title">
          <div className="card-icon icon-purple"><Zap size={16} /></div>
          <h2>Email Input</h2>
          {result && (
            <button className="btn-outline" style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '0.8rem' }} onClick={handleReset}>
              <RefreshCw size={13} /> Clear
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            id="input-sender"
            className="glass-input"
            placeholder="Sender (e.g. security@paypal.com)"
            value={sender}
            onChange={e => setSender(e.target.value)}
          />
          <input
            id="input-subject"
            className="glass-input"
            placeholder="Subject (e.g. URGENT: Account Suspended)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <textarea
            id="input-body"
            className="glass-input"
            rows={6}
            placeholder="Paste email body here…"
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{ resize: 'vertical' }}
          />

          <button
            id="btn-scan"
            className={`btn-primary${loading ? ' scanning' : ''}`}
            style={{ width: '100%', marginTop: '4px' }}
            onClick={handleScan}
            disabled={!canScan}
          >
            {loading
              ? <><span className="spin"><ShieldAlert size={18} /></span> Analyzing…</>
              : <><ShieldAlert size={18} /> Scan for Threats</>
            }
          </button>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-bg)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Result card */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y:  0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="card" style={{
              border: `1px solid ${result.is_spam ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
            }}>
              <div className="card-title">
                <div className={`card-icon ${result.is_spam ? 'icon-red' : 'icon-green'}`}>
                  {result.is_spam ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
                </div>
                <h2>{result.is_spam ? 'Threat Detected' : 'Email Clear'}</h2>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <span className={categoryLabel(result.threat_category).cls}>
                    {categoryLabel(result.threat_category).label}
                  </span>
                  <span className={`badge badge-${result.severity.toLowerCase()}`}>
                    {result.severity}
                  </span>
                </div>
              </div>

              {/* Gauge + model breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                <ThreatGauge score={result.spam_score} severity={result.severity} isSpam={result.is_spam} />

                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  {[
                    { label: 'Naive Bayes', val: result.models.naive_bayes },
                    { label: 'SVM',         val: result.models.svm },
                    { label: 'Transformer', val: result.models.transformer },
                  ].map(m => (
                    <div key={m.label} className="model-card">
                      <div className="model-name">{m.label}</div>
                      <div className="model-score" style={{
                        color: m.val > 50 ? 'var(--danger)' : 'var(--success)'
                      }}>
                        {m.val}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Explainability */}
            {(result.explainability.length > 0 || result.heuristic_flags.length > 0 || result.phishing_indicators.length > 0) && (
              <motion.div
                className="card"
                style={{ marginTop: '1rem' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="card-title">
                  <div className="card-icon icon-amber"><Zap size={16} /></div>
                  <h2>Threat Explainability</h2>
                </div>
                <ExplainabilityPanel
                  words={result.explainability}
                  heuristicFlags={result.heuristic_flags}
                  phishingIndicators={result.phishing_indicators}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThreatPanel;
