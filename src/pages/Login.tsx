import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!email.trim()) return;
    setSending(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    setMsg(error ? error.message : 'Check your inbox — we sent you a sign-in link.');
  }

  return (
    <div className="app">
      <div className="auth-wrap">
        <div className="auth-card fade">
          <div className="brand serif">
            hueman<span className="dot">.</span>
          </div>
          <p>
            Photographer sign-in.
            <br />
            Enter your email and we’ll send a magic link — no password to remember.
          </p>
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn solid" onClick={send} disabled={sending}>
            {sending ? 'Sending…' : 'Send sign-in link'}
          </button>
          {msg && <div className="auth-msg">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
