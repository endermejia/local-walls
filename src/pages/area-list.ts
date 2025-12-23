import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AreasService, GlobalData } from '../services';
import { TranslatePipe } from '@ngx-translate/core';
import {
  TuiButton,
  TuiLoader,
  TuiTextfield,
  TuiTitle,
  TuiSurface,
} from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TranslateService } from '@ngx-translate/core';
import { FilterDialog, FilterDialogComponent } from './filter-dialog';
import {
  TuiAvatar,
  TuiBadgedContentComponent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { ChartRoutesByGradeComponent } from '../components';
import { AreaFormComponent } from './area-form';
import {
  ORDERED_GRADE_VALUES,
  normalizeRoutesByGrade,
  ClimbingKinds,
} from '../models';

@Component({
  selector: 'app-area-list',
  standalone: true,
  imports: [
    RouterLink,
    TranslatePipe,
    TuiLoader,
    TuiTextfield,
    TuiButton,
    TuiTitle,
    TuiSurface,
    TuiCardLarge,
    TuiHeader,
    LowerCasePipe,
    ChartRoutesByGradeComponent,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContentComponent,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      <header class="mb-4 flex items-center justify-between gap-2">
        @let areasCount = filtered().length;
        <h1 class="text-2xl font-bold">
          <tui-avatar
            tuiThumbnail
            size="l"
            [src]="global.iconSrc()('zone')"
            class="self-center"
            [attr.aria-label]="'labels.area' | translate"
          />
          {{ areasCount }}
          {{
            'labels.' + (areasCount === 1 ? 'area' : 'areas')
              | translate
              | lowercase
          }}
        </h1>

        @if (global.isAdmin()) {
          <button
            tuiButton
            appearance="textfield"
            size="m"
            type="button"
            (click.zoneless)="openCreateArea()"
          >
            {{ 'areas.new' | translate }}
          </button>
        }
      </header>

      <div class="mb-4 flex items-end gap-2">
        <tui-textfield class="grow block" tuiTextfieldSize="l">
          <label tuiLabel for="areas-search">{{
            'areas.searchPlaceholder' | translate
          }}</label>
          <input
            tuiTextfield
            #areasSearch
            id="areas-search"
            [value]="query()"
            (input.zoneless)="onQuery(areasSearch.value)"
          /> </tui-textfield
        ><tui-badged-content>
          @if (hasActiveFilters()) {
            <tui-badge-notification size="s" tuiSlot="top" />
          }
          <button
            tuiButton
            appearance="textfield"
            size="l"
            type="button"
            iconStart="@tui.sliders-horizontal"
            [attr.aria-label]="'labels.filters' | translate"
            (click.zoneless)="openFilters()"
          ></button>
        </tui-badged-content>
      </div>

      <!-- Areas list -->
      @if (!loading()) {
        <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
          @for (a of filtered(); track a.id) {
            <div
              tuiCardLarge
              [tuiSurface]="a.liked ? 'outline-destructive' : 'outline'"
              class="cursor-pointer"
              [routerLink]="['/area', a.slug]"
            >
              <div class="flex flex-col min-w-0 grow">
                <header tuiHeader>
                  <h2 tuiTitle>{{ a.name }}</h2>
                </header>
                <section class="flex items-center justify-between gap-2">
                  <div class="text-xl">
                    {{ a.crags_count }}
                    {{
                      'labels.' + (a.crags_count === 1 ? 'crag' : 'crags')
                        | translate
                        | lowercase
                    }}
                  </div>
                  <app-chart-routes-by-grade
                    (click.zoneless)="$event.stopPropagation()"
                    [grades]="a.grades"
                  />
                </section>
              </div>
            </div>
          } @empty {
            <div class="opacity-70">{{ 'areas.empty' | translate }}</div>
          }
        </div>
      } @else {
        <div class="flex items-center justify-center py-8">
          <tui-loader size="xxl" />
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class AreaListComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly areasService = inject(AreasService);
  protected readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly loading = computed(() => this.areasService.loading());
  readonly areas = computed(() => this.global.areaList());

  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.global.areaListGradeRange;
  readonly selectedCategories = this.global.areaListCategories;
  readonly selectedShade = this.global.areaListShade;

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.selectedCategories().length > 0 ||
      this.selectedShade().length > 0
    );
  });
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const list = this.areas();
    const textMatches = (a: (typeof list)[number]) =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q);
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
            return !!a.shade_morning;
          case 'shade_afternoon':
            return !!a.shade_afternoon;
          case 'shade_all_day':
            return !!a.shade_all_day;
          case 'sun_all_day':
            return !!a.sun_all_day;
          default:
            return true;
        }
      });
    };
    return list.filter(
      (a) =>
        textMatches(a) && gradeMatches(a) && kindMatches(a) && shadeMatches(a),
    );
  });

  constructor() {
    this.global.resetDataByPage('home');
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    const data = {
      categories: this.selectedCategories(),
      gradeRange: this.selectedGradeRange(),
      selectedShade: this.selectedShade(),
      showCategories: true,
      showShade: true,
      showGradeRange: true,
    } as FilterDialog;
    this.dialogs
      .open<FilterDialog>(new PolymorpheusComponent(FilterDialogComponent), {
        label: this.translate.instant('labels.filters'),
        size: 'l',
        data,
      })
      .subscribe((result) => {
        if (!result) return;
        const [a, b] = result.gradeRange ?? [
          0,
          ORDERED_GRADE_VALUES.length - 1,
        ];
        const clamp = (v: number) =>
          Math.max(0, Math.min(ORDERED_GRADE_VALUES.length - 1, Math.round(v)));
        const lo = clamp(a);
        const hi = clamp(b);
        this.selectedGradeRange.set([Math.min(lo, hi), Math.max(lo, hi)] as [
          number,
          number,
        ]);
        // Categories and shade/sun
        this.selectedCategories.set(result.categories ?? []);
        this.selectedShade.set(result.selectedShade ?? []);
      });
  }

  openCreateArea(): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(AreaFormComponent), {
        label: this.translate.instant('areas.newTitle'),
        size: 'l',
      })
      .subscribe();
  }
}

export default AreaListComponent;
