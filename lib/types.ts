export type AiLink = { label: string; url: string };
export type Source = { citation: string; url?: string };
export type RelKind = "related" | "cast_of" | "study_for" | "influenced_by" | "part_of";
export type Relationship = {
  id: string;
  from_id: string;
  to_id: string;
  kind: RelKind;
  created_at: string;
};

export type Artwork = {
  id: string;
  title: string;
  artist: string | null;
  year: string | null;
  medium: string | null;
  dimensions: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  ai_description: string | null;
  ai_links: AiLink[];
  sources: Source[];
  tags: string[];
  image_path: string | null;
  card_image_path: string | null;
  images: string[];
  collection_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Collection = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};
