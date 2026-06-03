import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, photoUrl, brandUrl } from '../lib/supabase';
import { downloadFile } from '../lib/image';
import type { Gallery, Photo, Theme, GridSize } from '../lib/types';

export default function ClientGallery() {
  const { slug } = useParams();
  const [g, setG] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [theme, setTheme] = useState<Theme>('light');
  const [size, setSize] = useState<GridSize>('medium');
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [codeErr, setCodeErr] = useState('');

  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [lbIndex, setLbIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: gal } = await supabase.from('galleries').select('*').eq('slug', slug).single();
      if (!gal) { setNotFound(true); return; }
      const gallery = gal as Gallery;
      setG(gallery);
      setTheme(gallery.default_theme);
      setSize(gallery.default_size);
      setUnlocked(!gallery.access_code);
      const { data: ph } = await supabase
        .from('photos').select('*').eq('gallery_id', gallery.id).order('sort_order', { ascending: true });
      setPhotos((ph as Photo[]) ?? []);
    })();
  }, [slug]);

  const step = useCallback((n: number) => {
    setLbIndex((i) => (i === null ? i : (i + n + photos.length) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lbIndex === null) return;
      if (e.key === 'Escape') setLbIndex(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lbIndex, step]);

  if (notFound) return <div className="boot">This gallery link is invalid or has been removed.</div>;
  if (!g) return <div className="boot">Loading…</div>;

  const allow = g.allow_downloads;
  const wmOn = g.watermark_enabled && !!g.watermark_url;

  function togglePick(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function onShot(i: number, p: Photo) {
    if (selectMode) togglePick(p.id);
    else setLbIndex(i);
  }
  function downloadOne(p: Photo, i: number) {
    if (!allow) return;
    downloadFile(photoUrl(p.storage_path), `${g!.slug}-${i + 1}.jpg`);
  }
  async function downloadMany() {
    if (!allow) return;
    const list = selectMode && picked.size ? photos.filter((p) => picked.has(p.id)) : photos;
    for (let i = 0; i < list.length; i++) {
      await downloadFile(photoUrl(list[i].storage_path), `${g!.slug}-${i + 1}.jpg`);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // ----- access gate -----
  if (!unlocked) {
    return (
      <div className="app" data-theme={theme === 'dark' ? 'dark' : undefined}>
        <div className="gate">
          <div className="card fade">
            <div className="lock">
              <svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
            </div>
            {g.logo_url
              ? <img className="brand-logo" style={{ height: 44, margin: '0 auto' }} src={brandUrl(g.logo_url)} alt={g.title} />
              : <div className="brand serif" style={{ fontSize: 32 }}>hueman<span className="dot">.</span></div>}
            <p>This gallery is private.<br />Enter the access code your photographer shared.</p>
            <input
              value={code}
              maxLength={20}
              placeholder="••••••"
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (code.trim().toLowerCase() === (g.access_code ?? '').toLowerCase()) setUnlocked(true);
                  else setCodeErr("That code doesn't match. Try again.");
                }
              }}
            />
            <div className="err">{codeErr}</div>
            <button className="btn solid" onClick={() => {
              if (code.trim().toLowerCase() === (g.access_code ?? '').toLowerCase()) setUnlocked(true);
              else setCodeErr("That code doesn't match. Try again.");
            }}>Enter gallery</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${selectMode ? 'select-mode' : ''} ${allow ? '' : 'no-download'}`} data-theme={theme === 'dark' ? 'dark' : undefined}>
      <header>
        <div className="bar">
          {g.logo_url
            ? <img className="brand-logo" src={brandUrl(g.logo_url)} alt={g.title} />
            : <div><div className="brand serif">hueman<span className="dot">.</span></div><div className="brand-sub">the art of color · new york</div></div>}
          <div className="top-actions">
            <button className="icon-btn" title="Switch light / dark" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark'
                ? <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>}
            </button>
          </div>
        </div>
      </header>

      <section className="hero fade">
        <div className="eyebrow">Private client gallery</div>
        <h1 className="serif">{g.title}</h1>
        <div className="meta">
          {g.client_name && <>For <b>{g.client_name}</b> &nbsp;·&nbsp; </>}
          {g.location && <>{g.location} &nbsp;·&nbsp; </>}
          <b>{photos.length}</b> images
        </div>
        <div className="divider" />
      </section>

      <div className="actions">
        <div className="count">
          <b>{photos.length}</b> photographs
          {selectMode && <> &nbsp;·&nbsp; {picked.size} selected</>}
        </div>
        <div className="btn-row">
          <div className="size-ctrl" role="group" aria-label="photo size">
            <button className={size === 'small' ? 'active' : ''} title="Small" onClick={() => setSize('small')}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </button>
            <button className={size === 'medium' ? 'active' : ''} title="Medium" onClick={() => setSize('medium')}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" /><rect x="13" y="3" width="8" height="8" /><rect x="3" y="13" width="8" height="8" /><rect x="13" y="13" width="8" height="8" /></svg>
            </button>
            <button className={size === 'large' ? 'active' : ''} title="Large" onClick={() => setSize('large')}>
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="8" /><rect x="3" y="13" width="18" height="8" /></svg>
            </button>
          </div>

          {allow ? (
            <>
              <button className="btn" onClick={() => { setSelectMode(!selectMode); setPicked(new Set()); }}>
                <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                {selectMode ? 'Cancel' : 'Select photos'}
              </button>
              <button className="btn solid" onClick={downloadMany}>
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                {selectMode ? 'Download selected' : 'Download all'}
              </button>
            </>
          ) : (
            <span className="viewing-note">
              <svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
              Viewing only
            </span>
          )}
        </div>
      </div>

      <main className={`gallery ${size}`}>
        {photos.map((p, i) => (
          <div key={p.id} className={`shot ${picked.has(p.id) ? 'picked' : ''}`} onClick={() => onShot(i, p)}>
            <img src={photoUrl(p.thumb_path)} loading="lazy" alt="" />
            {wmOn && <img className="wm" src={brandUrl(g.watermark_url!)} alt="" />}
            <span className="pick"><svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg></span>
            {allow && (
              <span className="dl" title="Download" onClick={(e) => { e.stopPropagation(); downloadOne(p, i); }}>
                <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
              </span>
            )}
          </div>
        ))}
        {photos.length === 0 && <div className="empty">No photos in this gallery yet.</div>}
      </main>

      {lbIndex !== null && (
        <div className="lb" onClick={(e) => { if (e.target === e.currentTarget) setLbIndex(null); }}>
          <button className="close" onClick={() => setLbIndex(null)}><svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
          <button className="nav prev" onClick={() => step(-1)}><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg></button>
          <img src={photoUrl(photos[lbIndex].storage_path)} alt="" />
          <button className="nav next" onClick={() => step(1)}><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg></button>
          {allow && (
            <button className="lb-dl" onClick={() => downloadOne(photos[lbIndex], lbIndex)}>
              <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
              Download full resolution
            </button>
          )}
        </div>
      )}
    </div>
  );
}
