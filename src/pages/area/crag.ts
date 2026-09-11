import {
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/core';

import {
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiTabs, type TuiConfirmData } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { CragRoutesDataService } from '../../services/crag-routes-data.service';
import { CragsService } from '../../services/crags.service';
import { LanguageService } from '../../services/language.service';
import { MapDataService } from '../../services/map-data.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { SeoService } from '../../services/seo.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { VisitedCragsService } from '../../services/visited-crags.service';

import { ChartRoutesByGradeComponent } from '../../components/charts/chart-routes-by-grade';

import { CragParkingsComponent } from '../../components/crag/crag-parkings';
import { CragRoutesComponent } from '../../components/crag/crag-routes';
import { CragToposComponent } from '../../components/crag/crag-topos';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import { WeatherForecastComponent } from '../../components/ui/weather-forecast';

import {
  AmountByEveryGrade,
  type CragDetail,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { handleErrorToast, mapLocationUrl } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-crag',
  imports: [
    ChartRoutesByGradeComponent,
    CragParkingsComponent,
    CragRoutesComponent,
    CragToposComponent,
    SectionHeaderComponent,
    TranslatePipe,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiIcon,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,

    TuiTabs,
    WeatherForecastComponent,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full">
        @let canEditAsAdmin = authState.canEditAsAdmin();
        @if (cragDetail(); as c) {
          <ng-template #cragSwitcher>
            <tui-data-list>
              @for (cragItem of sortedCrags(); track cragItem.id) {
                <button
                  tuiOption
                  new
                  (click)="
                    router.navigate(['/area', areaSlug(), cragItem.slug])
                  "
                >
                  {{ cragItem.name }}
                </button>
              }
            </tui-data-list>
          </ng-template>

          <div class="mb-6">
            <app-section-header
              [title]="c.name"
              [liked]="c.liked"
              [titleDropdown]="cragSwitcher"
              (toggleLike)="onToggleLike()"
            >
              @let canAreaAdmin = authState.areaAdminPermissions()[c.area_id];
              @if (authState.canEditCrag()) {
                <div actionButtons class="flex gap-2">
                  <button
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    tuiIconButton
                    type="button"
                    class="rounded-full!"
                    (click.zoneless)="openEditCrag()"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (canEditAsAdmin || canAreaAdmin) {
                    <button
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      tuiIconButton
                      type="button"
                      class="rounded-full!"
                      (click.zoneless)="deleteCrag()"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                </div>
              }
            </app-section-header>
          </div>

          <div class="flex flex-col md:flex-row md:justify-between gap-4">
            <div class="flex flex-col gap-3 grow">
              @let lang = languageService.selectedLanguage();
              @let desc = lang === 'es' ? c.description_es : c.description_en;
              @let warn = lang === 'es' ? c.warning_es : c.warning_en;

              @if (desc) {
                <p class="text-lg">{{ desc }}</p>
              }

              @if (c.approach) {
                <div class="flex w-fit items-center gap-1 opacity-70">
                  <tui-icon icon="@tui.footprints" />
                  <span class="text-lg font-medium whitespace-nowrap">
                    {{ c.approach }}
                    min.
                  </span>
                </div>
              }

              @if (warn) {
                <div tuiNotification appearance="warning">
                  {{ warn }}
                </div>
              }

              <div
                class="flex flex-row flex-wrap justify-between items-center gap-2"
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
                      {{ 'viewOnMap' | translate }}
                    </button>
                    <button
                      appearance="flat"
                      size="m"
                      tuiButton
                      type="button"
                      [iconStart]="'/image/google-maps.svg'"
                      class="[--tui-icon-size:1.25rem]"
                      (click.zoneless)="
                        openExternal(
                          mapLocationUrl({
                            latitude: c.latitude,
                            longitude: c.longitude,
                          })
                        )
                      "
                      [attr.aria-label]="'openGoogleMaps' | translate"
                    >
                      {{ 'openGoogleMaps' | translate }}
                    </button>
                  </div>
                }
                @defer (on viewport; hydrate on viewport) {
                  <app-chart-routes-by-grade
                    class="md:hidden! self-end"
                    [grades]="c.grades"
                  />
                } @placeholder {
                  <div class="h-20 md:hidden! flex items-center justify-center">
                    <tui-loader size="s" />
                  </div>
                }
              </div>
            </div>
            @defer (on viewport; hydrate on viewport) {
              <app-chart-routes-by-grade
                class="hidden md:block self-end"
                [grades]="c.grades"
              />
            } @placeholder {
              <div class="hidden md:flex h-20 items-center justify-center">
                <tui-loader size="s" />
              </div>
            }
          </div>

          @if (visibleTabs().length > 1) {
            <tui-tabs
              [activeItemIndex]="activeTabIndex()"
              (activeItemIndexChange)="activeTabIndex.set($event)"
              class="mt-6"
            >
              @for (tabIdx of visibleTabs(); track tabIdx) {
                <button tuiTab class="relative">
                  {{
                    (tabIdx === 0
                      ? 'routes'
                      : tabIdx === 1
                        ? 'topos'
                        : tabIdx === 2
                          ? 'parkings'
                          : 'weather.title'
                    ) | translate
                  }}
                </button>
              }
            </tui-tabs>
          }

          <div class="mt-6">
            @let currentTab = visibleTabs()[activeTabIndex()];
            @if (loadedTabs().has(0)) {
              <div
                [hidden]="currentTab !== 0"
                [class.hidden]="currentTab !== 0"
              >
                <app-crag-routes [crag]="c" />
              </div>
            }
            @if (loadedTabs().has(1)) {
              <div
                [hidden]="currentTab !== 1"
                [class.hidden]="currentTab !== 1"
              >
                @defer (on viewport; hydrate on viewport) {
                  <app-crag-topos
                    [crag]="c"
                    [areaSlug]="areaSlug()"
                    [cragSlug]="cragSlug()"
                  />
                } @placeholder {
                  <div class="flex items-center justify-center py-16 min-h-32">
                    <tui-loader size="l" />
                  </div>
                }
              </div>
            }
            @if (loadedTabs().has(2)) {
              <div
                [hidden]="currentTab !== 2"
                [class.hidden]="currentTab !== 2"
              >
                @defer (on viewport; hydrate on viewport) {
                  <app-crag-parkings [crag]="c" />
                } @placeholder {
                  <div class="flex items-center justify-center py-16 min-h-32">
                    <tui-loader size="l" />
                  </div>
                }
              </div>
            }
            @if (loadedTabs().has(3)) {
              <div
                [hidden]="currentTab !== 3"
                [class.hidden]="currentTab !== 3"
              >
                @defer (on viewport; hydrate on viewport) {
                  <app-weather-forecast
                    [coords]="{ lat: c.latitude, lng: c.longitude }"
                  />
                } @placeholder {
                  <div class="flex items-center justify-center py-16 min-h-32">
                    <tui-loader size="l" />
                  </div>
                }
              </div>
            }
          </div>
        } @else {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex grow min-h-0' },
})
export class CragComponent {
  protected readonly authState = inject(AuthStateService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly languageService = inject(LanguageService);
  protected readonly cragRoutesData = inject(CragRoutesDataService);
  protected readonly mapData = inject(MapDataService);
  protected readonly activeTabIndex = signal(0);
  protected readonly loadedTabs = signal<Set<number>>(new Set([0]));
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly cragsService = inject(CragsService);
  protected readonly isBrowser = inject(IS_BROWSER);
  protected readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);
  protected readonly dialogs = inject(TuiDialogService);
  private readonly visitedCragsService = inject(VisitedCragsService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  protected readonly queryParams = toSignal(this.route.queryParams);

  protected readonly mapLocationUrl = mapLocationUrl;

  readonly showToposTab = computed(() => {
    const c = this.cragDetail();
    if (!c) return false;

    const canEditAsAdmin = this.authState.canEditAsAdmin();
    const canEditAsAllowedEquipper =
      this.authState.areaAdminPermissions()[c.area_id];

    const isSecret = !c.is_public && (c.price === null || c.price === 0);
    const hasAccess =
      c.is_public || c.purchased || canEditAsAdmin || canEditAsAllowedEquipper;

    if (isSecret && !hasAccess) {
      return false;
    }

    return (
      (c.topos?.length ?? 0) > 0 || canEditAsAdmin || canEditAsAllowedEquipper
    );
  });
  readonly showParkingsTab = computed(() => {
    const canEditAsAdmin = this.authState.canEditAsAdmin();
    const canEditAsAllowedEquipper =
      this.authState.areaAdminPermissions()[this.cragDetail()?.area_id ?? -1];
    return (
      (this.cragDetail()?.parkings?.length ?? 0) > 0 ||
      canEditAsAdmin ||
      canEditAsAllowedEquipper
    );
  });

  readonly showWeatherTab = computed(() => {
    const c = this.cragDetail();
    return !!(c?.latitude && c?.longitude);
  });

  readonly visibleTabs = computed(() => {
    const tabs = [0]; // Routes tab is always visible
    if (this.showToposTab()) tabs.push(1);
    if (this.showParkingsTab()) tabs.push(2);
    if (this.showWeatherTab()) tabs.push(3);
    return tabs;
  });

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();

  readonly loading = this.cragsService.loading;
  protected readonly sortedCrags = computed(() => {
    const list = this.outdoorData.cragsList() || [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly cragDetail = computed<CragDetail | null>(() => {
    const c = this.outdoorData.cragDetail();
    if (!c) return null;

    // Compute grades from routes
    const routes = this.cragRoutesData.cragRoutes() ?? [];
    const gradesVal: AmountByEveryGrade = {};
    for (const r of routes) {
      if (r.grade >= 0) {
        const g = r.grade as VERTICAL_LIFE_GRADES;
        gradesVal[g] = (gradesVal[g] ?? 0) + 1;
      }
    }

    return {
      ...c,
      grades: gradesVal,
    };
  });

  protected readonly routesCount = computed(() => {
    const detail = this.cragDetail();
    const routes = this.cragRoutesData.cragRoutes();
    return routes
      ? routes.length
      : Object.values(detail?.grades || {}).reduce(
          (a, b) => (a ?? 0) + (b ?? 0),
          0,
        );
  });

  constructor() {
    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      this.outdoorData.selectCrag(aSlug, cSlug);
      untracked(() => {
        const currentTab = this.visibleTabs()[this.activeTabIndex()] ?? 0;
        this.loadedTabs.set(new Set([currentTab]));
      });
    });

    effect(() => {
      const currentTab = this.visibleTabs()[this.activeTabIndex()];
      if (currentTab !== undefined) {
        this.loadedTabs.update((set) => {
          if (set.has(currentTab)) return set;
          const next = new Set(set);
          next.add(currentTab);
          return next;
        });
      }
    });

    effect(() => {
      if (!this.isBrowser) return;
      const areaLoading = this.outdoorData.areasListResource.isLoading();
      const cragLoading = this.outdoorData.cragDetailResource.isLoading();
      if (areaLoading || cragLoading) return;
      const area = this.outdoorData.selectedArea();
      const crag = this.outdoorData.cragDetail();
      if (!area || !crag) {
        this.router.navigateByUrl('/page-not-found');
      }
    });

    effect(() => {
      const crag = this.cragDetail();
      const area = this.outdoorData.selectedArea();
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      if (!crag || !area) return;
      const routesCount = this.routesCount();
      const lang = this.languageService.selectedLanguage();
      const desc = lang === 'es' ? crag.description_es : crag.description_en;
      const appDescription = this.translate.instant('seo.description');
      const description = desc
        ? `${desc} – ${routesCount} ${this.translate.instant('routes').toLowerCase()}.`
        : `${crag.name} – ${area.name}. ${routesCount} ${this.translate.instant('routes').toLowerCase()}. ${appDescription}`;
      this.seo.setPage({
        title: `${crag.name} – ${area.name}`,
        description,
        canonicalUrl: `https://climbeast.com/area/${aSlug}/${cSlug}`,
      });
    });

    effect(() => {
      const tabs = this.visibleTabs();
      if (this.activeTabIndex() >= tabs.length && tabs.length > 0) {
        this.activeTabIndex.set(0);
      }
    });

    effect(() => {
      const params = this.queryParams();
      const tabs = this.visibleTabs();
      if (!params || !tabs.length) return;

      const tab = params['tab'];
      if (tab === 'topos' && tabs.includes(1)) {
        this.activeTabIndex.set(tabs.indexOf(1));
      } else if (tab === 'routes' && tabs.includes(0)) {
        this.activeTabIndex.set(tabs.indexOf(0));
      } else if (tab === 'parkings' && tabs.includes(2)) {
        this.activeTabIndex.set(tabs.indexOf(2));
      } else if (tab === 'weather' && tabs.includes(3)) {
        this.activeTabIndex.set(tabs.indexOf(3));
      }
    });

    effect(() => {
      const crag = this.cragDetail();
      const area = this.outdoorData.selectedArea();
      if (crag && area) {
        this.visitedCragsService.addVisitedCrag({
          id: crag.id,
          name: crag.name,
          slug: crag.slug,
          area_slug: area.slug,
        });
      }
    });
  }

  async viewOnMap(lat: number, lng: number): Promise<void> {
    const area = this.outdoorData.selectedArea();
    let minLat = lat;
    let maxLat = lat;
    let minLng = lng;
    let maxLng = lng;

    if (area) {
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('crags')
        .select('latitude, longitude')
        .eq('area_id', area.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (data) {
        data.forEach((c) => {
          if (c.latitude! < minLat) minLat = c.latitude!;
          if (c.latitude! > maxLat) maxLat = c.latitude!;
          if (c.longitude! < minLng) minLng = c.longitude!;
          if (c.longitude! > maxLng) maxLng = c.longitude!;
        });
      }
    }

    this.mapData.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });
    void this.router.navigateByUrl('/explore');
  }

  onToggleLike(): void {
    if (!this.isBrowser) return;
    const c = this.cragDetail();
    if (!c) return;
    this.cragsService.toggleCragLike(c.id);
  }

  async deleteCrag(): Promise<void> {
    const c = this.cragDetail();
    if (!c) return;
    if (!this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get(['crags.deleteTitle', 'crags.deleteConfirm'], {
        name: c.name,
      }),
    );
    const title = t['crags.deleteTitle'];
    const message = t['crags.deleteConfirm'];
    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('delete'),
      no: this.translate.instant('cancel'),
      appearance: 'primary-destructive',
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
      const ok = await this.cragsService.delete(c.id);
      if (ok) {
        await this.router.navigateByUrl(`/area/${c.area_slug}`);
      }
    } catch (error) {
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

  protected openExternal(url: string): void {
    if (this.isBrowser) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
