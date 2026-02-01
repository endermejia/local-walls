import { AsyncPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
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

import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiHint,
  TuiIcon,
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
  TuiTabs,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  ClimbingKinds,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
  TopoListItem,
} from '../models';

import {
  AreasService,
  CragsService,
  FiltersService,
  GlobalData,
  SupabaseService,
  ToastService,
} from '../services';

import { TopoImagePipe } from '../pipes';

import {
  ChartRoutesByGradeComponent,
  EmptyStateComponent,
  SectionHeaderComponent,
} from '../components';

import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-area',
  imports: [
    AsyncPipe,
    ChartRoutesByGradeComponent,
    EmptyStateComponent,
    LowerCasePipe,
    SectionHeaderComponent,
    TopoImagePipe,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiHeader,
    TuiHint,
    TuiIcon,
    TuiLabel,
    TuiLoader,
    TuiScrollbar,
    TuiSwipe,
    TuiTabs,
    TuiTextfield,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section
        (tuiSwipe)="onSwipe($event)"
        class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full"
      >
        @let isAdmin = global.isAdmin();
        @if (global.selectedArea(); as area) {
          @let isEquipper = global.isAllowedEquipper(area.id);
          <div class="mb-4">
            <app-section-header
              class="w-full"
              [title]="area.name"
              [liked]="area.liked"
              (toggleLike)="onToggleLike()"
            >
              @if (isAdmin) {
                <div actionButtons class="flex gap-2">
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
                </div>
              }
            </app-section-header>
          </div>

          <div class="flex flex-col md:flex-row md:justify-between gap-4 mb-4">
            <div class="flex flex-col gap-3 grow">
              <div class="flex flex-col md:flex-row gap-2 items-start">
                <button
                  tuiButton
                  appearance="flat"
                  size="m"
                  type="button"
                  (click.zoneless)="viewOnMap()"
                  [iconStart]="'@tui.map-pin'"
                >
                  {{ 'actions.viewOnMap' | translate }}
                </button>
              </div>
            </div>
            <app-chart-routes-by-grade [grades]="area.grades" />
          </div>

          <tui-tabs
            [activeItemIndex]="activeTabIndex()"
            (activeItemIndexChange)="activeTabIndex.set($event)"
            class="mt-6"
          >
            <button tuiTab>
              {{ 'labels.crags' | translate }}
            </button>
            <button tuiTab>
              {{ 'labels.topos' | translate }}
            </button>
          </tui-tabs>

          <div class="mt-6">
            @switch (activeTabIndex()) {
              @case (0) {
                <div class="flex items-center justify-between gap-2 mb-4">
                  <div class="flex items-center w-full sm:w-auto gap-2">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      [src]="global.iconSrc()('crag')"
                      class="self-center"
                      [attr.aria-label]="'labels.crag' | translate"
                    />
                    <h2 class="text-2xl font-semibold">
                      {{ cragsCount() }}
                      {{
                        'labels.' + (cragsCount() === 1 ? 'crag' : 'crags')
                          | translate
                          | lowercase
                      }}
                    </h2>
                  </div>
                  @if (isAdmin || isEquipper) {
                    <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
                      <button
                        tuiButton
                        appearance="textfield"
                        size="s"
                        type="button"
                        (click.zoneless)="cragsService.openUnifyCrags()"
                        [iconStart]="'@tui.blend'"
                      >
                        {{ 'actions.unify' | translate }}
                      </button>
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
                    </div>
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
                      [attr.aria-label]="'labels.filters' | translate"
                      [tuiHint]="
                        global.isMobile()
                          ? null
                          : ('labels.filters' | translate)
                      "
                      (click.zoneless)="openFilters()"
                    ></button>
                  </tui-badged-content>
                </div>

                <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
                  @for (crag of crags(); track crag.slug) {
                    <button
                      class="p-6 rounded-3xl"
                      [tuiAppearance]="
                        crag.liked ? 'outline-destructive' : 'outline'
                      "
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
              }
              @case (1) {
                @let topos = global.areaToposResource.value() || [];
                <div class="flex items-center justify-between gap-2 mb-4">
                  <div class="flex items-center gap-2">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      [src]="global.iconSrc()('topo')"
                      class="self-center"
                      [attr.aria-label]="'labels.topo' | translate"
                    />
                    <h2 class="text-2xl font-semibold">
                      {{ topos.length }}
                      {{
                        'labels.' + (topos.length === 1 ? 'topo' : 'topos')
                          | translate
                          | lowercase
                      }}
                    </h2>
                  </div>
                </div>
                <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
                  @for (t of topos; track t.id) {
                    <button
                      class="p-6 rounded-3xl"
                      tuiAppearance="outline"
                      (click.zoneless)="
                        router.navigate([
                          '/area',
                          area.slug,
                          t.crag_slug,
                          'topo',
                          t.id,
                        ])
                      "
                    >
                      <div class="flex flex-col min-w-0 grow gap-2">
                        <header tuiHeader>
                          <h2 tuiTitle>{{ t.name }}</h2>
                        </header>
                        <section class="flex flex-col gap-2">
                          @if (t.photo; as photo) {
                            <img
                              [src]="
                                (photo | topoImage | async) ||
                                global.iconSrc()('topo')
                              "
                              alt="topo"
                              class="w-full h-48 object-cover rounded shadow-sm"
                              loading="lazy"
                              decoding="async"
                            />
                          }
                          <div
                            class="flex items-center justify-between gap-2 mt-auto"
                          >
                            <div
                              class="flex items-center justify-between gap-2"
                            >
                              @let shade = getShadeInfo(t);
                              <tui-icon
                                [icon]="shade.icon"
                                class="opacity-70 text-xl"
                              />
                              <span class="text-sm opacity-80">
                                {{ shade.label | translate }}
                                @if (t.shade_change_hour) {
                                  · {{ 'filters.shade.changeAt' | translate }}
                                  {{ t.shade_change_hour }}
                                }
                              </span>
                            </div>
                            <app-chart-routes-by-grade
                              [grades]="t.grades"
                              (click)="$event.stopPropagation()"
                            />
                          </div>
                        </section>
                      </div>
                    </button>
                  } @empty {
                    <div class="col-span-full">
                      <app-empty-state />
                    </div>
                  }
                </div>
              }
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
  protected readonly activeTabIndex = signal(0);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly toast = inject(ToastService);
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly areas = inject(AreasService);
  protected readonly cragsService = inject(CragsService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly translate = inject(TranslateService);
  protected readonly filtersService = inject(FiltersService);

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

  protected readonly crags = computed(() => this.filteredCrags());
  protected readonly cragsCount = computed(() => this.filteredCrags().length);

  protected onSwipe(event: TuiSwipeEvent): void {
    const direction = event.direction;
    const currentIndex = this.activeTabIndex();
    const maxIndex = 1; // Sectores and Croquis
    if (direction === 'left' && currentIndex < maxIndex) {
      this.activeTabIndex.set(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      this.activeTabIndex.set(currentIndex - 1);
    }
  }

  async viewOnMap(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;

    await this.supabase.whenReady();
    const { data: crags, error } = await this.supabase.client
      .from('crags')
      .select('latitude, longitude')
      .eq('area_id', area.id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error || !crags || crags.length === 0) return;

    const lats = crags.map((c) => c.latitude as number);
    const lngs = crags.map((c) => c.longitude as number);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const zoom = minLat === maxLat ? 13 : 11;

    this.global.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
      zoom,
    });
    void this.router.navigateByUrl('/explore');
  }

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
      await this.router.navigateByUrl('/area');
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

  protected getShadeInfo(t: TopoListItem) {
    if (t.shade_morning && t.shade_afternoon) {
      return { icon: '@tui.eclipse', label: 'filters.shade.allDay' };
    }
    if (t.shade_morning) {
      return { icon: '@tui.sunset', label: 'filters.shade.morning' };
    }
    if (t.shade_afternoon) {
      return { icon: '@tui.sunrise', label: 'filters.shade.afternoon' };
    }
    return { icon: '@tui.sun', label: 'filters.shade.noShade' };
  }
}
