import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { UserProfilesService } from './user-profiles.service';

export enum TourStep {
  WELCOME = 0,
  HOME = 1,
  EXPLORE = 2,
  EXPLORE_AREAS = 3,
  SEARCH = 4,
  PROFILE = 5,
  OFF = -1,
}

@Injectable({
  providedIn: 'root',
})
export class TourService {
  private readonly router = inject(Router);
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

  async finish(): Promise<void> {
    try {
      await this.userProfilesService.updateUserProfile({ first_steps: false });
    } finally {
      await this.stop();
    }
  }

  private async goToStep(step: TourStep): Promise<void> {
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
      case TourStep.SEARCH:
        // Already shown in navbar
        break;
      case TourStep.PROFILE:
        await this.router.navigate(['/profile']);
        break;
    }

    this.step.set(step);
  }
}
