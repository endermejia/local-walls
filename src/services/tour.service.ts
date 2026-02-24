import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from './supabase.service';
import { UserProfilesService } from './user-profiles.service';

export enum TourStep {
  WELCOME = 0,
  HOME = 1,
  EXPLORE = 2,
  AREAS = 3,
  CRAG = 4,
  CRAG_TOPOS = 5,
  CRAG_PARKINGS = 6,
  CRAG_WEATHER = 7,
  ROUTE = 8,
  PROFILE = 9,
  PROFILE_PROJECTS = 10,
  PROFILE_STATISTICS = 11,
  PROFILE_LIKES = 12,
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
    await this.goToStep(TourStep.WELCOME);
  }

  async next(): Promise<void> {
    if (!this.isActive()) return;
    const current = this.step();
    if (current === TourStep.PROFILE_LIKES) {
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
    try {
      await this.userProfilesService.updateUserProfile({ first_steps: false });
    } finally {
      await this.stop();
    }
  }

  private async goToStep(step: TourStep): Promise<void> {
    // Navigate first
    switch (step) {
      case TourStep.WELCOME:
        await this.router.navigate(['/profile/config']);
        break;
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
      case TourStep.CRAG_TOPOS:
      case TourStep.CRAG_PARKINGS:
      case TourStep.CRAG_WEATHER:
        await this.navigateToAnyCrag();
        break;
      case TourStep.ROUTE:
        await this.navigateToAnyRoute();
        break;
      case TourStep.PROFILE:
      case TourStep.PROFILE_PROJECTS:
      case TourStep.PROFILE_STATISTICS:
      case TourStep.PROFILE_LIKES:
        await this.router.navigate(['/profile']);
        break;
    }

    this.step.set(step);
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
