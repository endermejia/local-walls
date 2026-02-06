import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { UserProfilesService } from './user-profiles.service';

export enum TourStep {
  HOME = 0,
  EXPLORE = 1,
  AREAS = 2,
  CRAG = 3,
  ROUTE = 4,
  PROFILE = 5,
  OFF = -1,
}

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly router = inject(Router);
  private readonly supabase = inject(SupabaseService);
  private readonly userProfilesService = inject(UserProfilesService);

  readonly step = signal<TourStep>(TourStep.OFF);
  readonly isActive = signal<boolean>(false);

  async start(): Promise<void> {
    this.isActive.set(true);
    await this.goToStep(TourStep.HOME);
  }

  async next(): Promise<void> {
    const current = this.step();
    if (current === TourStep.PROFILE) {
      await this.finish();
      return;
    }
    await this.goToStep(current + 1);
  }

  async stop(): Promise<void> {
    this.isActive.set(false);
    this.step.set(TourStep.OFF);
  }

  private async finish(): Promise<void> {
    await this.userProfilesService.updateUserProfile({ first_steps: false });
    await this.stop();
  }

  private async goToStep(step: TourStep): Promise<void> {
    this.step.set(step);
    switch (step) {
      case TourStep.HOME:
        await this.router.navigate(['/home']);
        break;
      case TourStep.EXPLORE:
        await this.router.navigate(['/explore']);
        break;
      case TourStep.AREAS:
        await this.router.navigate(['/area']);
        break;
      case TourStep.CRAG:
        await this.navigateToAnyCrag();
        break;
      case TourStep.ROUTE:
        await this.navigateToAnyRoute();
        break;
      case TourStep.PROFILE:
        await this.router.navigate(['/profile']);
        break;
    }
  }

  private async navigateToAnyCrag(): Promise<void> {
    // Find a crag that has an area
    const { data } = await this.supabase.client
      .from('crags')
      .select('slug, area:areas!inner(slug)')
      .limit(1)
      .maybeSingle();

    if (data && data.area) {
      await this.router.navigate(['/area', data.area.slug, data.slug]);
    } else {
      // Fallback if no data, skip to next step
      await this.next();
    }
  }

  private async navigateToAnyRoute(): Promise<void> {
    // Find a route that has a crag and area
    const { data } = await this.supabase.client
      .from('routes')
      .select('slug, crag:crags!inner(slug, area:areas!inner(slug))')
      .limit(1)
      .maybeSingle();

    if (data && data.crag && data.crag.area) {
      await this.router.navigate([
        '/area',
        data.crag.area.slug,
        data.crag.slug,
        data.slug,
      ]);
    } else {
      // Fallback
      await this.next();
    }
  }
}
