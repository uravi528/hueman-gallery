import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, photoUrl, brandUrl } from '../lib/supabase';
import { processImage } from '../lib/image';
import type { Gallery, Photo } from '../lib/types';

export default function GalleryEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [g, setG] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const wmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const { data: gal } = await supabase.from('galleries').select('*').eq('id', id).single();
    setG(gal as Gallery);
    const { data: ph } = await supabase
      .from('photos')
      .select('*')
      .eq('gallery_id', id)
      .order('sort_order', { ascending: true });
    setPhotos((ph as Photo[]) ?? []);
  }

  async function patch(fields: Partial<Gallery>) {
    if (!g) return;
    setG({ ...g, ...fields });
    await supabase.from('galleries').update(fields).eq('id', g.id);
  }

  // ---- photo upload ----
  async function uploadPhotos(files: FileList | File[]) {
    if (!g) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    let done = 0;
    for (const file of list) {
      setProgress(`Uploading ${done + 1} of ${list.length}…`);
      try {
        const { thumbBlob, width, height } = await processImage(file);
        const key = crypto.randomUUID();
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const fullPath = `${g.id}/${key}.${ext}`;
        const thumbPath = `${g.id}/thumb-${key}.jpg`;

        await supabase.storage.from('photos').upload(fullPath, file, { upsert: false });
        await supabase.storage.from('photos').upload(thumbPath, thumbBlob, { upsert: false });
        await supabase.from('photos').insert({
          gallery_id: g.id,
          storage_path: fullPath,
          thumb_path: thumbPath,
          width,
          height,
          sort_order: photos.length + done,
        });
      } catch (e) {
        console.error(e);
      }
      done++;
    }
    setProgress('');
    load();
  }

  async function removePhoto(p: Photo) {
    if (!window.confirm('Remove this photo?')) return;
    await supabase.storage.from('photos').remove([p.storage_path, p.thumb_path]);
    await supabase.from('photos').delete().eq('id', p.id);
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
  }

  // ---- brand assets ----
  async function uploadBrand(file: File, kind: 'logo' | 'watermark') {
    if (!g) return;
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${g.id}/${kind}-${Date.now()}.${ext}`;
    await supabase.storage.from('brand').upload(path, file, { upsert: true });
    patch(kind === 'logo' ? { logo_url: path } : { watermark_url: path });
  }

  function shareLink() {
    return `${window.location.origin}/g/${g?.slug}`;
  }

  if (!g) return <div className="boot">Loading…</div>;

  return (
    <div className="app">
      <header>
        <div className="bar">
          <div className="brand serif">
            hueman<span className="dot">.</span>
          </div>
          <button className="btn" onClick={() => window.open(shareLink(), '_blank')}>
            Preview as client ↗
          </button>
        </div>
      </header>

      <div className="page fade">
        <button className="back-link" onClick={() => nav('/')}>
          <svg viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          All galleries
        </button>

        <div className="editor-grid">
          {/* ---- left: settings ---- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="panel">
              <h2 className="serif">Details</h2>
              <div className="field">
                <label>Gallery name</label>
                <input value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} onBlur={(e) => patch({ title: e.target.value })} />
              </div>
              <div className="field">
                <label>Client</label>
                <input value={g.client_name ?? ''} onChange={(e) => setG({ ...g, client_name: e.target.value })} onBlur={(e) => patch({ client_name: e.target.value })} />
              </div>
              <div className="field">
                <label>Location</label>
                <input value={g.location ?? ''} onChange={(e) => setG({ ...g, location: e.target.value })} onBlur={(e) => patch({ location: e.target.value })} />
              </div>
              <div className="field">
                <label>Date</label>
                <input type="date" value={g.shoot_date ?? ''} onChange={(e) => patch({ shoot_date: e.target.value })} />
              </div>
            </div>

            <div className="panel">
              <h2 className="serif">Branding</h2>
              <div className="field">
                <label>Title logo (shown in header)</label>
                <button className="btn" onClick={() => logoRef.current?.click()}>Upload logo</button>
                <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadBrand(e.target.files[0], 'logo')} />
                {g.logo_url && (
                  <div className="brand-preview">
                    <img src={brandUrl(g.logo_url)} alt="logo" />
                    <button className="link-btn btn" onClick={() => patch({ logo_url: null })}>Remove</button>
                  </div>
                )}
              </div>
              <div className="field">
                <label>Watermark PNG (your Canva mark)</label>
                <button className="btn" onClick={() => wmRef.current?.click()}>Upload watermark</button>
                <input ref={wmRef} type="file" accept="image/png,image/*" hidden onChange={(e) => e.target.files?.[0] && uploadBrand(e.target.files[0], 'watermark')} />
                {g.watermark_url && (
                  <div className="brand-preview">
                    <img src={brandUrl(g.watermark_url)} alt="watermark" />
                    <button className="link-btn btn" onClick={() => patch({ watermark_url: null })}>Remove</button>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <h2 className="serif">Sharing & access</h2>
              <div className="toggle-row" style={{ borderTop: 'none' }}>
                <div>
                  <div className="lbl">Allow downloads</div>
                  <div className="desc">Off = public can view but not save. Full-res downloads when on.</div>
                </div>
                <div className={`sw ${g.allow_downloads ? 'on' : ''}`} onClick={() => patch({ allow_downloads: !g.allow_downloads })} />
              </div>
              <div className="toggle-row">
                <div>
                  <div className="lbl">Show watermark</div>
                  <div className="desc">Overlays your uploaded mark on previews. Off by default.</div>
                </div>
                <div className={`sw ${g.watermark_enabled ? 'on' : ''}`} onClick={() => patch({ watermark_enabled: !g.watermark_enabled })} />
              </div>
              <div className="field" style={{ marginTop: 14 }}>
                <label>Default look</label>
                <select value={g.default_theme} onChange={(e) => patch({ default_theme: e.target.value as Gallery['default_theme'] })}>
                  <option value="light">Light cinematic</option>
                  <option value="dark">Dark cinematic</option>
                </select>
              </div>
              <div className="field">
                <label>Default photo size</label>
                <select value={g.default_size} onChange={(e) => patch({ default_size: e.target.value as Gallery['default_size'] })}>
                  <option value="small">Small (denser)</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>
              <div className="field">
                <label>Access code (optional)</label>
                <input placeholder="Leave blank for none" value={g.access_code ?? ''} onChange={(e) => setG({ ...g, access_code: e.target.value })} onBlur={(e) => patch({ access_code: e.target.value || null })} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Private share link</label>
                <div className="share-box">
                  <input value={shareLink()} readOnly />
                  <button className="btn solid link-btn" onClick={() => navigator.clipboard?.writeText(shareLink())}>Copy</button>
                </div>
              </div>
            </div>
          </div>

          {/* ---- right: photos ---- */}
          <div className="panel">
            <h2 className="serif">Photos ({photos.length})</h2>
            <div
              className={`uploader ${drag ? 'drag' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); uploadPhotos(e.dataTransfer.files); }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
              <div className="big">Drop photos here or click to upload</div>
              <div className="small">Full resolution is preserved — thumbnails are made automatically</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadPhotos(e.target.files)} />
            {progress && <div className="progress">{progress}</div>}

            {photos.length > 0 && (
              <div className="thumb-grid">
                {photos.map((p) => (
                  <div key={p.id} className="thumb">
                    <img src={photoUrl(p.thumb_path)} alt="" />
                    <button className="rm" onClick={() => removePhoto(p)}>
                      <svg viewBox="0 0 24 24">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
