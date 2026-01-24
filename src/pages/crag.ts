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
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiHint,
  TuiIcon,
  TuiLabel,
  TuiLoader,
  TuiNotification,
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
  AmountByEveryGrade,
  ClimbingKinds,
  type CragDetail,
  ORDERED_GRADE_VALUES,
  ParkingDto,
  RouteWithExtras,
  type TopoListItem,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import {
  CragsService,
  FiltersService,
  GlobalData,
  ParkingsService,
  RoutesService,
  SupabaseService,
  ToastService,
  ToposService,
} from '../services';

import { TopoImagePipe } from '../pipes';

import {
  ChartRoutesByGradeComponent,
  EmptyStateComponent,
  RoutesTableComponent,
  SectionHeaderComponent,
} from '../components';

import { handleErrorToast, mapLocationUrl } from '../utils';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    AsyncPipe,
    ChartRoutesByGradeComponent,
    EmptyStateComponent,
    FormsModule,
    LowerCasePipe,
    RouterLink,
    RoutesTableComponent,
    SectionHeaderComponent,
    TopoImagePipe,
    TranslatePipe,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiHeader,
    TuiHint,
    TuiIcon,
    TuiLabel,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiTextfield,
    TuiTitle,
    TuiAppearance,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4">
        @let isMobile = global.isMobile();
        @let isAdmin = global.isAdmin();
        @if (cragDetail(); as c) {
          <div class="mb-4 flex items-center justify-between gap-2">
            <app-section-header
              class="w-full"
              [title]="c.name"
              [liked]="c.liked"
              (toggleLike)="onToggleLike()"
            />
            @if (isAdmin) {
              <button
                size="s"
                appearance="neutral"
                iconStart="@tui.square-pen"
                tuiIconButton
                type="button"
                class="!rounded-full"
                [tuiHint]="isMobile ? null : ('actions.edit' | translate)"
                (click.zoneless)="openEditCrag()"
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
                [tuiHint]="isMobile ? null : ('actions.delete' | translate)"
                (click.zoneless)="deleteCrag()"
              >
                {{ 'actions.delete' | translate }}
              </button>
            }
          </div>

          <div class="flex flex-col md:flex-row md:justify-between gap-4">
            <div class="flex flex-col gap-3 grow">
              @let lang = global.selectedLanguage();
              @let desc = lang === 'es' ? c.description_es : c.description_en;
              @let warn = lang === 'es' ? c.warning_es : c.warning_en;

              @if (desc) {
                <p class="text-lg">{{ desc }}</p>
              }

              @if (c.approach) {
                <div
                  class="flex w-fit items-center gap-1 opacity-70"
                  [tuiHint]="isMobile ? null : ('labels.approach' | translate)"
                >
                  <tui-icon icon="@tui.footprints" />
                  <span class="text-lg font-medium whitespace-nowrap">
                    {{ c.approach }}
                    min.
                  </span>
                </div>
              }

              @if (warn) {
                <tui-notification appearance="warning">
                  {{ warn }}
                </tui-notification>
              }

              <div
                class="flex flex-row flex-wrap justify-between items-start gap-2"
              >
                @if (c.latitude && c.longitude) {
                  <div class="flex flex-col md:flex-row gap-2 items-start">
                    <button
                      tuiButton
                      appearance="flat"
                      size="m"
                      type="button"
                      (click.zoneless)="viewOnMap(c.latitude, c.longitude)"
                      [iconStart]="'@tui.map-pin'"
                    >
                      {{ 'actions.viewOnMap' | translate }}
                    </button>
                    <button
                      appearance="flat"
                      size="m"
                      tuiButton
                      type="button"
                      class="lw-icon-50"
                      [iconStart]="'/image/google-maps.svg'"
                      (click.zoneless)="
                        openExternal(
                          mapLocationUrl({
                            latitude: c.latitude,
                            longitude: c.longitude,
                          })
                        )
                      "
                      [attr.aria-label]="'actions.openGoogleMaps' | translate"
                    >
                      {{ 'actions.openGoogleMaps' | translate }}
                    </button>
                  </div>
                }
                <app-chart-routes-by-grade
                  class="md:hidden self-end"
                  [grades]="c.grades"
                />
              </div>
            </div>
            <app-chart-routes-by-grade
              class="hidden md:block self-end"
              [grades]="c.grades"
            />
          </div>

          @if (c.parkings.length || isAdmin) {
            <div class="mt-6">
              <div class="flex items-center justify-between gap-2 mb-4">
                <div class="flex items-center gap-2">
                  <tui-avatar
                    tuiThumbnail
                    size="l"
                    src="@tui.parking-square"
                    class="self-center"
                    [attr.aria-label]="'labels.parkings' | translate"
                  />
                  <h2 class="text-2xl font-semibold">
                    {{ 'labels.parkings' | translate }}
                  </h2>
                </div>
                @if (isAdmin) {
                  <div class="flex flex-wrap gap-2">
                    <button
                      tuiButton
                      appearance="textfield"
                      size="s"
                      type="button"
                      (click.zoneless)="openLinkParking()"
                      [iconStart]="'@tui.link'"
                    >
                      {{ 'actions.link' | translate }}
                    </button>
                    <button
                      tuiButton
                      appearance="textfield"
                      size="s"
                      type="button"
                      (click.zoneless)="openCreateParking()"
                      [iconStart]="'@tui.plus'"
                    >
                      {{ 'actions.new' | translate }}
                    </button>
                  </div>
                }
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (p of c.parkings; track p.id) {
                  <div
                    tuiAppearance="flat"
                    class="p-4 rounded-3xl flex flex-col justify-between"
                  >
                    <div class="flex flex-col gap-3">
                      <div class="flex items-start justify-between gap-2 ">
                        <div class="flex flex-wrap gap-2">
                          <span tuiTitle class="!text-lg">{{ p.name }}</span>
                        </div>

                        @if (p.size) {
                          <div
                            class="flex flex-nowrap items-center gap-1 opacity-80 whitespace-nowrap"
                            [tuiHint]="
                              isMobile ? null : ('labels.capacity' | translate)
                            "
                          >
                            <tui-icon icon="@tui.car" />
                            <span class="text-lg"> x {{ p.size }} </span>
                          </div>
                        }

                        @if (isAdmin) {
                          <div class="flex gap-1">
                            <button
                              size="s"
                              appearance="neutral"
                              iconStart="@tui.square-pen"
                              tuiIconButton
                              type="button"
                              class="!rounded-full"
                              (click.zoneless)="openEditParking(p)"
                              [tuiHint]="'actions.edit' | translate"
                            >
                              {{ 'actions.edit' | translate }}
                            </button>
                            <button
                              size="s"
                              appearance="negative"
                              iconStart="@tui.unlink"
                              tuiIconButton
                              type="button"
                              class="!rounded-full"
                              [tuiHint]="'actions.unlink' | translate"
                              (click.zoneless)="removeParking(p)"
                            >
                              {{ 'actions.unlink' | translate }}
                            </button>
                          </div>
                        }
                      </div>

                      @if (p.latitude && p.longitude) {
                        <div class="flex flex-wrap gap-2 mt-2">
                          <button
                            tuiButton
                            appearance="secondary"
                            size="s"
                            type="button"
                            class="!rounded-full"
                            (click.zoneless)="
                              viewOnMap(p.latitude, p.longitude)
                            "
                            [iconStart]="'@tui.map-pin'"
                          >
                            {{ 'actions.viewOnMap' | translate }}
                          </button>
                          <button
                            appearance="secondary"
                            size="s"
                            tuiButton
                            type="button"
                            class="!rounded-full lw-icon-50"
                            [iconStart]="'/image/google-maps.svg'"
                            (click.zoneless)="
                              openExternal(
                                mapLocationUrl({
                                  latitude: p.latitude,
                                  longitude: p.longitude,
                                })
                              )
                            "
                            [attr.aria-label]="
                              'actions.openGoogleMaps' | translate
                            "
                          >
                            {{ 'actions.openGoogleMaps' | translate }}
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @let toposCount = c.topos.length;
          <div class="mt-6">
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
                  {{ toposCount }}
                  {{
                    'labels.' + (toposCount === 1 ? 'topo' : 'topos')
                      | translate
                      | lowercase
                  }}
                </h2>
              </div>
              @if (isAdmin) {
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  (click.zoneless)="openCreateTopo()"
                  [iconStart]="'@tui.plus'"
                >
                  {{ 'actions.new' | translate }}
                </button>
              }
            </div>
            <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
              @for (t of topos(); track t.id) {
                <button
                  class="p-6 rounded-3xl"
                  tuiAppearance="outline"
                  (click.zoneless)="
                    router.navigate([
                      '/area',
                      areaSlug(),
                      cragSlug(),
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
                        <div class="flex items-center justify-between gap-2">
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
          </div>
          <div class="flex items-center justify-between gap-2 mb-4 mt-6">
            <div class="flex items-center gap-2">
              <tui-avatar
                tuiThumbnail
                size="l"
                src="@tui.route"
                class="self-center"
                [attr.aria-label]="'labels.routes' | translate"
              />
              <h2 class="text-2xl font-semibold">
                {{ routesCount() }}
                {{ 'labels.routes' | translate | lowercase }}
              </h2>
            </div>
            @if (isAdmin) {
              <button
                tuiButton
                appearance="textfield"
                size="s"
                type="button"
                (click.zoneless)="openCreateRoute()"
                [iconStart]="'@tui.plus'"
              >
                {{ 'actions.new' | translate }}
              </button>
            }
          </div>

          <div class="mb-4 flex items-end gap-2">
            <tui-textfield class="grow block" tuiTextfieldSize="l">
              <label tuiLabel for="routes-search">{{
                'labels.searchPlaceholder' | translate
              }}</label>
              <input
                tuiTextfield
                #routesSearch
                id="routes-search"
                autocomplete="off"
                [value]="query()"
                (input.zoneless)="onQuery(routesSearch.value)"
              />
            </tui-textfield>
            <tui-badged-content>
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
                [tuiHint]="isMobile ? null : ('labels.filters' | translate)"
                (click.zoneless)="openFilters()"
              ></button>
            </tui-badged-content>
          </div>

          <app-routes-table [data]="filteredRoutes()" />
        } @else {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class CragComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  private readonly routesService = inject(RoutesService);
  private readonly parkingsService = inject(ParkingsService);
  private readonly cragsService = inject(CragsService);
  private readonly toposService = inject(ToposService);
  private readonly filtersService = inject(FiltersService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly mapLocationUrl = mapLocationUrl;

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.global.areaListGradeRange;
  readonly selectedCategories = this.global.areaListCategories;

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.selectedCategories().length > 0 ||
      this.query().trim().length > 0
    );
  });

  readonly filteredRoutes = computed(() => {
    const q = this.query().trim().toLowerCase();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const categories = this.selectedCategories();
    const list = this.global.cragRoutesResource.value() ?? [];

    const textMatches = (r: RouteWithExtras) => {
      if (!q) return true;
      const nameMatch = r.name.toLowerCase().includes(q);
      const gradeLabel =
        VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      const gradeMatch = gradeLabel?.toLowerCase().includes(q);
      return nameMatch || gradeMatch;
    };

    const gradeMatches = (r: RouteWithExtras) => {
      const label = VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      if (!label) return true;
      return (allowedLabels as readonly string[]).includes(label);
    };

    const categoryMatches = (r: RouteWithExtras) => {
      if (categories.length === 0) return true;
      const kind = r.climbing_kind;
      if (!kind) return true;
      // 0=Sport, 1=Boulder, 2=Multipitch (from FilterDialog)
      if (categories.includes(0) && kind === ClimbingKinds.SPORT) return true;
      if (categories.includes(1) && kind === ClimbingKinds.BOULDER) return true;
      if (categories.includes(2) && kind === ClimbingKinds.MULTIPITCH)
        return true;
      return false;
    };

    return list.filter(
      (r) => textMatches(r) && gradeMatches(r) && categoryMatches(r),
    );
  });

  readonly loading = this.cragsService.loading;
  protected readonly cragDetail = computed<CragDetail | null>(() => {
    const c = this.global.cragDetailResource.value();
    if (!c) return null;

    // Compute grades from routes
    const routes = this.global.cragRoutesResource.value() ?? [];
    const gradesVal: AmountByEveryGrade = {};
    for (const r of routes) {
      if (r.grade >= 0) {
        const g = r.grade as VERTICAL_LIFE_GRADES; // Cast number to enum
        gradesVal[g] = (gradesVal[g] ?? 0) + 1;
      }
    }

    // Return CragDetail
    return {
      ...c,
      grades: gradesVal,
    };
  });

  protected readonly routesCount = computed(() => this.filteredRoutes().length);

  protected readonly topos = computed(() => {
    const c = this.cragDetail();
    if (!c) return [];
    return c.topos;
  });

  constructor() {
    // Synchronize the selected area /crag in global state from route
    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      this.global.resetDataByPage('crag');
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
    });
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters({
      showShade: false,
    });
  }

  openCreateRoute(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.routesService.openRouteForm({ cragId: c.id });
  }

  openCreateParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.parkingsService.openParkingForm({
      cragId: c.id,
      defaultLocation:
        c.latitude && c.longitude
          ? { lat: c.latitude, lng: c.longitude }
          : undefined,
    });
  }

  openLinkParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    const existingParkingIds = c.parkings.map((p) => p.id);
    this.parkingsService.openLinkParkingForm({
      cragId: c.id,
      existingParkingIds,
    });
  }

  openEditParking(parking: ParkingDto): void {
    this.parkingsService.openParkingForm({
      parkingData: parking,
      cragId: this.cragDetail()?.id,
    });
  }

  removeParking(parking: ParkingDto): void {
    const c = this.cragDetail();
    if (!c || !isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.parkings.unlinkTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.parkings.unlinkConfirm', {
            name: parking.name,
          }),
          yes: this.translate.instant('actions.unlink'),
          no: this.translate.instant('actions.cancel'),
          appearance: 'accent',
        } as TuiConfirmData,
      }),
    ).then((confirmed) => {
      if (confirmed) {
        this.parkingsService
          .removeParkingFromCrag(c.id, parking.id)
          .catch((err) => handleErrorToast(err, this.toast));
      }
    });
  }

  viewOnMap(lat: number, lng: number): void {
    const zoom = 13;
    this.global.mapBounds.set({
      south_west_latitude: lat,
      south_west_longitude: lng,
      north_east_latitude: lat,
      north_east_longitude: lng,
      zoom,
    });
    void this.router.navigateByUrl('/explore');
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const c = this.cragDetail();
    if (!c) return;
    // Optimistic update not possible easily with computed resource without invalidation
    // We just call the API
    this.cragsService.toggleCragLike(c.id).then(() => {
      // Option: reload resource
      // this.global.cragDetailResource.reload();
    });
  }

  async deleteCrag(): Promise<void> {
    const c = this.cragDetail();
    if (!c) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const t = await firstValueFrom(
      this.translate.get(['crags.deleteTitle', 'crags.deleteConfirm'], {
        name: c.name,
      }),
    );
    const title = t['crags.deleteTitle'];
    const message = t['crags.deleteConfirm'];
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
    );
    if (!confirmed) return;
    try {
      const ok = await this.cragsService.delete(c.id);
      if (ok) {
        await this.router.navigateByUrl(`/area/${c.area_slug}`);
      }
    } catch (e) {
      const error = e as Error;
      console.error('[CragComponent] Error deleting crag:', error);
      handleErrorToast(error, this.toast);
    }
  }

  openEditCrag(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.cragsService.openCragForm({
      cragData: {
        id: c.id,
        area_id: c.area_id!,
        name: c.name,
        slug: c.slug,
        latitude: c.latitude,
        longitude: c.longitude,
        approach: c.approach,
        description_es: c.description_es,
        description_en: c.description_en,
        warning_es: c.warning_es,
        warning_en: c.warning_en,
      },
    });
  }

  openCreateTopo(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.toposService.openTopoForm({ cragId: c.id });
  }

  protected openExternal(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
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
