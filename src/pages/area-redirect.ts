import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiLoader } from '@taiga-ui/core';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-area-redirect',
  imports: [TuiLoader],
  template: `
    <div class="flex items-center justify-center w-full h-[80vh]">
      <tui-loader size="xl"></tui-loader>
    </div>
  `,
  standalone: true,
})
export class AreaRedirectComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  constructor() {
    this.init();
  }

  private async init() {
    const cragId = this.route.snapshot.queryParams['crag_id'];
    const cancel = this.route.snapshot.queryParams['cancel'];

    if (cancel) {
      if (cragId) {
        this.redirectToCrag(cragId);
      } else {
        this.router.navigate(['/home']);
      }
      return;
    }

    if (cragId) {
      await this.redirectToCrag(cragId, true);
    } else {
      this.router.navigate(['/home']);
    }
  }

  private async redirectToCrag(cragId: string, success = false) {
    const { data: crag } = await this.supabase.client
      .from('crags')
      .select('slug, area:areas(slug)')
      .eq('id', Number(cragId))
      .single();

    if (crag && crag.area) {
      if (success) {
        this.toast.success('payments.purchased');
      }
      this.router.navigate([
        '/area',
        (crag.area as unknown as { slug: string }).slug,
        crag.slug,
      ]);
    } else {
      this.router.navigate(['/home']);
    }
  }
}
