import { Injectable } from '@angular/core';
import { ApiCore } from './api-core';

// 8a.nu raw models (subset)
export enum VerticalLifeGrade {
  G0 = 0, // unknown/lowest bucket
  G1 = 1, // 1
  G2 = 2, // 2
  G3a = 3, // 3a
  G3b = 4, // 3b
  G3c = 5, // 3c
  G4a = 6, // 4a
  G4b = 7, // 4b
  G8 = 8, // reserved
  G4c = 9, // 4c
  G5a = 10, // 5a
  G5aPlus = 11, // 5a+
  G5b = 12, // 5b
  G5bPlus = 13, // 5b+
  G5c = 14, // 5c
  G5cPlus = 15, // 5c+
  G6a = 16, // 6a
  G6aPlus = 17, // 6a+
  G6b = 18, // 6b
  G6bPlus = 19, // 6b+
  G20 = 20, // reserved
  G6c = 21, // 6c
  G6cPlus = 22, // 6c+
  G7a = 23, // 7a
  G7aPlus = 24, // 7a+
  G7b = 25, // 7b
  G7bPlus = 26, // 7b+
  G7c = 27, // 7c
  G7cPlus = 28, // 7c+
  G8a = 29, // 8a
  G8aPlus = 30, // 8a+
  G8b = 31, // 8b
  G8bPlus = 32, // 8b+
  G8c = 33, // 8c
  G8cPlus = 34, // 8c+
  G9a = 35, // 9a
  G9aPlus = 36, // 9a+
  G9b = 37, // 9b
  G9bPlus = 38, // 9b+
  G9c = 39, // 9c
}

interface VerticalLifeMapItemLocation {
  id?: number; // zone id
  area_type?: number; // 0 == area, ignore (area not implemented)
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  grades: Record<VerticalLifeGrade, number> & { project: number };
  country_slug: string;
  country_name: string;
  total_ascendables?: number; // routes
  total_ascents?: number; // ascents
}

interface VerticalLifeMapResponse {
  items: VerticalLifeMapItemLocation[];
  counts: unknown;
}

export interface MapBounds {
  south_west_latitude: number;
  south_west_longitude: number;
  north_east_latitude: number;
  north_east_longitude: number;
  zoom: number;
  page_index?: number;
  page_size?: number;
}

interface VerticalLifeSectorDto {
  sectorId: number;
  sectorName: string;
  sectorSlug: string;
  totalZlaggables: number;
}

interface VarticalLifeRoutesResponse {
  items: {
    zlaggableId: number;
    zlaggableName: string;
    difficulty?: string; // like 7a
    averageRating?: number;
    totalAscents?: number;
    sectorSlug?: string;
    sectorName?: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class VerticalLifeApi extends ApiCore {
  constructor() {
    super('/api/8anu');
  }

  /*
  La navegacion de la pagina es la siguiente:

  Home.ts con Map.ts
  1. Se obtiene la lista de zonas (mapLocations) dependiendo de la localizacion
   (sin hacer peticiones extra. solo map/items)
   adaptar chart-routes-by-grade para mostrar los crags con VerticalLifeMapItemLocation.grades

  2. Se obtiene la lista de crags dependiendo de la zona (getCrags)
    - problema: crag no tiene ubicacion (solo tiene nombre), por lo que no se puede
      mostrar en el mapa.
    - solucion para mostrar los crags en distintos puntos de la zona:
      pintar los crags en posiciones cercanas a la zona
    - no podemos mostrar el chart-routes-by-grade porque grades solo
      está para zona (VerticalLifeMapItemLocation.grades) pero no
      para crags (VerticalLifeSectorDto)

    Zone.ts
    - En caso de no tener la informacion precargada,
      debe poder recargar la informacion al recargar la pagina desde
      el input /:id de la ruta
    1 - Se obtiene la lista de crags dependiendo de la zona (getCrags)
      - no podemos mostrar el chart por el mismo motivo que en el punto 2.
      - no podemos mostrar el mapa porque no tiene ubicacion (solo tiene nombre)

    Crags.ts
    - En caso de no tener la informacion precargada,
      debe poder recargar la informacion al recargar la pagina desde
      el input /:id de la ruta ->
      modificar routes ts para que sea /zone/:idZone/crags/:idCrag
      puesto que necesitamos llamar a la api de crags por zona y no por crags (getCrags)




   */
  async getMapLocations(
    bounds: MapBounds,
  ): Promise<VerticalLifeMapItemLocation[]> {
    const resp = await this.get<VerticalLifeMapResponse>(
      '/api/unification/collection/v1/web/map/items',
      {
        query: {
          ...bounds,
          page_index: bounds.page_index ?? 0,
          page_size: bounds.page_size ?? 20,
          categories: 1,
        },
      },
    );
    const filtered = resp.items.filter(
      (it): it is VerticalLifeMapItemLocation =>
        it.area_type !== 0 &&
        !!it.id &&
        !!it.total_ascendables &&
        !!it.total_ascents,
    );
    console.log('getMapLocations', filtered);
    return (filtered as VerticalLifeMapItemLocation[]) ?? [];
  }

  async getCrags(
    country: string,
    areaSlug: string,
  ): Promise<VerticalLifeSectorDto[]> {
    return this.get<VerticalLifeSectorDto[]>(
      `/api/unification/outdoor/v1/web/crags/sportclimbing/${encodeURIComponent(country)}/${encodeURIComponent(areaSlug)}/sectors`,
    );
  }

  async getRoutesByCrag(
    country: string,
    cragSlug: string,
    params?: {
      sectorSlug?: string;
      pageIndex?: number;
      sortField?: string;
      order?: 'asc' | 'desc';
      grade?: string;
      searchQuery?: string;
    },
  ): Promise<VarticalLifeRoutesResponse> {
    const query = {
      sectorSlug: params?.sectorSlug,
      pageIndex: params?.pageIndex ?? 0,
      sortField: params?.sortField ?? 'totalascents',
      grade: params?.grade,
      searchQuery: params?.searchQuery,
      order: params?.order ?? 'desc',
      cragSlug,
    } as const;
    return this.get<VarticalLifeRoutesResponse>(
      `/api/unification/outdoor/v1/web/zlaggables/sportclimbing/${encodeURIComponent(country)}`,
      { query },
    );
  }
}
