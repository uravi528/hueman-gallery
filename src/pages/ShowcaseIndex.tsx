import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, photoUrl } from '../lib/supabase';
import type { Gallery } from '../lib/types';

export default function ShowcaseIndex() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('galleries')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      setGalleries((data as Gallery[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="app showcase">
      <header>
        <div className="bar" style={{ justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="brand serif">hueman<span className="dot">.</span></div>
            <div className="brand-sub">the art of color · new york</div>
          </div>
        </div>
      </header>

      <section className="hero fade">
        <div className="eyebrow">Selected work</div>
        <h1 className="serif">A glimpse of our stories</h1>
        <div className="divider" />
      </section>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : galleries.length === 0 ? (
        <div className="empty">No public galleries yet.</div>
      ) : (
        <main className="sc-index">
          {galleries.map((g) => (
            <Link key={g.id} className="sc-card" to={`/p/${g.public_slug}`}>
              {g.cover_path && <img src={photoUrl(g.cover_path)} alt="" />}
              <div className="sc-card-veil" />
              <div className="sc-card-text">
                <h3 className="serif">{g.intro_heading || g.title}</h3>
                {g.location && <span>{g.location}</span>}
              </div>
            </Link>
          ))}
        </main>
      )}

      <footer className="sc-foot">
        <p className="sc-foot-sub">The art of color · the depth of human story · New York</p>
      </footer>
    </div>
  );
}
