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
  created_at: string;
}
