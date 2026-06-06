import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, photoUrl, brandUrl } from '../lib/supabase';
import type { Gallery, Photo } from '../lib/types';

export default function Showcase() {
  const { publicSlug } = useParams();
  const [g, setG] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [missing, setMissing] = useState(false);
  const [lb, setLb] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: gal } = await supabase
        .from('galleries')
        .select('*')
        .eq('public_slug', publicSlug)
        .eq('is_public', true)
        .single();
      if (!gal) { setMissing(true); return; }
      setG(gal as Gallery);
      const { data: ph } = await supabase
        .from('photos')
        .select('*')
        .eq('gallery_id', (gal as Gallery).id)
        .eq('is_preview', true)
        .order('sort_order', { ascending: true });
      setPhotos((ph as Photo[]) ?? []);
    })();
  }, [publicSlug]);

  const step = useCallback((n: number) => {
    setLb((i) => (i === null ? i : (i + n + photos.length) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lb === null) return;
      if (e.key === 'Escape') setLb(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lb, step]);

  if (missing) return <div className="boot">This showcase isn’t available.</div>;
  if (!g) return <div className="boot">Loading…</div>;

  const cover = g.cover_path || photos[0]?.thumb_path;
  const wmOn = g.watermark_enabled && !!g.watermark_url;

  return (
    <div className="app showcase" data-theme={g.default_theme === 'dark' ? 'dark' : undefined}>
      {/* HERO */}
      <section className="sc-hero">
        {cover && <img className="sc-cover" src={photoUrl(cover)} alt="" />}
        <div className="sc-veil" />
        <div className="sc-hero-inner fade">
          {g.logo_url
            ? <img className="sc-logo" src={brandUrl(g.logo_url)} alt="" />
            : <div className="sc-brand serif">hueman<span className="dot">.</span></div>}
          {g.intro_text && <div className="sc-eyebrow">{g.intro_text}</div>}
          <h1 className="sc-title serif">{g.intro_heading || g.title}</h1>
          <div className="sc-scroll">
            <span>a glimpse</span>
            <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" /></svg>
          </div>
        </div>
      </section>

      {/* PREVIEW GRID */}
      <main className="sc-grid">
        {photos.map((p, i) => (
          <figure key={p.id} className="sc-shot" onClick={() => setLb(i)}>
            <img src={photoUrl(p.thumb_path)} loading="lazy" alt="" />
            {wmOn && <img className="wm" src={brandUrl(g.watermark_url!)} alt="" />}
          </figure>
        ))}
        {photos.length === 0 && <div className="empty">Sneak peek coming soon.</div>}
      </main>

      {/* FOOTER CTA */}
      <footer className="sc-foot">
        <div className="serif sc-foot-mark">hueman<span className="dot">.</span></div>
        <p>This is just a glimpse. The full story lives in the private gallery.</p>
        <p className="sc-foot-sub">The art of color · the depth of human story · New York</p>
        <Link className="sc-foot-link" to="/showcase">See more of our work →</Link>
      </footer>

      {/* VIEW-ONLY LIGHTBOX */}
      {lb !== null && (
        <div
          className="lb"
          onClick={(e) => { if (e.target === e.currentTarget) setLb(null); }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (dx < -45) step(1);
            else if (dx > 45) step(-1);
            touchX.current = null;
          }}
        >
          <button className="close" onClick={() => setLb(null)}><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
          <button className="nav prev" onClick={() => step(-1)}><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg></button>
          <img src={photoUrl(photos[lb].thumb_path)} alt="" />
          <button className="nav next" onClick={() => step(1)}><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg></button>
        </div>
      )}
    </div>
  );
}
