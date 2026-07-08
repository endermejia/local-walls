import { inject, Pipe, PipeTransform } from '@angular/core';

import { SupabaseService } from '../services/supabase.service';

@Pipe({
  name: 'topoImage',
})
export class TopoImagePipe implements PipeTransform {
  private readonly supabase = inject(SupabaseService);

  async transform(
    input:
      | string
      | null
      | undefined
      | { path: string | null; version: number; isIndoor?: boolean },
  ): Promise<string> {
    // Extract path from input
    const path =
      typeof input === 'object' && input !== null ? input.path : input;
    const version =
      typeof input === 'object' && input !== null ? input.version : undefined;
    const isIndoor =
      typeof input === 'object' && input !== null ? input.isIndoor : false;

    if (isIndoor) {
      return this.supabase.getPublicUrl('indoor-assets', path);
    }
    return await this.supabase.getTopoSignedUrl(path, version);
  }
}
