import { inject, Pipe, PipeTransform } from '@angular/core';

import { SupabaseService } from '../services';

@Pipe({
  name: 'topoImage',
})
export class TopoImagePipe implements PipeTransform {
  private readonly supabase = inject(SupabaseService);

  transform(
    input: string | null | undefined | { path: string | null; version: number },
  ): string {
    // Extract path from input
    const path =
      typeof input === 'object' && input !== null ? input.path : input;

    const publicUrl = this.supabase.getTopoUrl(path);
    if (!publicUrl) return '';

    // Add version parameter if provided
    const url = new URL(publicUrl);
    if (typeof input === 'object' && input !== null && input.version) {
      url.searchParams.set('v', input.version.toString());
    }
    return url.toString();
  }
}
