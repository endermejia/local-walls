import {
  effect,
  inject,
  Injectable,
  signal,
  WritableSignal,
} from '@angular/core';

import { ORDERED_GRADE_VALUES } from '../models';

import { LocalStorage } from './local-storage';

@Injectable({ providedIn: 'root' })
export class FilterStateService {
  private readonly localStorage = inject(LocalStorage);

  // ---- Area List Filters ----
  private readonly areaListGradeRangeKey = 'area_list_grade_range_v1';
  private readonly areaListCategoriesKey = 'area_list_categories_v1';
  private readonly areaListShadeKey = 'area_list_shade_v1';
  private readonly areaListShowIndoorKey = 'area_list_show_indoor_v1';
  private readonly areaListShowOutdoorKey = 'area_list_show_outdoor_v1';
  private readonly areaListToposOnlyKey = 'area_list_topos_only_v1';

  areaListGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  areaListCategories: WritableSignal<number[]> = signal([]);
  areaListShade: WritableSignal<
    ('shade_morning' | 'shade_afternoon' | 'shade_all_day' | 'sun_all_day')[]
  > = signal([]);
  areaListShowIndoor: WritableSignal<boolean> = signal(false);
  areaListShowOutdoor: WritableSignal<boolean> = signal(false);
  areaListToposOnly: WritableSignal<boolean> = signal(false);

  // ---- Home Feed List Filters ----
  private readonly feedGradeRangeKey = 'feed_grade_range_v1';
  private readonly feedCategoriesKey = 'feed_categories_v1';
  private readonly feedShowIndoorKey = 'feed_show_indoor_v1';
  private readonly feedShowIndoorLegacyKey = 'feed_show_indoor_ascents_v1';
  private readonly feedShowOutdoorKey = 'feed_show_outdoor_v1';

  feedGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  feedCategories: WritableSignal<number[]> = signal([]);
  feedShowIndoor: WritableSignal<boolean> = signal(false);
  feedShowOutdoor: WritableSignal<boolean> = signal(false);

  // ---- User Profile Ascents (Feed) Filters ----
  private readonly profileAscentsGradeRangeKey =
    'profile_ascents_grade_range_v1';
  private readonly profileAscentsCategoriesKey =
    'profile_ascents_categories_v1';
  private readonly profileAscentsShowIndoorKey =
    'profile_ascents_show_indoor_v1';
  private readonly profileAscentsShowOutdoorKey =
    'profile_ascents_show_outdoor_v1';

  profileAscentsGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  profileAscentsCategories: WritableSignal<number[]> = signal([]);
  profileAscentsShowIndoor: WritableSignal<boolean> = signal(false);
  profileAscentsShowOutdoor: WritableSignal<boolean> = signal(false);

  readonly isOwnProfile = signal<boolean>(true);

  constructor() {
    this.hydrate();

    // Area list persistence
    effect(() => {
      this.localStorage.setItem(
        this.areaListGradeRangeKey,
        JSON.stringify(this.areaListGradeRange()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.areaListCategoriesKey,
        JSON.stringify(this.areaListCategories()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.areaListShadeKey,
        JSON.stringify(this.areaListShade()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.areaListShowIndoorKey,
        String(this.areaListShowIndoor()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.areaListShowOutdoorKey,
        String(this.areaListShowOutdoor()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.areaListToposOnlyKey,
        String(this.areaListToposOnly()),
      );
    });

    // Home feed persistence
    effect(() => {
      this.localStorage.setItem(
        this.feedGradeRangeKey,
        JSON.stringify(this.feedGradeRange()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.feedCategoriesKey,
        JSON.stringify(this.feedCategories()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.feedShowIndoorKey,
        String(this.feedShowIndoor()),
      );
    });
    effect(() => {
      this.localStorage.setItem(
        this.feedShowOutdoorKey,
        String(this.feedShowOutdoor()),
      );
    });

    // Profile ascents persistence (only persisted for own profile)
    effect(() => {
      const gradeRange = this.profileAscentsGradeRange();
      if (!this.isOwnProfile()) return;
      this.localStorage.setItem(
        this.profileAscentsGradeRangeKey,
        JSON.stringify(gradeRange),
      );
    });
    effect(() => {
      const categories = this.profileAscentsCategories();
      if (!this.isOwnProfile()) return;
      this.localStorage.setItem(
        this.profileAscentsCategoriesKey,
        JSON.stringify(categories),
      );
    });
    effect(() => {
      const showIndoor = this.profileAscentsShowIndoor();
      if (!this.isOwnProfile()) return;
      this.localStorage.setItem(
        this.profileAscentsShowIndoorKey,
        String(showIndoor),
      );
    });
    effect(() => {
      const showOutdoor = this.profileAscentsShowOutdoor();
      if (!this.isOwnProfile()) return;
      this.localStorage.setItem(
        this.profileAscentsShowOutdoorKey,
        String(showOutdoor),
      );
    });
  }

  private hydrate(): void {
    try {
      // Area list
      const rawGradeRange = this.localStorage.getItem(
        this.areaListGradeRangeKey,
      );
      if (rawGradeRange) {
        const parsed = JSON.parse(rawGradeRange);
        if (Array.isArray(parsed) && parsed.length === 2) {
          this.areaListGradeRange.set(parsed as [number, number]);
        }
      }

      const rawCategories = this.localStorage.getItem(
        this.areaListCategoriesKey,
      );
      if (rawCategories) {
        this.areaListCategories.set(JSON.parse(rawCategories));
      }

      const rawShade = this.localStorage.getItem(this.areaListShadeKey);
      if (rawShade) {
        this.areaListShade.set(JSON.parse(rawShade));
      }

      const rawShowIndoor = this.localStorage.getItem(
        this.areaListShowIndoorKey,
      );
      if (rawShowIndoor !== null) {
        this.areaListShowIndoor.set(rawShowIndoor === 'true');
      }

      const rawShowOutdoor = this.localStorage.getItem(
        this.areaListShowOutdoorKey,
      );
      if (rawShowOutdoor !== null) {
        this.areaListShowOutdoor.set(rawShowOutdoor === 'true');
      }

      const rawToposOnly = this.localStorage.getItem(this.areaListToposOnlyKey);
      if (rawToposOnly !== null) {
        this.areaListToposOnly.set(rawToposOnly === 'true');
      }

      // Home feed
      const rawFeedGradeRange = this.localStorage.getItem(
        this.feedGradeRangeKey,
      );
      if (rawFeedGradeRange) {
        const parsed = JSON.parse(rawFeedGradeRange);
        if (Array.isArray(parsed) && parsed.length === 2) {
          this.feedGradeRange.set(parsed as [number, number]);
        }
      }

      const rawFeedCategories = this.localStorage.getItem(
        this.feedCategoriesKey,
      );
      if (rawFeedCategories) {
        this.feedCategories.set(JSON.parse(rawFeedCategories));
      }

      const rawFeedIndoor =
        this.localStorage.getItem(this.feedShowIndoorKey) ??
        this.localStorage.getItem(this.feedShowIndoorLegacyKey);
      if (rawFeedIndoor !== null) {
        this.feedShowIndoor.set(rawFeedIndoor === 'true');
      }

      const rawFeedOutdoor = this.localStorage.getItem(this.feedShowOutdoorKey);
      if (rawFeedOutdoor !== null) {
        this.feedShowOutdoor.set(rawFeedOutdoor === 'true');
      }

      // Profile ascents
      this.hydrateProfileFilters();
    } catch {
      // Silent fail on hydration
    }
  }

  setProfileContext(isOwnProfile: boolean): void {
    if (this.isOwnProfile() && !isOwnProfile) {
      this.saveOwnProfileFilters();
    }
    this.isOwnProfile.set(isOwnProfile);
    if (isOwnProfile) {
      this.hydrateProfileFilters();
    } else {
      this.resetProfileFilters();
    }
  }

  saveOwnProfileFilters(): void {
    try {
      this.localStorage.setItem(
        this.profileAscentsGradeRangeKey,
        JSON.stringify(this.profileAscentsGradeRange()),
      );
      this.localStorage.setItem(
        this.profileAscentsCategoriesKey,
        JSON.stringify(this.profileAscentsCategories()),
      );
      this.localStorage.setItem(
        this.profileAscentsShowIndoorKey,
        String(this.profileAscentsShowIndoor()),
      );
      this.localStorage.setItem(
        this.profileAscentsShowOutdoorKey,
        String(this.profileAscentsShowOutdoor()),
      );
    } catch {
      // Silent fail on storage error
    }
  }

  hydrateProfileFilters(): void {
    try {
      const rawProfileGradeRange = this.localStorage.getItem(
        this.profileAscentsGradeRangeKey,
      );
      if (rawProfileGradeRange) {
        const parsed = JSON.parse(rawProfileGradeRange);
        if (Array.isArray(parsed) && parsed.length === 2) {
          this.profileAscentsGradeRange.set(parsed as [number, number]);
        } else {
          this.profileAscentsGradeRange.set([
            0,
            ORDERED_GRADE_VALUES.length - 1,
          ]);
        }
      } else {
        this.profileAscentsGradeRange.set([0, ORDERED_GRADE_VALUES.length - 1]);
      }

      const rawProfileCategories = this.localStorage.getItem(
        this.profileAscentsCategoriesKey,
      );
      if (rawProfileCategories) {
        this.profileAscentsCategories.set(JSON.parse(rawProfileCategories));
      } else {
        this.profileAscentsCategories.set([]);
      }

      const rawProfileIndoor = this.localStorage.getItem(
        this.profileAscentsShowIndoorKey,
      );
      if (rawProfileIndoor !== null) {
        this.profileAscentsShowIndoor.set(rawProfileIndoor === 'true');
      } else {
        this.profileAscentsShowIndoor.set(false);
      }

      const rawProfileOutdoor = this.localStorage.getItem(
        this.profileAscentsShowOutdoorKey,
      );
      if (rawProfileOutdoor !== null) {
        this.profileAscentsShowOutdoor.set(rawProfileOutdoor === 'true');
      } else {
        this.profileAscentsShowOutdoor.set(false);
      }
    } catch {
      this.resetProfileFilters();
    }
  }

  resetProfileFilters(): void {
    this.profileAscentsGradeRange.set([0, ORDERED_GRADE_VALUES.length - 1]);
    this.profileAscentsCategories.set([]);
    this.profileAscentsShowIndoor.set(false);
    this.profileAscentsShowOutdoor.set(false);
  }
}
