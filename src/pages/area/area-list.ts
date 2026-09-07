import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiInput,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../../services/areas.service';
import { AuthStateService } from '../../services/auth-state.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';

import { AreaCardComponent } from '../../components/area/area-card';
import { AreaCardSkeletonComponent } from '../../components/area/area-card-skeleton';
import { EmptyStateComponent } from '../../components/ui/empty-state';

import {
  ClimbingKinds,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
} from '../../models';

import { IconSrcPipe } from '../../pipes';
import { matchesQuery } from '../../utils';

@Component({
  selector: 'app-area-list',
  imports: [
    AreaCardComponent,
    AreaCardSkeletonComponent,
    EmptyStateComponent,
    IconSrcPipe,
    LowerCasePipe,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiInput,
    TuiScrollbar,
  ],
  template: `
    <div class="relative flex grow min-h-0">
      <tui-scrollbar class="flex grow">
        <section class="w-full max-w-5xl mx-auto p-4 pb-32">
          <header class="flex items-center justify-between gap-2">
            @let areasCount = filtered().length;
            <h1 class="text-2xl font-bold w-full sm:w-auto">
              <span
                [tuiAvatar]="'zone' | iconSrc"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'area' | translate"
              ></span>
              {{ areasCount }}
              {{
                (areasCount === 1 ? 'area' : 'areas') | translate | lowercase
              }}
            </h1>

            <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
              @if (authState.canEditAsAdmin()) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="areasService.openUnifyAreas()"
                  [iconStart]="'@tui.blend'"
                >
                  {{ 'unify' | translate }}
                </button>
              }
              <button
                tuiButton
                appearance="textfield"
                size="s"
                type="button"
                (click.zoneless)="openCreateArea()"
                [iconStart]="'@tui.plus'"
              >
                {{ 'new' | translate }}
              </button>
            </div>
          </header>

          <div
            class="sticky top-0 z-10 py-4 flex items-end gap-2 bg-(--tui-background-base)"
          >
            <tui-textfield
              appearance="floating"
              class="grow block"
              tuiTextfieldSize="l"
            >
              <label tuiLabel for="areas-search">
                {{ 'searchPlaceholder' | translate }}
              </label>
              <input
                tuiInput
                #areasSearch
                id="areas-search"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="onQuery(areasSearch.value)"
              />
            </tui-textfield>
            <tui-badged-content class="rounded-2xl">
              @if (hasActiveFilters()) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                />
              }
              <button
                tuiButton
                appearance="textfield"
                size="l"
                type="button"
                iconStart="@tui.sliders-horizontal"
                [attr.aria-label]="'filters' | translate"
                (click.zoneless)="openFilters()"
              ></button>
            </tui-badged-content>
          </div>

          <!-- Areas list -->
          @if (!loading()) {
            <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
              @for (a of filtered(); track a.id) {
                <app-area-card [area]="a" />
              } @empty {
                <div class="col-span-full">
                  <app-empty-state icon="@tui.map" />
                </div>
              }
            </div>
          } @else {
            <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
              @for (i of [1, 2, 3, 4]; track i) {
                <app-area-card-skeleton />
              }
            </div>
          }
        </section>
      </tui-scrollbar>

      <div
        class="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none w-full flex justify-center z-20"
      >
        <button
          tuiButton
          size="m"
          appearance="primary-grayscale"
          iconStart="@tui.map"
          routerLink="/explore"
          class="pointer-events-auto shadow-xl"
        >
          {{ 'map' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AreaListComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly router = inject(Router);
  protected readonly areasService = inject(AreasService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly outdoorData = inject(OutdoorDataService);
  private readonly filterState = inject(FilterStateService);

  readonly loading = computed(
    () =>
      this.areasService.loading() ||
      this.outdoorData.areasListResource.isLoading() ||
      this.outdoorData.areasListResource.value() === undefined,
  );
  readonly areas = computed(() => this.outdoorData.areasList());

  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.filterState.areaListGradeRange;
  readonly selectedCategories = this.filterState.areaListCategories;
  readonly selectedShade = this.filterState.areaListShade;

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.selectedCategories().length > 0 ||
      this.selectedShade().length > 0 ||
      this.filterState.areaListToposOnly()
    );
  });
  readonly filtered = computed(() => {
    const query = this.query();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const list = this.areas();

    const textMatches = (a: (typeof list)[number]) =>
      matchesQuery(a.name, query) || matchesQuery(a.slug, query);
    const gradeMatches = (a: (typeof list)[number]) => {
      const grades = normalizeRoutesByGrade(a.grades);
      for (const label of allowedLabels) {
        if (grades[label] && Number(grades[label]) > 0) {
          return true;
        }
      }
      // Allow all if no grades data
      return allowedLabels.length === ORDERED_GRADE_VALUES.length;
    };
    const categories = this.selectedCategories();
    const shadeKeys = this.selectedShade();
    const kindMatches = (a: (typeof list)[number]) => {
      if (!categories.length) return true;
      const idxToKind: Record<number, string> = {
        0: ClimbingKinds.SPORT,
        1: ClimbingKinds.BOULDER,
        2: ClimbingKinds.MULTIPITCH,
      };
      const allowedKinds = categories.map((i) => idxToKind[i]).filter(Boolean);
      return a.climbing_kind?.some((k) => allowedKinds.includes(k));
    };
    const shadeMatches = (a: (typeof list)[number]) => {
      if (!shadeKeys.length) return true;
      // Matches if ANY of the selected shades is present in the area
      return shadeKeys.some((key) => {
        switch (key) {
          case 'shade_morning':
            return a.shade_morning;
          case 'shade_afternoon':
            return a.shade_afternoon;
          case 'shade_all_day':
            return a.shade_all_day;
          case 'sun_all_day':
            return a.sun_all_day;
          default:
            return true;
        }
      });
    };
    const toposOnly = this.filterState.areaListToposOnly();
    const toposMatches = (a: (typeof list)[number]) => {
      if (!toposOnly) return true;
      return (a.topos_count || 0) > 0;
    };
    return list.filter(
      (a) =>
        textMatches(a) &&
        gradeMatches(a) &&
        kindMatches(a) &&
        shadeMatches(a) &&
        toposMatches(a),
    );
  });

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters({ showToposOnly: true });
  }

  openCreateArea(): void {
    this.areasService.openAreaForm();
  }
}

export default AreaListComponent;
