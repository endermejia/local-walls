import { RouteDto } from './supabase-interfaces';
import { RouteWithExtras } from './route.model';
import { IndoorRouteDto } from './indoor.model';

/**
 * Modelo para datos de topo indoor
 */
export interface IndoorTopoFormData {
  id: string;
  name: string;
  image_url?: string | null;
  photo?: string | null;
  climbing_kind?: 'sport' | 'boulder' | null;
  legacy?: boolean | null;
  center_id?: string;
}

/**
 * Tipo para rutas seleccionadas en el formulario - union de tipos existentes
 */
export type SelectedRoute = RouteDto | RouteWithExtras | IndoorRouteDto;

/**
 * Modelo para el formulario de topo
 */
export interface TopoFormModel {
  name: string;
  photo: string | null;
  shade_morning: boolean;
  shade_afternoon: boolean;
  shade_change_hour: string | null;
  selectedRoutes: SelectedRoute[];
  photoControl: File | null;
  legacy: boolean;
}
