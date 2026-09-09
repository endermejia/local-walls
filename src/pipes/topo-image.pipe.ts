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
      | {
          path: string | null;
          version: number;
          isIndoor?: boolean;
          isThumbnail?: boolean;
        },
  ): Promise<string> {
    // Extract path from input
    const path =
      typeof input === 'object' && input !== null ? input.path : input;
    const version =
      typeof input === 'object' && input !== null ? input.version : undefined;
    const isIndoor =
      typeof input === 'object' && input !== null ? input.isIndoor : false;
    const isThumbnail =
      typeof input === 'object' && input !== null ? input.isThumbnail : false;

    if (!path) return '';

    const effectivePath = isThumbnail ? this.getThumbnailPath(path) : path;

    if (isIndoor) {
      return this.supabase.getPublicUrl('indoor-assets', effectivePath);
    }

    if (isThumbnail) {
      const thumbSignedUrl = await this.supabase.getTopoSignedUrl(
        effectivePath,
        version,
      );
      if (thumbSignedUrl) {
        return thumbSignedUrl;
      }
    }

    return await this.supabase.getTopoSignedUrl(path, version);
  }

  private getThumbnailPath(path: string): string {
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex === -1) return `${path}_thumb.webp`;
    return `${path.substring(0, lastDotIndex)}_thumb.webp`;
  }
}
