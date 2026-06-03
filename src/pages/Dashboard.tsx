import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { makeSlug } from '../lib/image';
import type { Gallery } from '../lib/types';

export default function Dashboard({ session }: { session: Session }) {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('galleries')
      .select('*')
      .order('created_at', { ascending: false });
    setGalleries((data as Gallery[]) ?? []);
    setLoading(false);
  }

  async function createGallery() {
    const title = window.prompt('Gallery name (e.g. "Aanya & Dev — The Wedding")');
    if (!title) return;
    const { data, error } = await supabase
      .from('galleries')
      .insert({ owner_id: session.user.id, title, slug: makeSlug(title) })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    nav(`/manage/${(data as Gallery).id}`);
  }

  return (
    <div className="app">
      <header>
        <div className="bar">
          <div>
            <div className="brand serif">
              hueman<span className="dot">.</span>
            </div>
            <div className="brand-sub">photographer studio</div>
          </div>
          <button className="btn" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </header>

      <div className="page fade">
        <div className="page-head">
          <div>
            <h1 className="serif">Your galleries</h1>
            <div className="sub">{session.user.email}</div>
          </div>
          <button className="btn solid" onClick={createGallery}>
            + New gallery
          </button>
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : (
          <div className="grid-cards">
            {galleries.map((g) => (
              <div key={g.id} className="gcard" onClick={() => nav(`/manage/${g.id}`)}>
                <h3 className="serif">{g.title}</h3>
                <div className="gmeta">
                  {g.client_name && <>{g.client_name}<br /></>}
                  {[g.location, g.shoot_date].filter(Boolean).join(' · ') || 'No details yet'}
                </div>
                <div className="tags">
                  {g.allow_downloads ? (
                    <span className="tag live">Downloads on</span>
                  ) : (
                    <span className="tag">View-only</span>
                  )}
                  {g.access_code && <span className="tag">Code-locked</span>}
                  <span className="tag">{g.default_theme}</span>
                </div>
              </div>
            ))}
            <div className="gcard add" onClick={createGallery}>
              <svg viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New gallery
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
