/** Single media item in a portfolio entry (image, GIF, or video) */
export interface PortfolioMediaItem {
  type: "image" | "video";
  url: string;
}

/** One portfolio project (Upwork-style) */
export interface DiggerPortfolioItem {
  id: string;
  digger_profile_id: string;
  title: string;
  description: string | null;
  project_url: string | null;
  skills: string[];
  category: string | null;
  media: PortfolioMediaItem[];
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type DiggerPortfolioItemInsert = Omit<DiggerPortfolioItem, "id" | "created_at" | "updated_at"> & { id?: string };
export type DiggerPortfolioItemDraft = Omit<DiggerPortfolioItem, "id" | "digger_profile_id" | "created_at" | "updated_at"> & { id?: string; digger_profile_id?: string };
