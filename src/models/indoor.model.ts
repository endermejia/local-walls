import {
  TableInsert,
  TableRow,
  TableUpdate,
  EquipperDto,
} from './supabase-interfaces';
import { AscentType } from './app-enums.model';

// --- Indoor DTOs ---
export type IndoorCenterDto = TableRow<'indoor_centers'>;
export type IndoorCenterInsertDto = TableInsert<'indoor_centers'>;
export type IndoorCenterUpdateDto = TableUpdate<'indoor_centers'>;

export type IndoorCenterAdminDto = TableRow<'indoor_center_admins'>;
export type IndoorCenterAdminInsertDto = TableInsert<'indoor_center_admins'>;
export type IndoorCenterAdminUpdateDto = TableUpdate<'indoor_center_admins'>;

export type IndoorRouteDto = TableRow<'indoor_routes'>;
export type IndoorRouteInsertDto = TableInsert<'indoor_routes'>;
export type IndoorRouteUpdateDto = TableUpdate<'indoor_routes'>;

export type IndoorAscentDto = TableRow<'indoor_ascents'>;
export type IndoorAscentInsertDto = TableInsert<'indoor_ascents'>;
export type IndoorAscentUpdateDto = TableUpdate<'indoor_ascents'>;

export type IndoorTopoDto = TableRow<'indoor_topos'>;
export type IndoorTopoInsertDto = TableInsert<'indoor_topos'>;
export type IndoorTopoUpdateDto = TableUpdate<'indoor_topos'>;

export type IndoorVoucherDto = TableRow<'indoor_vouchers'>;
export type IndoorVoucherInsertDto = TableInsert<'indoor_vouchers'>;
export type IndoorVoucherUpdateDto = TableUpdate<'indoor_vouchers'>;

export type IndoorVoucherPurchaseDto = TableRow<'indoor_voucher_purchases'>;
export type IndoorVoucherPurchaseInsertDto =
  TableInsert<'indoor_voucher_purchases'>;
export type IndoorVoucherPurchaseUpdateDto =
  TableUpdate<'indoor_voucher_purchases'>;

export type IndoorVoucherUsageDto = TableRow<'indoor_voucher_usage'>;
export type IndoorVoucherUsageInsertDto = TableInsert<'indoor_voucher_usage'>;
export type IndoorVoucherUsageUpdateDto = TableUpdate<'indoor_voucher_usage'>;

export type IndoorSaleDto = TableRow<'indoor_sales'>;
export type IndoorSaleInsertDto = TableInsert<'indoor_sales'>;
export type IndoorSaleUpdateDto = TableUpdate<'indoor_sales'>;

export type IndoorInventoryDto = TableRow<'indoor_inventory'>;
export type IndoorInventoryInsertDto = TableInsert<'indoor_inventory'>;
export type IndoorInventoryUpdateDto = TableUpdate<'indoor_inventory'>;

// --- Extras ---

export interface IndoorCenterWithExtras extends IndoorCenterDto {
  distance?: number;
  active_vouchers?: IndoorVoucherPurchaseDto[];
  available_vouchers?: IndoorVoucherDto[];
}

export interface IndoorSchedule {
  normal: Record<
    string,
    {
      open: string;
      close: string;
      closed?: boolean;
      open2?: string | null;
      close2?: string | null;
    }
  >;
  exceptions: {
    date: string;
    open?: string;
    close?: string;
    closed: boolean;
    note?: string;
  }[];
}

export interface IndoorVoucherWithCenter extends IndoorVoucherDto {
  center_name?: string;
}

export interface IndoorVoucherPurchaseWithDetails extends IndoorVoucherPurchaseDto {
  voucher_name?: string;
  center_id?: string;
  center_name?: string;
}

export interface IndoorRouteWithExtras extends IndoorRouteDto {
  equippers?: EquipperDto[];
  center_name?: string;
  center_slug?: string;
  own_ascent?: { id: string; type: AscentType | null } | null;
  topos?: { id: string; name: string; legacy?: boolean }[];
  rating?: number | null;
  ascent_count?: number | null;
}

export interface IndoorAscentWithExtras extends IndoorAscentDto {
  route?: Pick<
    IndoorRouteWithExtras,
    'id' | 'name' | 'grade' | 'climbing_kind' | 'center_name' | 'center_slug'
  >;
  user_profile?: { id: string; name: string | null; avatar: string | null };
  user?: { id: string; name: string | null; avatar: string | null };
}

// --- Query result shapes (raw Supabase joins) ---

/** Row returned by getCenterTopos query */
export interface IndoorTopoQueryRow extends IndoorTopoDto {
  indoor_topo_routes: {
    route: {
      id: string;
      grade: number | null;
      ascents: { id: string; user_id: string | null }[];
    } | null;
  }[];
}

/** Row returned by getRouteAscents / getCenterAscents queries */
export interface IndoorAscentQueryRow extends IndoorAscentDto {
  route: {
    id: string;
    name: string;
    color: string | null;
    climbing_kind: string | null;
    grade: number | null;
    center: { id: string; name: string; slug: string } | null;
  } | null;
  user_profile: { id: string; name: string | null; avatar: string | null } | null;
}

/** Row returned by openIndoorTopoForm initial routes query */
export interface IndoorTopoRouteWithRoute {
  id: string;
  topo_id: string;
  route_id: string;
  number: number;
  path: import('./topo.model').TopoPath | null;
  route: IndoorRouteDto;
}

/** Enriched topo returned by getCenterTopos after mapping */
export interface IndoorTopoListItem extends IndoorTopoDto {
  photo: string | null;
  grades: Record<number, number>;
  total_routes: number;
  own_ascents_count: number;
  slug: string;
  shade_afternoon: boolean;
  shade_change_hour: string | null;
  shade_morning: boolean;
}
