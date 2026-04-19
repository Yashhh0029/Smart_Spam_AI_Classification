import React from 'react';
import { AlertTriangle, AlertOctagon, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WordContrib {
  word: string;
  spam_score: number;
}

interface ExplainabilityPanelProps {
  words: WordContrib[];
  heuristicFlags: string[];
  phishingIndicators: string[];
}

const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({
  words,
  heuristicFlags,
  phishingIndicators,
}) => {
  const top = words.slice(0, 16);
  const allFlags = [...phishingIndicators, ...heuristicFlags];

  const getChipClass = (score: number) => {
    if (score > 0.65) return 'word-chip word-chip-danger';
    if (score > 0.4)  return 'word-chip word-chip-warning';
    return 'word-chip word-chip-neutral';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Word contributions */}
      {top.length > 0 && (
        <div>
          <div className="section-label">
            <AlertTriangle size={12} /> Trigger Word Analysis
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <AnimatePresence>
              {top.map((item, i) => (
                <motion.div
                  key={item.word}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03, type: 'spring', stiffness: 300 }}
                  className={getChipClass(item.spam_score)}
                >
                  <span>{item.word}</span>
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', opacity: 0.85 }}>
                    {(item.spam_score * 100).toFixed(0)}%
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Flags */}
      {allFlags.length > 0 && (
        <div>
          <div className="section-label">
            <AlertOctagon size={12} /> Heuristic & Phishing Flags
          </div>
          {phishingIndicators.map((flag, i) => (
            <div key={`phi-${i}`} className="flag-pill flag-danger">
              <AlertOctagon size={14} style={{ flexShrink: 0 }} />
              <span>{flag}</span>
            </div>
          ))}
          {heuristicFlags.map((flag, i) => (
            <div key={`heur-${i}`} className="flag-pill flag-warning">
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>{flag}</span>
            </div>
          ))}
        </div>
      )}

      {allFlags.length === 0 && top.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '1rem', color: 'var(--text-faint)' }}>
          <ShieldCheck size={28} color="var(--success)" />
          <span style={{ fontSize: '0.85rem' }}>No suspicious signals detected.</span>
        </div>
      )}
    </div>
  );
};

export default ExplainabilityPanel;
