import { inject, Injectable } from '@angular/core';

import { Observable, from, map } from 'rxjs';

import { SupabaseService } from './supabase.service';
import {
  IndoorCenter,
  IndoorTopo,
  IndoorRoute,
  IndoorAscent,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class IndoorService {
  private readonly supabase = inject(SupabaseService);

  getCenter(slug: string): Observable<IndoorCenter | null> {
    return from(
      (this.supabase.client as any).from('indoor_centers' as any)
        .select('*')
        .eq('slug' as any, slug)
        .single(),
    ).pipe(map((res: any) => { const data = res.data; return  data as IndoorCenter | null; }));
  }

  getTopos(centerId: string): Observable<IndoorTopo[]> {
    return from(
      (this.supabase.client as any).from('indoor_topos' as any)
        .select('*')
        .eq('center_id' as any, centerId),
    ).pipe(map((res: any) => { const data = res.data; return  (data as any as IndoorTopo[]) || []; }));
  }

  getTopo(topoId: string): Observable<IndoorTopo | null> {
    return from(
      (this.supabase.client as any).from('indoor_topos' as any)
        .select('*')
        .eq('id' as any, topoId)
        .single(),
    ).pipe(map((res: any) => { const data = res.data; return  data as IndoorTopo | null; }));
  }

  getRoutes(centerId: string): Observable<IndoorRoute[]> {
    return from(
      (this.supabase.client as any).from('indoor_routes' as any)
        .select('*')
        .eq('center_id' as any, centerId),
    ).pipe(map((res: any) => { const data = res.data; return  (data as any as IndoorRoute[]) || []; }));
  }
}
