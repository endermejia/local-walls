import { UserProfileBasicDto } from './user.model';
import { Database } from './supabase-generated';
import { AscentType } from './supabase-interfaces';

export interface IndoorCenter {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null; // PostGIS Point as string
  city: string | null;
  country: string | null;
  contact_info: any | null; // jsonb
  created_at: string;
}

export interface IndoorCenterAdmin {
  id: string;
  center_id: string;
  user_id: string;
  role: string | null;
  created_at: string;
}

export interface IndoorTopo {
  id: string;
  center_id: string;
  name: string;
  image_url: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface IndoorTopoPhoto {
  id: string;
  topo_id: string;
  image_url: string;
  user_id: string;
  created_at: string;
}

export interface IndoorRoute {
  id: string;
  center_id: string;
  topo_id: string | null;
  name: string;
  slug: string;
  grade: number | null;
  color: string | null;
  created_at: string;
}

export interface IndoorAscent {
  id: string;
  route_id: string;
  user_id: string;
  type: string;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface IndoorAscentComment {
  id: string;
  ascent_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

export interface MapIndoorItem {
  id: string;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
}
