import { AscentType } from './app-enums.model';

/**
 * Modelo completo para datos de ascenso que incluye todas las propiedades opcionales
 * que pueden venir de la base de datos o de formularios
 */
export interface AscentFormData {
  type?: AscentType | null;
  rate?: number | null;
  comment?: string | null;
  notes?: string | null;
  attempts?: number | null;
  private_ascent?: boolean | null;
  recommended?: boolean | null;
  soft?: boolean | null;
  hard?: boolean | null;
  cruxy?: boolean | null;
  athletic?: boolean | null;
  sloper?: boolean | null;
  endurance?: boolean | null;
  technical?: boolean | null;
  crimpy?: boolean | null;
  slab?: boolean | null;
  vertical?: boolean | null;
  overhang?: boolean | null;
  roof?: boolean | null;
  bad_anchor?: boolean | null;
  bad_bolts?: boolean | null;
  high_first_bolt?: boolean | null;
  lose_rock?: boolean | null;
  bad_clipping_position?: boolean | null;
  chipped?: boolean | null;
  with_kneepad?: boolean | null;
  no_score?: boolean | null;
  first_ascent?: boolean | null;
  traditional?: boolean | null;
  grade?: number | null;
  video_url?: string | null;
  date?: string | null;
  sit_start?: boolean | null;
  top_out?: boolean | null;
  highball?: boolean | null;
  route?: {
    id?: number | string;
    name?: string;
    climbing_kind?: string;
  } | null;
  route_id?: number | string | null;
  photo_path?: string | null;
}

/**
 * Tipo para las claves del modelo de ascenso que son booleanos
 */
export type AscentBooleanKey = keyof AscentFormData;

/**
 * Tipo para el modelo del formulario de ascenso
 */
export interface AscentFormModel {
  type: AscentType;
  rate: number;
  comment: string;
  date: import('@taiga-ui/cdk').TuiDay;
  attempts: number | null;
  private_ascent: boolean;
  recommended: boolean;
  soft: boolean;
  hard: boolean;
  grade: number | null;
  cruxy: boolean;
  athletic: boolean;
  sloper: boolean;
  endurance: boolean;
  technical: boolean;
  crimpy: boolean;
  slab: boolean;
  vertical: boolean;
  overhang: boolean;
  roof: boolean;
  bad_anchor: boolean;
  bad_bolts: boolean;
  high_first_bolt: boolean;
  lose_rock: boolean;
  bad_clipping_position: boolean;
  chipped: boolean;
  with_kneepad: boolean;
  no_score: boolean;
  first_ascent: boolean;
  traditional: boolean;
  video_url: string | null;
  photoControl: File | null;
  sit_start: boolean;
  top_out: boolean;
  highball: boolean;
}
