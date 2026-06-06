import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function signInPassword() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) setMsg(error.message);
    // On success the auth listener in App.tsx swaps the screen automatically.
  }

  async function sendLink() {
    if (!email.trim()) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    setMsg(error ? error.message : 'Check your inbox — we sent you a sign-in link.');
  }

  return (
    <div className="app">
      <div className="auth-wrap">
        <div className="auth-card fade">
          <div className="brand serif">
            hueman<span className="dot">.</span>
          </div>

          {mode === 'password' ? (
            <>
              <p>Photographer sign-in.</p>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && signInPassword()}
              />
              <button className="btn solid" onClick={signInPassword} disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <button className="auth-switch" onClick={() => { setMode('link'); setMsg(''); }}>
                Email me a sign-in link instead
              </button>
            </>
          ) : (
            <>
              <p>
                We&rsquo;ll email you a one-time sign-in link.
                <br />
                Use this the first time, or if you forget your password.
              </p>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendLink()}
              />
              <button className="btn solid" onClick={sendLink} disabled={busy}>
                {busy ? 'Sending…' : 'Send sign-in link'}
              </button>
              <button className="auth-switch" onClick={() => { setMode('password'); setMsg(''); }}>
                Sign in with a password
              </button>
            </>
          )}

          {msg && <div className="auth-msg">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
