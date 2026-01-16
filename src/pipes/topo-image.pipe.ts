import { inject, Pipe, PipeTransform } from '@angular/core';

import { SupabaseService } from '../services';

@Pipe({
  name: 'topoImage',
  standalone: true,
})
export class TopoImagePipe implements PipeTransform {
  private readonly supabase = inject(SupabaseService);

  async transform(
    input: string | null | undefined | { path: string | null; version: number },
  ): Promise<string> {
    // Extract path from input
    const path =
      typeof input === 'object' && input !== null ? input.path : input;

    const signedUrl = await this.supabase.getTopoSignedUrl(path);
    if (!signedUrl) return '';

    // Add cache-busting parameter
    const url = new URL(signedUrl);
    url.searchParams.set('t', Date.now().toString());
    return url.toString();
  }
}
