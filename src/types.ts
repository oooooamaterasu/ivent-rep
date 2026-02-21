export interface User {
  id: number;
  google_id: string;
  name: string;
  display_name: string;
  icon_url: string;
  bio: string;
  is_public: boolean;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  description: string;
}

export interface Contribution {
  id: number;
  user_id: number;
  event_id: number;
  attended: boolean;
  roles: string[];
  memo: string;
  evidence_url: string;
  created_at: string;
}

export interface RankingEntry {
  id: number;
  display_name: string;
  icon_url: string;
  attendance_count: number;
  role_points: number;
  is_public: boolean;
}

export const ROLES = [
  "主催",
  "企画",
  "進行",
  "告知",
  "参加",
  "設営",
  "撤収"
];
