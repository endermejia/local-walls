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
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
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
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AreasService } from '../services/areas.service';
import { CragsService } from '../services/crags.service';
import { FiltersService } from '../services/filters.service';
import { GlobalData } from '../services/global-data';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';
import { WeatherService } from '../services/weather.service';

import { ChartRoutesByGradeComponent } from '../components/chart-routes-by-grade';
import { EmptyStateComponent } from '../components/empty-state';
import { SectionHeaderComponent } from '../components/section-header';

import {
  ClimbingKinds,
  isGradeRangeOverlap,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
} from '../models';

import { handleErrorToast, normalizeName } from '../utils';

import { GradeComponent } from '../components/avatar-grade';
import { SeoService } from '../services/seo.service';

@Component({
  selector: 'app-area',
  imports: [
    ChartRoutesByGradeComponent,
    EmptyStateComponent,
    GradeComponent,
    LowerCasePipe,
    SectionHeaderComponent,
    TranslatePipe,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiHeader,
    TuiIcon,
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
        @let canEditAsAdmin = global.canEditAsAdmin();
        @if (global.selectedArea(); as area) {
          @let canEditAsAllowedEquipper =
            global.canEditAsAllowedEquipper()[area.id];
          <div class="mb-4">
            <app-section-header
              class="w-full"
              [title]="area.name"
              [liked]="area.liked"
              (toggleLike)="onToggleLike()"
            >
              @if (global.canEditArea()) {
                <div actionButtons class="flex gap-2">
                  <button
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    tuiIconButton
                    type="button"
                    class="!rounded-full"
                    (click.zoneless)="openEditArea()"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (canEditAsAdmin) {
                    <button
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      tuiIconButton
                      type="button"
                      class="!rounded-full"
                      (click.zoneless)="deleteArea()"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                </div>
              }
            </app-section-header>
          </div>

          <div class="mb-4 flex justify-between items-center gap-2">
            <button
              tuiButton
              appearance="flat"
              size="m"
              type="button"
              (click.zoneless)="viewOnMap()"
              [iconStart]="'@tui.map-pin'"
            >
              {{ 'viewOnMap' | translate }}
            </button>
            <app-chart-routes-by-grade [grades]="area.grades" />
          </div>

          <div class="flex items-center justify-between gap-2 mb-4">
            <div class="flex items-center w-full sm:w-auto gap-2">
              <tui-avatar
                tuiThumbnail
                size="l"
                [src]="global.iconSrc()('crag')"
                class="self-center"
                [attr.aria-label]="'crag' | translate"
              />
              <h2 class="text-2xl font-semibold">
                {{ cragsCount() }}
                {{
                  (cragsCount() === 1 ? 'crag' : 'crags')
                    | translate
                    | lowercase
                }}
              </h2>
            </div>
            <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
              @if (canEditAsAdmin || canEditAsAllowedEquipper) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="cragsService.openUnifyCrags()"
                  [iconStart]="'@tui.blend'"
                >
                  {{ 'unify' | translate }}
                </button>
              }
              @if (global.editingMode()) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="openCreateCrag()"
                  [iconStart]="'@tui.plus'"
                >
                  {{ 'new' | translate }}
                </button>
              }
              @if (canEditAsAdmin) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="onSync8a()"
                  [iconStart]="'@tui.refresh-ccw'"
                  [disabled]="areas.loading()"
                >
                  {{ 'import8a.button' | translate }}
                </button>
              }
            </div>
          </div>

          <div class="sticky top-0 z-10 py-4 flex items-end gap-2">
            <tui-textfield
              class="grow block bg-[var(--tui-background-base)]"
              tuiTextfieldSize="l"
            >
              <label tuiLabel for="crags-search">{{
                'searchPlaceholder' | translate
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
                [attr.aria-label]="'filters' | translate"
                (click.zoneless)="openFilters()"
              ></button>
            </tui-badged-content>
          </div>

          @let routesList = routes();
          @if (routesList.length > 0) {
            <div class="flex items-center w-full sm:w-auto gap-2 mt-4 mb-4">
              <tui-avatar
                tuiThumbnail
                size="l"
                src="@tui.route"
                class="self-center"
                [attr.aria-label]="'routes' | translate"
              />
              <h2 class="text-2xl font-semibold">
                {{ routesList.length }}
                {{ 'routes' | translate | lowercase }}
              </h2>
            </div>

            <div class="grid gap-2 grid-cols-1 md:grid-cols-2 mb-8">
              @for (route of routesList; track route.id) {
                <button
                  class="p-4 rounded-3xl"
                  tuiAppearance="flat"
                  (click.zoneless)="
                    router.navigate([
                      '/area',
                      area.slug,
                      route.crag.slug,
                      route.slug,
                    ])
                  "
                >
                  <div class="flex items-center gap-3 w-full">
                    <app-grade [grade]="route.grade" size="s" />
                    <div class="flex flex-col min-w-0 items-start">
                      <span class="font-bold truncate w-full text-left">
                        {{ route.name }}
                      </span>
                      <span
                        class="text-xs opacity-60 truncate w-full text-left"
                      >
                        {{ route.crag.name }}
                      </span>
                    </div>
                    <tui-icon
                      icon="@tui.chevron-right"
                      class="ml-auto opacity-30"
                    />
                  </div>
                </button>
              }
            </div>
          }

          @if (cragsCount() > 0) {
            <div class="flex items-center w-full sm:w-auto gap-2 mt-4 mb-4">
              <tui-avatar
                tuiThumbnail
                size="l"
                [src]="global.iconSrc()('crag')"
                class="self-center"
                [attr.aria-label]="'crag' | translate"
              />
              <h2 class="text-2xl font-semibold">
                {{ cragsCount() }}
                {{
                  (cragsCount() === 1 ? 'crag' : 'crags')
                    | translate
                    | lowercase
                }}
              </h2>
            </div>
          }

          <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
            @for (crag of crags(); track crag.slug) {
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
                      {{ 'topos' | translate | lowercase }}
                    </div>
                    <app-chart-routes-by-grade
                      (click)="$event.stopPropagation()"
                      [grades]="crag.grades"
                    />
                  </section>
                </div>
              </button>
            } @empty {
              @if (routesList.length === 0) {
                <app-empty-state
                  class="col-span-full"
                  icon="@tui.layout-grid"
                />
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
  protected readonly router = inject(Router);
  protected readonly toast = inject(ToastService);
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly areas = inject(AreasService);
  protected readonly cragsService = inject(CragsService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly translate = inject(TranslateService);
  protected readonly filtersService = inject(FiltersService);
  private readonly seo = inject(SeoService);

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

  protected readonly routesResource = resource({
    params: () => {
      const q = this.query().trim();
      const area = this.global.selectedArea();
      if (q.length >= 3 && area) {
        return { q, areaId: area.id };
      }
      return null;
    },
    loader: async ({ params }: any) => {
      if (!params) return [];
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('routes')
        .select(
          `
          id, 
          name, 
          slug, 
          grade, 
          crag:crags!inner(id, name, slug)
        `,
        )
        .eq('crags.area_id', params.areaId)
        .ilike('name', `%${params.q}%`)
        .limit(20);

      if (error) {
        console.error('[AreaComponent] Error searching routes:', error);
        return [];
      }
      return data as unknown as {
        id: number;
        name: string;
        slug: string;
        grade: number;
        crag: { id: number; name: string; slug: string };
      }[];
    },
  });

  protected readonly routes = computed(() => this.routesResource.value() ?? []);

  readonly filteredCrags = computed(() => {
    const q = normalizeName(this.query());
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const list = this.global.cragsList();

    const textMatches = (c: (typeof list)[number]) =>
      !q ||
      normalizeName(c.name).includes(q) ||
      normalizeName(c.slug).includes(q);

    const gradeMatches = (c: (typeof list)[number]) => {
      const grades = normalizeRoutesByGrade(c.grades);
      return isGradeRangeOverlap(grades, minIdx, maxIdx);
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

  constructor() {
    effect(() => {
      const slug = this.areaSlug();
      this.global.resetDataByPage('area');
      this.global.selectedAreaSlug.set(slug);
    });

    // Update SEO tags when the area data is available
    effect(() => {
      const area = this.global.selectedArea();
      const slug = this.areaSlug();
      if (!area) return;
      const cragsCount = this.filteredCrags().length;
      const description = this.translate.instant('seo.description');
      this.seo.setPage({
        title: area.name,
        description: `${area.name} – ${cragsCount} ${this.translate.instant('crags').toLowerCase()}. ${description}`,
        canonicalUrl: `https://climbeast.com/area/${slug}`,
      });
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
      yes: this.translate.instant('delete'),
      no: this.translate.instant('cancel'),
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

  async onSync8a(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;
    await this.areas.syncAreaWith8a(area.id);
  }

  async viewOnMap(): Promise<void> {
    const area = this.global.selectedArea();
    if (!area) return;

    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('crags')
      .select('latitude, longitude')
      .eq('area_id', area.id)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error || !data || data.length === 0) {
      void this.router.navigateByUrl('/explore');
      return;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    data.forEach((c) => {
      if (c.latitude! < minLat) minLat = c.latitude!;
      if (c.latitude! > maxLat) maxLat = c.latitude!;
      if (c.longitude! < minLng) minLng = c.longitude!;
      if (c.longitude! > maxLng) maxLng = c.longitude!;
    });

    this.global.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });

    void this.router.navigateByUrl('/explore');
  }
}
