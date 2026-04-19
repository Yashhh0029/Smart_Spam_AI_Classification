import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Mail, Lock, User, Eye, EyeOff, ArrowLeft,
  ChevronRight, Plus, UserCheck, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/auth` : 'http://localhost:8000/api/auth';

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface AuthUser {
  id: number;
  email: string;
  display_name: string;
  avatar_color: string;
  created_at: string;
  last_login?: string;
}

interface Props {
  onAuthenticated: (user: AuthUser, token: string) => void;
}

type Screen = 'picker' | 'login' | 'register';

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function timeAgo(iso?: string): string {
  if (!iso) return 'Never signed in';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Animated background orbs ──────────────────────────────────────────────── */
const BG = () => (
  <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
    <div style={{
      position: 'absolute', width: 600, height: 600,
      borderRadius: '50%', top: '-15%', left: '-10%',
      background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)',
      animation: 'orb1 12s ease-in-out infinite alternate',
    }} />
    <div style={{
      position: 'absolute', width: 500, height: 500,
      borderRadius: '50%', bottom: '-10%', right: '-10%',
      background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 65%)',
      animation: 'orb2 15s ease-in-out infinite alternate',
    }} />
    <div style={{
      position: 'absolute', width: 350, height: 350,
      borderRadius: '50%', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
      background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 65%)',
      animation: 'orb3 10s ease-in-out infinite alternate',
    }} />
    <style>{`
      @keyframes orb1 { from { transform: translate(0,0) scale(1); } to { transform: translate(80px,60px) scale(1.15); } }
      @keyframes orb2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-70px,-50px) scale(1.1); } }
      @keyframes orb3 { from { opacity: 0.5; } to { opacity: 1; } }
    `}</style>
  </div>
);

/* ── Avatar chip ───────────────────────────────────────────────────────────── */
const Avatar = ({ name, color, size = 44 }: { name: string; color: string; size?: number }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Outfit, sans-serif', fontWeight: 700,
    fontSize: size * 0.38, color: '#fff', flexShrink: 0,
    boxShadow: `0 0 0 2px rgba(255,255,255,0.08), 0 4px 12px ${color}55`,
  }}>
    {initials(name)}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════ */
const AuthPage: React.FC<Props> = ({ onAuthenticated }) => {
  const [screen,       setScreen]    = useState<Screen>('picker');
  const [accounts,     setAccounts]  = useState<AuthUser[]>([]);
  const [pickedEmail,  setPickedEmail] = useState('');

  // form state
  const [email,        setEmail]     = useState('');
  const [password,     setPassword]  = useState('');
  const [name,         setName]      = useState('');
  const [showPwd,      setShowPwd]   = useState(false);
  const [loading,      setLoading]   = useState(false);
  const [error,        setError]     = useState('');
  const [success,      setSuccess]   = useState('');

  /* Load existing accounts for account picker */
  useEffect(() => {
    axios.get(`${API}/users`).then(r => setAccounts(r.data)).catch(() => {});
  }, []);

  /* Pre-fill email when coming from picker */
  useEffect(() => {
    if (pickedEmail) setEmail(pickedEmail);
  }, [pickedEmail]);

  const clearForm = () => { setEmail(''); setPassword(''); setName(''); setError(''); setSuccess(''); };

  const goto = (s: Screen, prefillEmail = '') => {
    clearForm();
    if (prefillEmail) setEmail(prefillEmail);
    setScreen(s);
  };

  /* ── Register ─────────────────────────────────────────────────────────── */
  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await axios.post(`${API}/register`, {
        email: email.trim(),
        password,
        display_name: name.trim(),
      });
      setSuccess('Account created! A welcome email has been sent 🎉');
      setTimeout(() => onAuthenticated(res.data.user, res.data.token), 1200);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, name, onAuthenticated]);

  /* ── Login ────────────────────────────────────────────────────────────── */
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await axios.post(`${API}/login`, { email: email.trim(), password });
      setSuccess('Signed in! A notification has been sent to your email ✓');
      setTimeout(() => onAuthenticated(res.data.user, res.data.token), 900);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Sign-in failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }, [email, password, onAuthenticated]);

  /* ── Quick-pick an existing account ──────────────────────────────────── */
  const handlePickAccount = (acc: AuthUser) => {
    setPickedEmail(acc.email);
    goto('login', acc.email);
  };

  /* ── Shared card shell ─────────────────────────────────────────────────── */
  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 440,
    background: 'rgba(12,11,24,0.82)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 24,
    boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,58,237,0.08)',
    overflow: 'hidden',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px',
    background: 'rgba(6,5,14,0.8)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: '#f1f5f9',
    fontFamily: 'Inter, sans-serif', fontSize: '0.95rem',
    outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: '#64748b', letterSpacing: '0.06em',
    textTransform: 'uppercase', marginBottom: 7,
  };

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', position: 'relative',
    }}>
      <BG />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, zIndex: 1 }}
      >
        <div style={{
          width: 46, height: 46, borderRadius: 14,
          background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(124,58,237,0.4)',
        }}>
          <Shield size={24} color="#fff" />
        </div>
        <div>
          <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.5px', color: '#f1f5f9' }}>
            Smart Spam AI
          </div>
          <div style={{ fontSize: '0.73rem', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            AI-Powered Email Guardian
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ─── ACCOUNT PICKER ───────────────────────────────────────────────── */}
        {screen === 'picker' && (
          <motion.div key="picker"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ ...cardStyle, zIndex: 1 }}
          >
            {/* Header */}
            <div style={{
              padding: '32px 36px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 6 }}>Sign in to</div>
              <h1 style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '1.5rem', fontWeight: 800,
                margin: 0, letterSpacing: '-0.5px', color: '#f1f5f9',
              }}>
                Choose an account
              </h1>
            </div>

            {/* Accounts list */}
            <div style={{ padding: '16px 12px' }}>
              {accounts.length > 0 ? (
                accounts.map((acc, i) => (
                  <motion.button
                    key={acc.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => handlePickAccount(acc)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '12px 16px', border: 'none', borderRadius: 14,
                      background: 'transparent', cursor: 'pointer',
                      transition: 'background 0.18s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Avatar name={acc.display_name} color={acc.avatar_color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9', marginBottom: 2 }}>
                        {acc.display_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acc.email}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>
                        Last active: {timeAgo(acc.last_login)}
                      </div>
                    </div>
                    <ChevronRight size={16} color="#475569" />
                  </motion.button>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: '0.87rem' }}>
                  No saved accounts yet.
                </div>
              )}

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 16px' }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: '0.72rem', color: '#475569' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Add / use another account */}
              <button
                onClick={() => goto('login')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', border: 'none', borderRadius: 14,
                  background: 'transparent', cursor: 'pointer', transition: 'background 0.18s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Plus size={18} color="#94a3b8" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#94a3b8' }}>
                    {accounts.length > 0 ? 'Use another account' : 'Sign in with email'}
                  </div>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 36px', background: 'rgba(6,5,14,0.5)',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', justifyContent: 'center', gap: 20,
            }}>
              <button onClick={() => goto('register')} style={{
                background: 'none', border: 'none', color: '#7c3aed',
                fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}>
                Create account
              </button>
              <span style={{ color: '#1e293b' }}>|</span>
              <button onClick={() => goto('login')} style={{
                background: 'none', border: 'none', color: '#0ea5e9',
                fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}>
                Sign in with email
              </button>
            </div>
          </motion.div>
        )}

        {/* ─── SIGN IN FORM ──────────────────────────────────────────────────── */}
        {screen === 'login' && (
          <motion.div key="login"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ ...cardStyle, zIndex: 1 }}
          >
            {/* Header */}
            <div style={{
              padding: '32px 36px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <button onClick={() => goto('picker')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', padding: 0,
                marginBottom: 20,
              }}>
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UserCheck size={22} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9' }}>
                    Sign in
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Continue to Smart Spam AI
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ padding: '28px 36px 32px' }}>
              {/* Status messages */}
              <AnimatePresence>
                {error && (
                  <motion.div key="err"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px', marginBottom: 20, borderRadius: 10,
                      background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                      fontSize: '0.85rem', color: '#f43f5e',
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div key="ok"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px', marginBottom: 20, borderRadius: 10,
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                      fontSize: '0.85rem', color: '#10b981',
                    }}
                  >
                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="login-email"
                    type="email" required autoFocus
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ ...inputStyle, paddingLeft: 42 }}
                    onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 26 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingLeft: 42, paddingRight: 44 }}
                    onFocus={e => { e.target.style.borderColor = '#7c3aed'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
                  }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#0ea5e9)',
                  border: 'none', borderRadius: 12, color: '#fff',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(124,58,237,0.4)',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(124,58,237,0.5)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)'; }}
              >
                {loading ? <><Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite' }} /> Signing in…</> : 'Sign in'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 22, fontSize: '0.85rem', color: '#64748b' }}>
                Don't have an account?{' '}
                <button type="button" onClick={() => goto('register', email)} style={{
                  background: 'none', border: 'none', color: '#a855f7',
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                }}>
                  Create one
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ─── REGISTER FORM ─────────────────────────────────────────────────── */}
        {screen === 'register' && (
          <motion.div key="register"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            style={{ ...cardStyle, zIndex: 1 }}
          >
            {/* Header */}
            <div style={{
              padding: '32px 36px 24px',
              background: 'linear-gradient(180deg,rgba(124,58,237,0.12) 0%,transparent 100%)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <button onClick={() => goto('picker')} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#64748b', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', padding: 0, marginBottom: 20,
              }}>
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#a855f7,#ec4899)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(168,85,247,0.35)',
                }}>
                  <Shield size={22} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f1f5f9' }}>
                    Create account
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Join Smart Spam AI — it's free
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} style={{ padding: '28px 36px 32px' }}>
              <AnimatePresence>
                {error && (
                  <motion.div key="err"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px', marginBottom: 20, borderRadius: 10,
                      background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)',
                      fontSize: '0.85rem', color: '#f43f5e',
                    }}
                  >
                    <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div key="ok"
                    initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '11px 14px', marginBottom: 20, borderRadius: 10,
                      background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                      fontSize: '0.85rem', color: '#10b981',
                    }}
                  >
                    <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> {success}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Display name */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Your name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="reg-name"
                    type="text" autoFocus
                    value={name} onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    style={{ ...inputStyle, paddingLeft: 42 }}
                    onFocus={e => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.15)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="reg-email"
                    type="email" required
                    value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ ...inputStyle, paddingLeft: 42 }}
                    onFocus={e => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.15)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#475569" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    id="reg-password"
                    type={showPwd ? 'text' : 'password'} required
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••  (min 6 chars)"
                    style={{ ...inputStyle, paddingLeft: 42, paddingRight: 44 }}
                    onFocus={e => { e.target.style.borderColor = '#a855f7'; e.target.style.boxShadow = '0 0 0 3px rgba(168,85,247,0.15)'; }}
                    onBlur={e  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
                  }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Strength indicator */}
              {password.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 99,
                      background: password.length > i * 3
                        ? (password.length < 6 ? '#f43f5e' : password.length < 10 ? '#f59e0b' : '#10b981')
                        : 'rgba(255,255,255,0.08)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
              )}

              {!password.length && <div style={{ marginBottom: 22 }} />}

              {/* Notify callout */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', marginBottom: 22, borderRadius: 10,
                background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.18)',
                fontSize: '0.8rem', color: '#64748b',
              }}>
                <Mail size={14} color="#0ea5e9" style={{ flexShrink: 0 }} />
                A welcome email will be sent to your inbox after registration.
              </div>

              {/* Submit */}
              <button
                id="register-submit"
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px',
                  background: loading ? 'rgba(168,85,247,0.4)' : 'linear-gradient(135deg,#a855f7,#ec4899)',
                  border: 'none', borderRadius: 12, color: '#fff',
                  fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(168,85,247,0.4)',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(168,85,247,0.5)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.4)'; }}
              >
                {loading ? <><Loader2 size={18} style={{ animation: 'spin 0.9s linear infinite' }} /> Creating account…</> : 'Create account'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 22, fontSize: '0.85rem', color: '#64748b' }}>
                Already have an account?{' '}
                <button type="button" onClick={() => goto('login', email)} style={{
                  background: 'none', border: 'none', color: '#7c3aed',
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                }}>
                  Sign in
                </button>
              </div>
            </form>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{
          marginTop: 28, fontSize: '0.72rem', color: '#334155',
          zIndex: 1, textAlign: 'center', maxWidth: 380,
        }}
      >
        By signing in you agree to receive security notifications at your registered email address.
        Your credentials are encrypted and never shared.
      </motion.p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthPage;
