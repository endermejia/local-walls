import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
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
import { FilterDialog, HomeFilterDialogComponent } from './filter-dialog';
import { TuiAvatar } from '@taiga-ui/kit';
import { ChartRoutesByGradeComponent } from '../components';
import { AreaFormComponent } from './area-form';
import { ORDERED_GRADE_VALUES, normalizeRoutesByGrade } from '../models';

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
            id="areas-search"
            [value]="query()"
            (input.zoneless)="onQuery($any($event.target).value)"
          />
        </tui-textfield>
        <button
          tuiButton
          appearance="textfield"
          size="l"
          type="button"
          iconStart="@tui.sliders-horizontal"
          [attr.aria-label]="'labels.filters' | translate"
          (click.zoneless)="openFilters()"
        ></button>
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
  readonly areas = computed(() => this.global.areas());

  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange: WritableSignal<[number, number]> = signal([
    0,
    ORDERED_GRADE_VALUES.length - 1,
  ]);
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
    return list.filter((a) => textMatches(a) && gradeMatches(a));
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      void this.areasService.listFromRpc();
    }
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    const data = {
      categories: [],
      gradeRange: this.selectedGradeRange(),
      showCategories: false,
      showShade: false,
      showGradeRange: true,
    } as FilterDialog;
    this.dialogs
      .open<FilterDialog>(
        new PolymorpheusComponent(HomeFilterDialogComponent),
        {
          label: this.translate.instant('labels.filters'),
          size: 'm',
          data,
        },
      )
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
      });
  }

  openCreateArea(): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(AreaFormComponent), {
        label: this.translate.instant('areas.newTitle'),
        size: 'm',
      })
      .subscribe({
        next: (created) => {
          if (created && isPlatformBrowser(this.platformId)) {
            void this.areasService.listFromRpc();
          }
        },
      });
  }
}

export default AreaListComponent;
