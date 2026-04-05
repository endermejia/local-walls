import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';

import { SupabaseService } from './supabase.service';
import { UserProfilesService } from './user-profiles.service';

export enum TourStep {
  WELCOME = 0,
  HOME = 1,
  EXPLORE = 2,
  EXPLORE_AREAS = 3,
  AREAS = 4,
  SEARCH = 5,
  CRAG = 6,
  CRAG_TOPOS = 7,
  CRAG_PARKINGS = 8,
  CRAG_WEATHER = 9,
  ROUTE = 10,
  PROFILE = 11,
  PROFILE_PROJECTS = 12,
  PROFILE_STATISTICS = 13,
  PROFILE_LIKES = 14,
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

  async finish(): Promise<void> {
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
      case TourStep.EXPLORE_AREAS:
        await this.router.navigate(['/explore']);
        break;
      case TourStep.AREAS:
        await this.router.navigate(['/area']);
        break;
      case TourStep.SEARCH:
        // Already shown in navbar
        break;
      case TourStep.CRAG:
      case TourStep.CRAG_TOPOS:
      case TourStep.CRAG_PARKINGS:
      case TourStep.CRAG_WEATHER:
        await this.navigateToCrag('Millena');
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

  private async navigateToCrag(name: string): Promise<void> {
    // Find a specific crag by name or fallback
    let query = this.supabase.client
      .from('crags')
      .select('slug, area:areas!inner(slug)')
      .limit(1);

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    const { data } = await query.maybeSingle();

    if (data && data.area) {
      const area = Array.isArray(data.area) ? data.area[0] : data.area;
      await this.router.navigate(['/area', area.slug, data.slug]);
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
