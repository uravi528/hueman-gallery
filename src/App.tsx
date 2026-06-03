import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GalleryEditor from './pages/GalleryEditor';
import ClientGallery from './pages/ClientGallery';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="boot">Loading…</div>;

  return (
    <Routes>
      {/* Public client gallery — opened via the private share link */}
      <Route path="/g/:slug" element={<ClientGallery />} />

      {/* Owner area */}
      <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} />
      <Route
        path="/manage/:id"
        element={session ? <GalleryEditor /> : <Navigate to="/login" />}
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
