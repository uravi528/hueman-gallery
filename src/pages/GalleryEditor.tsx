import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, photoUrl, brandUrl } from '../lib/supabase';
import { processImage, makeSlug } from '../lib/image';
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

  // ---- photo upload (appears live as each finishes) ----
  async function uploadPhotos(files: FileList | File[]) {
    if (!g) return;
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));

    // Files already in this gallery, keyed by "name|size".
    const existing = new Set(
      photos.filter((p) => p.original_name && p.file_size != null).map((p) => `${p.original_name}|${p.file_size}`)
    );

    // Skip ones already present + de-dupe within this same drop.
    const seen = new Set<string>();
    const list: File[] = [];
    let skipped = 0;
    for (const f of incoming) {
      const sig = `${f.name}|${f.size}`;
      if (existing.has(sig) || seen.has(sig)) {
        skipped++;
        continue;
      }
      seen.add(sig);
      list.push(f);
    }

    if (list.length === 0) {
      setProgress(skipped ? `Skipped ${skipped} duplicate${skipped > 1 ? 's' : ''} — already in this gallery.` : '');
      setTimeout(() => setProgress(''), 4000);
      return;
    }

    let base = photos.length;
    let done = 0;
    for (const file of list) {
      setProgress(`Uploading ${done + 1} of ${list.length}…${skipped ? `  ·  skipped ${skipped} duplicate${skipped > 1 ? 's' : ''}` : ''}`);
      try {
        const { thumbBlob, width, height } = await processImage(file);
        const key = crypto.randomUUID();
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const fullPath = `${g.id}/${key}.${ext}`;
        const thumbPath = `${g.id}/thumb-${key}.jpg`;

        await supabase.storage.from('photos').upload(fullPath, file, { upsert: false });
        await supabase.storage.from('photos').upload(thumbPath, thumbBlob, { upsert: false });
        const { data: row } = await supabase
          .from('photos')
          .insert({
            gallery_id: g.id,
            storage_path: fullPath,
            thumb_path: thumbPath,
            width,
            height,
            original_name: file.name,
            file_size: file.size,
            is_preview: false,
            sort_order: base + done,
          })
          .select()
          .single();
        // Show it on our side immediately, as soon as it lands.
        if (row) setPhotos((prev) => [...prev, row as Photo]);
      } catch (e) {
        console.error(e);
      }
      done++;
    }
    setProgress(
      skipped
        ? `Done — added ${list.length}, skipped ${skipped} duplicate${skipped > 1 ? 's' : ''}.`
        : `Done — added ${list.length}.`
    );
    setTimeout(() => setProgress(''), 4000);
  }

  async function removePhoto(p: Photo) {
    if (!window.confirm('Remove this photo?')) return;
    await supabase.storage.from('photos').remove([p.storage_path, p.thumb_path]);
    await supabase.from('photos').delete().eq('id', p.id);
    setPhotos((prev) => prev.filter((x) => x.id !== p.id));
    if (g?.cover_path === p.thumb_path) patch({ cover_path: null });
  }

  async function togglePreview(p: Photo) {
    const next = !p.is_preview;
    setPhotos((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_preview: next } : x)));
    await supabase.from('photos').update({ is_preview: next }).eq('id', p.id);
  }

  function setCover(p: Photo) {
    patch({ cover_path: p.thumb_path });
  }

  // ---- brand assets ----
  async function uploadBrand(file: File, kind: 'logo' | 'watermark') {
    if (!g) return;
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `${g.id}/${kind}-${Date.now()}.${ext}`;
    await supabase.storage.from('brand').upload(path, file, { upsert: true });
    patch(kind === 'logo' ? { logo_url: path } : { watermark_url: path });
  }

  // ---- public showcase ----
  async function togglePublic() {
    if (!g) return;
    if (!g.is_public) {
      const ps = g.public_slug || makeSlug(g.title);
      patch({ is_public: true, public_slug: ps });
    } else {
      patch({ is_public: false });
    }
  }

  const privateLink = () => `${window.location.origin}/g/${g?.slug}`;
  const publicLink = () => `${window.location.origin}/p/${g?.public_slug}`;
  const previewCount = photos.filter((p) => p.is_preview).length;

  if (!g) return <div className="boot">Loading…</div>;

  return (
    <div className="app">
      <header>
        <div className="bar">
          <div className="brand serif">
            hueman<span className="dot">.</span>
          </div>
          <button className="btn" onClick={() => window.open(privateLink(), '_blank')}>
            Preview as client ↗
          </button>
        </div>
      </header>

      <div className="page fade">
        <button className="back-link" onClick={() => nav('/')}>
          <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
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
                  <div className="desc">Off = clients can view but not save. Full-res downloads when on.</div>
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
                <label>Private client link (full gallery)</label>
                <div className="share-box">
                  <input value={privateLink()} readOnly />
                  <button className="btn solid link-btn" onClick={() => navigator.clipboard?.writeText(privateLink())}>Copy</button>
                </div>
              </div>
            </div>

            {/* ---- public sneak peek ---- */}
            <div className="panel">
              <h2 className="serif">Public sneak peek</h2>
              <div className="toggle-row" style={{ borderTop: 'none' }}>
                <div>
                  <div className="lbl">Show this publicly</div>
                  <div className="desc">A separate public page with only the photos you star below — view-only, no downloads. Safe to post anywhere.</div>
                </div>
                <div className={`sw ${g.is_public ? 'on' : ''}`} onClick={togglePublic} />
              </div>

              {g.is_public && (
                <>
                  <div className="field" style={{ marginTop: 14 }}>
                    <label>Hero heading</label>
                    <input placeholder="e.g. Hueman Grad — Class of 2026" value={g.intro_heading ?? ''} onChange={(e) => setG({ ...g, intro_heading: e.target.value })} onBlur={(e) => patch({ intro_heading: e.target.value || null })} />
                  </div>
                  <div className="field">
                    <label>Hero subtext (a line above / below)</label>
                    <input placeholder="e.g. A look behind the cap & gown" value={g.intro_text ?? ''} onChange={(e) => setG({ ...g, intro_text: e.target.value })} onBlur={(e) => patch({ intro_text: e.target.value || null })} />
                  </div>
                  <div className="field">
                    <label>Cover image</label>
                    <div className="desc-inline">{g.cover_path ? 'Set — use “Set cover” on a photo below to change.' : 'Hover a photo below and click “Set cover”.'}</div>
                  </div>
                  <div className="field" style={{ marginBottom: 6 }}>
                    <label>Sneak-peek photos: <b>{previewCount}</b> starred</label>
                    <div className="desc-inline">Click the star on any photo below to add it to the public page.</div>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Public link</label>
                    <div className="share-box">
                      <input value={publicLink()} readOnly />
                      <button className="btn solid link-btn" onClick={() => navigator.clipboard?.writeText(publicLink())}>Copy</button>
                    </div>
                    <button className="auth-switch" style={{ margin: '12px auto 0' }} onClick={() => window.open(`${window.location.origin}/showcase`, '_blank')}>
                      View your public portfolio ↗
                    </button>
                  </div>
                </>
              )}
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
              <div className="small">Full resolution is preserved — thumbnails are made automatically. Duplicates are skipped.</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && uploadPhotos(e.target.files)} />
            {progress && <div className="progress">{progress}</div>}

            {g.is_public && (
              <div className="hint-line">⭐ = in public sneak peek &nbsp;·&nbsp; ◆ = cover image</div>
            )}

            {photos.length > 0 && (
              <div className="thumb-grid">
                {photos.map((p) => (
                  <div key={p.id} className={`thumb ${p.is_preview ? 'is-preview' : ''} ${g.cover_path === p.thumb_path ? 'is-cover' : ''}`}>
                    <img src={photoUrl(p.thumb_path)} alt="" />
                    {g.is_public && (
                      <>
                        <button className={`star ${p.is_preview ? 'on' : ''}`} title="Add to public sneak peek" onClick={() => togglePreview(p)}>
                          <svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.8.7-5 4.7 1.4 6.7L12 18l-6 3.4 1.4-6.7-5-4.7 6.8-.7z" /></svg>
                        </button>
                        <button className="cover-btn" title="Use as cover" onClick={() => setCover(p)}>Set cover</button>
                      </>
                    )}
                    <button className="rm" onClick={() => removePhoto(p)}>
                      <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
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
