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
    const areaId = this.route.snapshot.queryParams['area_id'];
    const cancel = this.route.snapshot.queryParams['cancel'];

    const onboardingSuccess =
      this.route.snapshot.queryParams['onboarding_success'];
    const onboardingRefresh =
      this.route.snapshot.queryParams['onboarding_refresh'];

    if (onboardingSuccess || onboardingRefresh) {
      if (onboardingSuccess) {
        this.toast.success('profile.saveSuccess');
      }
      if (areaId) {
        void this.redirectToArea(areaId);
      } else {
        void this.router.navigate(['/home']);
      }
      return;
    }

    if (cancel) {
      if (cragId) {
        void this.redirectToCrag(cragId);
      } else if (areaId) {
        void this.redirectToArea(areaId);
      } else {
        void this.router.navigate(['/home']);
      }
      return;
    }

    if (cragId) {
      await this.redirectToCrag(cragId, true);
    } else if (areaId) {
      await this.redirectToArea(areaId, true);
    } else {
      void this.router.navigate(['/home']);
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
      void this.router.navigate([
        '/area',
        (crag.area as unknown as { slug: string }).slug,
        crag.slug,
      ]);
    } else {
      void this.router.navigate(['/home']);
    }
  }

  private async redirectToArea(areaId: string, success = false) {
    const { data: area } = await this.supabase.client
      .from('areas')
      .select('slug')
      .eq('id', Number(areaId))
      .single();

    if (area) {
      if (success) {
        this.toast.success('payments.purchased');
      }
      void this.router.navigate(['/area', area.slug]);
    } else {
      void this.router.navigate(['/home']);
    }
  }
}
