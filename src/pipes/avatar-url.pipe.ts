import { inject, Pipe, PipeTransform } from '@angular/core';

import { SupabaseService } from '../services/supabase.service';

@Pipe({
  name: 'avatarUrl',
  standalone: true,
})
export class AvatarUrlPipe implements PipeTransform {
  private readonly supabase = inject(SupabaseService);

  transform(path: string | null | undefined): string {
    return this.supabase.buildAvatarUrl(path);
  }
}
