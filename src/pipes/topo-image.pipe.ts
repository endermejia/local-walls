import { inject, Pipe, PipeTransform } from '@angular/core';

import { SupabaseService } from '../services';

@Pipe({
  name: 'topoImage',
})
export class TopoImagePipe implements PipeTransform {
  private readonly supabase = inject(SupabaseService);

  async transform(
    input: string | null | undefined | { path: string | null; version: number },
  ): Promise<string> {
    // Extract path from input
    const path =
      typeof input === 'object' && input !== null ? input.path : input;
    const version =
      typeof input === 'object' && input !== null ? input.version : undefined;

    return await this.supabase.getTopoSignedUrl(path, version);
  }
}
