import React, { useEffect, useState } from 'react';
import { BarChart2, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusion_matrix?: number[][];
}

interface MetricsData {
  [model: string]: ModelMetrics;
}

const MODEL_COLORS: Record<string, string> = {
  naive_bayes:  '#7c3aed',
  svm:          '#0ea5e9',
  transformer:  '#f59e0b',
};

const MODEL_LABELS: Record<string, string> = {
  naive_bayes:  'Naive Bayes',
  svm:          'SVM',
  transformer:  'Transformer',
};

const MetricBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="metric-bar-wrap" style={{ marginBottom: 8 }}>
    <span style={{ minWidth: 80, fontSize: '0.78rem', color: 'var(--text-sub)' }}>{label}</span>
    <div className="metric-bar-bg">
      <div className="metric-bar-fill" style={{ width: `${(value * 100).toFixed(1)}%`, background: color }} />
    </div>
    <span className="metric-bar-label">{(value * 100).toFixed(1)}%</span>
  </div>
);

const ConfusionMatrix: React.FC<{ matrix: number[][] }> = ({ matrix }) => {
  const labels = ['True Neg', 'False Pos', 'False Neg', 'True Pos'];
  const flat = matrix.flat();
  const max = Math.max(...flat);
  const colors = [
    { bg: 'rgba(16,185,129,0.25)', color: '#10b981' },
    { bg: 'rgba(244,63,94,0.20)',  color: '#f43f5e' },
    { bg: 'rgba(245,158,11,0.20)', color: '#f59e0b' },
    { bg: 'rgba(16,185,129,0.25)', color: '#10b981' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxWidth: 240, margin: '0 auto' }}>
      {flat.map((val, i) => (
        <div key={i} style={{
          background: colors[i].bg, borderRadius: 8, padding: '12px 8px', textAlign: 'center',
          border: `1px solid ${colors[i].color}44`,
        }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, fontFamily: "'Outfit',sans-serif", color: colors[i].color }}>
            {val}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
            {labels[i]}
          </div>
        </div>
      ))}
    </div>
  );
};

const MetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/metrics`)
      .then(res => setMetrics(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (!metrics || metrics.status) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-faint)' }}>
        <BarChart2 size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
        <p>No metrics available. Train models first by running <code>setup_data.py</code>.</p>
      </div>
    );
  }

  const modelKeys = Object.keys(metrics).filter(k => k !== 'status');

  // Multi-bar chart data
  const barData = ['accuracy', 'precision', 'recall', 'f1'].map(metric => ({
    name: metric.charAt(0).toUpperCase() + metric.slice(1),
    ...Object.fromEntries(modelKeys.map(k => [MODEL_LABELS[k] || k, +((metrics[k] as any)[metric] * 100).toFixed(2)])),
  }));

  // Radar data per model
  const radarData = ['accuracy', 'precision', 'recall', 'f1'].map(m => ({
    metric: m.charAt(0).toUpperCase() + m.slice(1),
    ...Object.fromEntries(modelKeys.map(k => [MODEL_LABELS[k] || k, +((metrics[k] as any)[m] * 100).toFixed(2)])),
  }));

  const tooltipStyle = {
    backgroundColor: 'var(--bg-mid)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    color: 'var(--text-main)',
    fontSize: '0.82rem',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Model comparison bar chart */}
      <div className="card">
        <div className="card-title">
          <div className="card-icon icon-blue"><BarChart2 size={16} /></div>
          <h2>Model Comparison</h2>
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={barData} barGap={4}>
              <XAxis dataKey="name" stroke="var(--text-sub)" fontSize={11} />
              <YAxis stroke="var(--text-sub)" fontSize={11} domain={[80, 100]} unit="%" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-sub)' }} />
              {modelKeys.map(k => (
                <Bar key={k} dataKey={MODEL_LABELS[k] || k} fill={MODEL_COLORS[k] || '#6d28d9'} radius={[4,4,0,0]} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-model metric bars + confusion matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {modelKeys.map(key => {
          const m = metrics[key];
          const color = MODEL_COLORS[key] || '#6d28d9';
          return (
            <div key={key} className="card">
              <div className="card-title">
                <div className="card-icon" style={{ background: `${color}22`, color }}>
                  <TrendingUp size={14} />
                </div>
                <h2 style={{ fontSize: '0.95rem' }}>{MODEL_LABELS[key] || key}</h2>
              </div>

              <MetricBar label="Accuracy"  value={m.accuracy}  color={color} />
              <MetricBar label="Precision" value={m.precision} color={color} />
              <MetricBar label="Recall"    value={m.recall}    color={color} />
              <MetricBar label="F1 Score"  value={m.f1}        color={color} />

              {m.confusion_matrix && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="section-label">Confusion Matrix</div>
                  <ConfusionMatrix matrix={m.confusion_matrix} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Radar chart */}
      <div className="card">
        <div className="card-title">
          <div className="card-icon icon-purple"><BarChart2 size={16} /></div>
          <h2>Metric Radar</h2>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-sub)', fontSize: 11 }} />
              {modelKeys.map(k => (
                <Radar key={k} name={MODEL_LABELS[k] || k} dataKey={MODEL_LABELS[k] || k}
                  stroke={MODEL_COLORS[k] || '#6d28d9'} fill={MODEL_COLORS[k] || '#6d28d9'} fillOpacity={0.12} />
              ))}
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-sub)' }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
