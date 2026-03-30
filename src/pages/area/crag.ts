import { isPlatformBrowser } from '@angular/common';
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
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiTabs,
  TuiPulse,
  type TuiConfirmData,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { CragsService } from '../../services/crags.service';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { TourService, TourStep } from '../../services/tour.service';

import { ChartRoutesByGradeComponent } from '../../components/charts/chart-routes-by-grade';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import { TourHintComponent } from '../../components/ui/tour-hint';
import { WeatherForecastComponent } from '../../components/ui/weather-forecast';
import { CragRoutesComponent } from '../../components/crag/crag-routes';
import { CragToposComponent } from '../../components/crag/crag-topos';
import { CragParkingsComponent } from '../../components/crag/crag-parkings';

import {
  AmountByEveryGrade,
  type CragDetail,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { handleErrorToast, mapLocationUrl } from '../../utils';

import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-crag',
  imports: [
    ChartRoutesByGradeComponent,
    SectionHeaderComponent,
    TourHintComponent,
    WeatherForecastComponent,
    CragRoutesComponent,
    CragToposComponent,
    CragParkingsComponent,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiDataList,
    TuiIcon,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiSwipe,
    TuiTabs,
    TuiDropdown,
    TuiPulse,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section
        (tuiSwipe)="onSwipe($event)"
        (touchstart.zoneless)="lastTouchTarget = $event.target"
        class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full"
      >
        @let canEditAsAdmin = global.canEditAsAdmin();
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
              @if (global.canEditCrag()) {
                <div actionButtons class="flex gap-2">
                  <button
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    tuiIconButton
                    type="button"
                    class="!rounded-full"
                    (click.zoneless)="openEditCrag()"
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
              @let lang = global.selectedLanguage();
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
                <tui-notification appearance="warning">
                  {{ warn }}
                </tui-notification>
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
                      [attr.aria-label]="'openGoogleMaps' | translate"
                    >
                      {{ 'openGoogleMaps' | translate }}
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

          @if (visibleTabs().length > 1) {
            <tui-tabs
              [activeItemIndex]="activeTabIndex()"
              (activeItemIndexChange)="activeTabIndex.set($event)"
              class="mt-6"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() &&
                (tourService.step() === TourStep.CRAG ||
                  tourService.step() === TourStep.CRAG_TOPOS ||
                  tourService.step() === TourStep.CRAG_PARKINGS ||
                  tourService.step() === TourStep.CRAG_WEATHER)
              "
              tuiDropdownDirection="top"
            >
              @for (tabIdx of visibleTabs(); track tabIdx) {
                <button tuiTab class="relative">
                  @if (
                    tourService.isActive() &&
                    ((tabIdx === 0 && tourService.step() === TourStep.CRAG) ||
                      (tabIdx === 1 &&
                        tourService.step() === TourStep.CRAG_TOPOS) ||
                      (tabIdx === 2 &&
                        tourService.step() === TourStep.CRAG_PARKINGS) ||
                      (tabIdx === 3 &&
                        tourService.step() === TourStep.CRAG_WEATHER))
                  ) {
                    <tui-pulse />
                  }
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
            @switch (currentTab) {
              @case (0) {
                <app-crag-routes [crag]="c" />
              }
              @case (1) {
                <app-crag-topos
                  [crag]="c"
                  [areaSlug]="areaSlug()"
                  [cragSlug]="cragSlug()"
                />
              }
              @case (2) {
                <app-crag-parkings [crag]="c" />
              }
              @case (3) {
                <app-weather-forecast
                  [coords]="{ lat: c.latitude, lng: c.longitude }"
                />
              }
            }
          </div>
        } @else {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="
          (tourService.step() === TourStep.CRAG
            ? 'tour.crag.routesDescription'
            : tourService.step() === TourStep.CRAG_TOPOS
              ? 'tour.crag.toposDescription'
              : tourService.step() === TourStep.CRAG_PARKINGS
                ? 'tour.crag.parkingsDescription'
                : 'tour.crag.weatherDescription'
          ) | translate
        "
        (next)="tourService.next()"
        (skip)="tourService.finish()"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class CragComponent {
  protected readonly global = inject(GlobalData);
  protected readonly activeTabIndex = signal(0);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly cragsService = inject(CragsService);
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  private readonly seo = inject(SeoService);

  protected readonly mapLocationUrl = mapLocationUrl;

  protected lastTouchTarget: EventTarget | null = null;
  protected onSwipe(event: TuiSwipeEvent): void {
    if (
      this.lastTouchTarget instanceof HTMLElement &&
      (this.lastTouchTarget.closest('app-pyramid') ||
        this.lastTouchTarget.closest('app-routes-table'))
    ) {
      return;
    }
    const direction = event.direction;
    const currentIndex = this.activeTabIndex();
    const maxIndex = this.visibleTabs().length - 1;
    if (direction === 'left' && currentIndex < maxIndex) {
      this.activeTabIndex.set(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      this.activeTabIndex.set(currentIndex - 1);
    }
  }

  readonly showToposTab = computed(() => {
    const canEditAsAdmin = this.global.canEditAsAdmin();
    const canEditAsAllowedEquipper =
      this.global.areaAdminPermissions()[this.cragDetail()?.area_id ?? -1];
    return (
      (this.cragDetail()?.topos?.length ?? 0) > 0 ||
      canEditAsAdmin ||
      canEditAsAllowedEquipper
    );
  });
  readonly showParkingsTab = computed(() => {
    const canEditAsAdmin = this.global.canEditAsAdmin();
    const canEditAsAllowedEquipper =
      this.global.areaAdminPermissions()[this.cragDetail()?.area_id ?? -1];
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
    const list = this.global.cragsList() || [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly cragDetail = computed<CragDetail | null>(() => {
    const c = this.global.cragDetailResource.value();
    if (!c) return null;

    // Compute grades from routes
    const routes = this.global.cragRoutesResource.value() ?? [];
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
    const routes = this.global.cragRoutesResource.value() ?? [];
    return routes.length;
  });

  constructor() {
    effect(() => {
      const step = this.tourService.step();
      const tabs = this.visibleTabs();
      if (!tabs.length) return;

      if (step === TourStep.CRAG) {
        if (tabs.includes(0)) this.activeTabIndex.set(tabs.indexOf(0));
      } else if (step === TourStep.CRAG_TOPOS) {
        if (tabs.includes(1)) this.activeTabIndex.set(tabs.indexOf(1));
      } else if (step === TourStep.CRAG_PARKINGS) {
        if (tabs.includes(2)) this.activeTabIndex.set(tabs.indexOf(2));
      } else if (step === TourStep.CRAG_WEATHER) {
        if (tabs.includes(3)) this.activeTabIndex.set(tabs.indexOf(3));
      }
    });

    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      this.global.resetDataByPage('crag');
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
    });

    effect(() => {
      const crag = this.cragDetail();
      const area = this.global.selectedArea();
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      if (!crag || !area) return;
      const routesCount = this.routesCount();
      const lang = this.global.selectedLanguage();
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
  }

  async viewOnMap(lat: number, lng: number): Promise<void> {
    const area = this.global.selectedArea();
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

    this.global.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });
    void this.router.navigateByUrl('/explore');
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const c = this.cragDetail();
    if (!c) return;
    this.cragsService.toggleCragLike(c.id);
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
      const ok = await this.cragsService.delete(c.id);
      if (ok) {
        await this.router.navigateByUrl(`/area/${c.area_slug}`);
      }
    } catch (e) {
      const error = e as Error;
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
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
