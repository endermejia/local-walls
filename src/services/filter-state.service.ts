import { inject, Injectable, signal, WritableSignal } from '@angular/core';
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

  areaListGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  areaListCategories: WritableSignal<number[]> = signal([]);
  areaListShade: WritableSignal<
    ('shade_morning' | 'shade_afternoon' | 'shade_all_day' | 'sun_all_day')[]
  > = signal([]);
  areaListShowIndoor: WritableSignal<boolean> = signal(false);
  areaListShowOutdoor: WritableSignal<boolean> = signal(true);

  // ---- Feed List Filters ----
  private readonly feedGradeRangeKey = 'feed_grade_range_v1';
  private readonly feedCategoriesKey = 'feed_categories_v1';
  private readonly feedShowIndoorAscentsKey = 'feed_show_indoor_ascents_v1';

  feedGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
  feedCategories: WritableSignal<number[]> = signal([]);
  feedShowIndoorAscents: WritableSignal<boolean> = signal(false);

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    try {
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

      const rawIndoor = this.localStorage.getItem(
        this.feedShowIndoorAscentsKey,
      );
      if (rawIndoor !== null) {
        this.feedShowIndoorAscents.set(rawIndoor === 'true');
      }
    } catch {
      // Silent fail on hydration
    }
  }
}
