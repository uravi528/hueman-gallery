export type Theme = 'light' | 'dark';
export type GridSize = 'small' | 'medium' | 'large';

export interface Gallery {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  client_name: string | null;
  location: string | null;
  shoot_date: string | null;
  logo_url: string | null;
  watermark_url: string | null;
  watermark_enabled: boolean;
  allow_downloads: boolean;
  default_theme: Theme;
  default_size: GridSize;
  access_code: string | null;
  is_public: boolean;
  public_slug: string | null;
  cover_path: string | null;
  intro_heading: string | null;
  intro_text: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  gallery_id: string;
  storage_path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  sort_order: number;
  original_name: string | null;
  file_size: number | null;
  is_preview: boolean;
  created_at: string;
}
