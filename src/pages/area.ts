import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiHint,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  ClimbingKinds,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
} from '../models';

import {
  AreasService,
  CragsService,
  FiltersService,
  GlobalData,
  ToastService,
} from '../services';

import {
  BreadcrumbComponent,
  ChartRoutesByGradeComponent,
  EmptyStateComponent,
} from '../components';

import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    ChartRoutesByGradeComponent,
    EmptyStateComponent,
    LowerCasePipe,
    TranslatePipe,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiHeader,
    TuiHint,
    TuiLabel,
    TuiLoader,
    TuiScrollbar,
    TuiTextfield,
    TuiTitle,
    TuiAppearance,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4">
        @if (global.selectedArea(); as area) {
          <app-breadcrumb />
          <header class="mb-4 flex items-start justify-between gap-2">
            <h1 class="text-2xl font-bold line-clamp-1">{{ area.name }}</h1>

            <div
              class="flex flex-wrap sm:flex-nowrap gap-2 justify-end items-center"
            >
              <button
                size="s"
                [appearance]="area.liked ? 'accent' : 'neutral'"
                iconStart="@tui.heart"
                tuiIconButton
                type="button"
                class="!rounded-full"
                [tuiHint]="
                  global.isMobile()
                    ? null
                    : ((area.liked
                        ? 'actions.favorite.remove'
                        : 'actions.favorite.add'
                      ) | translate)
                "
                (click.zoneless)="onToggleLike()"
              >
                {{
                  (area.liked
                    ? 'actions.favorite.remove'
                    : 'actions.favorite.add'
                  ) | translate
                }}
              </button>

              @if (global.isAdmin()) {
                <button
                  size="s"
                  appearance="neutral"
                  iconStart="@tui.square-pen"
                  tuiIconButton
                  type="button"
                  class="!rounded-full"
                  [tuiHint]="
                    global.isMobile() ? null : ('actions.edit' | translate)
                  "
                  (click.zoneless)="openEditArea()"
                >
                  {{ 'actions.edit' | translate }}
                </button>
                <button
                  size="s"
                  appearance="negative"
                  iconStart="@tui.trash"
                  tuiIconButton
                  type="button"
                  class="!rounded-full"
                  [tuiHint]="
                    global.isMobile() ? null : ('actions.delete' | translate)
                  "
                  (click.zoneless)="deleteArea()"
                >
                  {{ 'actions.delete' | translate }}
                </button>
              }
            </div>
          </header>

          <div class="mb-4 flex justify-end">
            <app-chart-routes-by-grade [grades]="area.grades" />
          </div>

          <!-- Crags list -->
          @let crags = filteredCrags();
          @let cragsCount = crags.length;
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-2xl font-semibold">
              <tui-avatar
                tuiThumbnail
                size="l"
                [src]="global.iconSrc()('crag')"
                class="self-center"
                [attr.aria-label]="'labels.crag' | translate"
              />
              {{ cragsCount }}
              {{
                'labels.' + (cragsCount === 1 ? 'crag' : 'crags')
                  | translate
                  | lowercase
              }}
            </h2>
            @if (global.isAdmin()) {
              <button
                tuiButton
                appearance="textfield"
                size="s"
                type="button"
                (click.zoneless)="openCreateCrag()"
                [iconStart]="'@tui.plus'"
              >
                {{ 'actions.new' | translate }}
              </button>
            }
          </div>

          <div class="sticky top-0 z-10 py-4 flex items-end gap-2">
            <tui-textfield
              class="grow block bg-[var(--tui-background-base)]"
              tuiTextfieldSize="l"
            >
              <label tuiLabel for="crags-search">{{
                'labels.searchPlaceholder' | translate
              }}</label>
              <input
                tuiTextfield
                #cragsSearch
                id="crags-search"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="onQuery(cragsSearch.value)"
              />
            </tui-textfield>
            <tui-badged-content
              class="bg-[var(--tui-background-base)] rounded-2xl"
            >
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
                [tuiHint]="
                  global.isMobile() ? null : ('labels.filters' | translate)
                "
                (click.zoneless)="openFilters()"
              ></button>
            </tui-badged-content>
          </div>

          <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
            @for (crag of crags; track crag.slug) {
              <button
                class="p-6 rounded-3xl"
                [tuiAppearance]="crag.liked ? 'outline-destructive' : 'outline'"
                (click.zoneless)="
                  router.navigate(['/area', area.slug, crag.slug])
                "
              >
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ crag.name }}</h2>
                  </header>
                  <section class="flex items-center justify-between gap-2">
                    <div class="text-xl">
                      {{ crag.topos_count }}
                      {{ 'labels.topos' | translate | lowercase }}
                    </div>
                    <app-chart-routes-by-grade
                      (click)="$event.stopPropagation()"
                      [grades]="crag.grades"
                    />
                  </section>
                </div>
              </button>
            } @empty {
              <app-empty-state class="col-span-full" />
            }
          </div>
        } @else {
          <div class="flex items-center justify-center py-16">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AreaComponent {
  protected readonly global = inject(GlobalData);
  protected readonly router = inject(Router);
  protected readonly toast = inject(ToastService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly areas = inject(AreasService);
  private readonly cragsService = inject(CragsService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly filtersService = inject(FiltersService);

  areaSlug: InputSignal<string> = input.required<string>();
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

  readonly filteredCrags = computed(() => {
    const q = this.query().trim().toLowerCase();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const list = this.global.cragsList();

    const textMatches = (c: (typeof list)[number]) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q);

    const gradeMatches = (c: (typeof list)[number]) => {
      const grades = normalizeRoutesByGrade(c.grades);
      for (const label of allowedLabels) {
        if (grades[label] && Number(grades[label]) > 0) {
          return true;
        }
      }
      return allowedLabels.length === ORDERED_GRADE_VALUES.length;
    };

    const categories = this.selectedCategories();
    const kindMatches = (c: (typeof list)[number]) => {
      if (!categories.length) return true;
      const idxToKind: Record<number, string> = {
        0: ClimbingKinds.SPORT,
        1: ClimbingKinds.BOULDER,
        2: ClimbingKinds.MULTIPITCH,
      };
      const allowedKinds = categories.map((i) => idxToKind[i]).filter(Boolean);
      return c.climbing_kind?.some((k) => allowedKinds.includes(k));
    };

    const shadeKeys = this.selectedShade();
    const shadeMatches = (c: (typeof list)[number]) => {
      if (!shadeKeys.length) return true;
      return shadeKeys.some((key) => {
        switch (key) {
          case 'shade_morning':
            return c.shade_morning;
          case 'shade_afternoon':
            return c.shade_afternoon;
          case 'shade_all_day':
            return c.shade_all_day;
          case 'sun_all_day':
            return c.sun_all_day;
          default:
            return true;
        }
      });
    };

    return list.filter(
      (c) =>
        textMatches(c) && gradeMatches(c) && kindMatches(c) && shadeMatches(c),
    );
  });

  constructor() {
    effect(() => {
      const slug = this.areaSlug();
      this.global.resetDataByPage('area');
      this.global.selectedAreaSlug.set(slug);
    });
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters();
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const area = this.global.selectedArea();
    if (!area) return;
    void this.areas.toggleAreaLike(area.id);
  }

  async deleteArea(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const t = await firstValueFrom(
      this.translate.get(['areas.deleteTitle', 'areas.deleteConfirm'], {
        name: area.name,
      }),
    );
    const title = t['areas.deleteTitle'];
    const message = t['areas.deleteConfirm'];

    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('actions.delete'),
      no: this.translate.instant('actions.cancel'),
      appearance: 'accent',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: title,
        size: 's',
        data,
      }),
      { defaultValue: false },
    );
    if (!confirmed) return;
    try {
      await this.areas.delete(area.id);
      await this.router.navigateByUrl('/areas');
    } catch (e) {
      const error = e as Error;
      console.error('[AreaComponent] Error deleting area:', error);
      handleErrorToast(error, this.toast);
    }
  }

  openEditArea(): void {
    const area = this.global.selectedArea();
    if (!area) return;
    this.areas.openAreaForm({
      areaData: { id: area.id, name: area.name, slug: area.slug },
    });
  }

  openCreateCrag(): void {
    const current = this.global.selectedArea();
    if (!current) return;
    this.cragsService.openCragForm({ areaId: current.id });
  }
}
