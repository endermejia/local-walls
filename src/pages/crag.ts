import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  effect,
  InputSignal,
  computed,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiAvatar,
  TUI_CONFIRM,
  type TuiConfirmData,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import {
  TuiLoader,
  TuiTitle,
  TuiButton,
  TuiHint,
  TuiNotification,
  TuiIcon,
  TuiTextfield,
  TuiLabel,
} from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  ChartRoutesByGradeComponent,
  EmptyStateComponent,
  RoutesTableComponent,
  SectionHeaderComponent,
} from '../components';
import {
  CragsService,
  GlobalData,
  ParkingsService,
  AscentsService,
  FiltersService,
  ToastService,
} from '../services';
import {
  type CragDetail,
  RouteWithExtras,
  type TopoListItem,
  AmountByEveryGrade,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
  ORDERED_GRADE_VALUES,
  ParkingDto,
} from '../models';
import { mapLocationUrl } from '../utils';
import { CragFormComponent } from './crag-form';
import { RouteFormComponent } from './route-form';
import ParkingFormComponent from './parking-form';
import LinkParkingFormComponent from './link-parking-form';
import TopoFormComponent from './topo-form';
import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    EmptyStateComponent,
    ChartRoutesByGradeComponent,
    RoutesTableComponent,
    SectionHeaderComponent,
    TranslatePipe,
    TuiCardLarge,
    TuiHeader,
    TuiLoader,
    TuiSurface,
    TuiTitle,
    TuiButton,
    TuiHint,
    FormsModule,
    TuiNotification,
    TuiAvatar,
    LowerCasePipe,
    TuiIcon,
    TuiTextfield,
    TuiLabel,
    TuiBadgedContent,
    TuiBadgeNotification,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (cragDetail(); as c) {
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="c.name"
            [liked]="c.liked"
            (toggleLike)="onToggleLike()"
          />
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
              [tuiHint]="
                global.isMobile() ? null : ('actions.delete' | translate)
              "
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
                [tuiHint]="
                  global.isMobile() ? null : ('labels.approach' | translate)
                "
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
              class="flex flex-row justify-between items-start gap-2 mt-auto"
            >
              <div
                class="flex flex-wrap md:flex-nowrap gap-2 md:gap-4 items-center"
              >
                @if (c.latitude && c.longitude) {
                  <div class="flex flex-wrap gap-2 items-center">
                    <button
                      tuiButton
                      appearance="flat"
                      size="m"
                      type="button"
                      (click.zoneless)="viewOnMap(c.latitude, c.longitude)"
                      [iconStart]="'@tui.map'"
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
              </div>
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

        @if (c.parkings.length || global.isAdmin()) {
          <div class="mt-6">
            <div class="flex items-center justify-between gap-2 mb-3">
              <h2 class="text-2xl font-semibold">
                {{ 'labels.parkings' | translate }}
              </h2>
              @if (global.isAdmin()) {
                <div class="flex flex-wrap gap-2">
                  <button
                    tuiButton
                    appearance="textfield"
                    size="m"
                    type="button"
                    (click.zoneless)="openLinkParking()"
                    [iconStart]="'@tui.link'"
                  >
                    {{ 'actions.link' | translate }}
                  </button>
                  <button
                    tuiButton
                    appearance="textfield"
                    size="m"
                    type="button"
                    (click.zoneless)="openCreateParking()"
                    [iconStart]="'@tui.plus'"
                  >
                    {{ 'actions.new' | translate }}
                  </button>
                </div>
              }
            </div>
            <div class="grid gap-2">
              @for (p of c.parkings; track p.id) {
                <div tuiCardLarge [tuiSurface]="'outline'">
                  <div class="flex flex-col gap-2">
                    <header tuiHeader class="flex justify-between items-center">
                      <h3 tuiTitle class="truncate">{{ p.name }}</h3>
                      @if (global.isAdmin()) {
                        <div class="flex flex-wrap gap-1">
                          <button
                            size="s"
                            appearance="neutral"
                            iconStart="@tui.square-pen"
                            tuiIconButton
                            type="button"
                            class="!rounded-full"
                            (click.zoneless)="openEditParking(p)"
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
                    </header>
                    <section class="text-sm opacity-80">
                      <div
                        class="flex w-fit items-center gap-1"
                        [tuiHint]="
                          global.isMobile()
                            ? null
                            : ('labels.capacity' | translate)
                        "
                      >
                        <tui-icon icon="@tui.parking-square" />
                        <span class="text-lg">
                          x
                          {{ p.size }}
                        </span>
                      </div>
                    </section>
                    @if (p.latitude && p.longitude) {
                      <div class="flex flex-wrap gap-2">
                        <button
                          tuiButton
                          appearance="flat"
                          size="m"
                          type="button"
                          (click.zoneless)="viewOnMap(p.latitude, p.longitude)"
                          [iconStart]="'@tui.map'"
                        >
                          {{ 'actions.viewOnMap' | translate }}
                        </button>
                        <button
                          appearance="flat"
                          size="m"
                          tuiButton
                          type="button"
                          class="content-center lw-icon-50"
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
        <div class="mt-6 grid gap-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-2xl font-semibold m-2">
              <tui-avatar
                tuiThumbnail
                size="l"
                [src]="global.iconSrc()('topo')"
                class="self-center"
                [attr.aria-label]="'labels.topo' | translate"
              />
              {{ toposCount }}
              {{
                'labels.' + (toposCount === 1 ? 'topo' : 'topos')
                  | translate
                  | lowercase
              }}
            </h2>
            @if (global.isAdmin()) {
              <button
                tuiButton
                appearance="textfield"
                size="m"
                type="button"
                class="my-4"
                (click.zoneless)="openCreateTopo()"
              >
                {{ 'topos.new' | translate }}
              </button>
            }
          </div>
          <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
            @for (t of topos(); track t.id) {
              <div
                tuiCardLarge
                [tuiSurface]="'outline'"
                class="cursor-pointer"
                (click.zoneless)="goToTopo(t.id)"
              >
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ t.name }}</h2>
                  </header>
                  <section class="flex flex-col gap-2">
                    @if (t.photo; as photo) {
                      <img
                        [src]="photo"
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
              </div>
            } @empty {
              <div class="col-span-full">
                <app-empty-state />
              </div>
            }
          </div>
        </div>
        <div class="flex items-center justify-between gap-2 my-4">
          <h2 class="text-2xl font-semibold m-2">
            <tui-avatar
              tuiThumbnail
              size="l"
              src="@tui.route"
              class="self-center"
              [attr.aria-label]="'labels.routes' | translate"
            />
            {{ routesCount() }}
            {{ 'labels.routes' | translate | lowercase }}
          </h2>
          @if (global.isAdmin()) {
            <button
              tuiButton
              appearance="textfield"
              size="m"
              type="button"
              (click)="openCreateRoute()"
            >
              {{ 'routes.new' | translate }}
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
              [tuiHint]="
                global.isMobile() ? null : ('labels.filters' | translate)
              "
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class CragComponent {
  protected readonly global = inject(GlobalData);
  private readonly router = inject(Router);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly crags = inject(CragsService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly filtersService = inject(FiltersService);
  private readonly parkings = inject(ParkingsService);
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
    return gradeActive || this.selectedCategories().length > 0;
  });

  readonly filteredRoutes = computed(() => {
    const q = this.query().trim().toLowerCase();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const list = this.global.cragRoutesResource.value() ?? [];

    const textMatches = (r: RouteWithExtras) => {
      if (!q) return true;
      const nameMatch = r.name.toLowerCase().includes(q);
      const gradeLabel =
        typeof r.grade === 'number'
          ? VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES]
          : null;
      const gradeMatch = gradeLabel?.toLowerCase().includes(q);
      return nameMatch || gradeMatch;
    };

    const gradeMatches = (r: RouteWithExtras) => {
      if (typeof r.grade !== 'number') return true;
      const label = VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      if (!label) return true;
      return (allowedLabels as readonly string[]).includes(label);
    };

    return list.filter((r) => textMatches(r) && gradeMatches(r));
  });

  readonly loading = this.crags.loading;
  protected readonly cragDetail = computed<CragDetail | null>(() => {
    const c = this.global.cragDetailResource.value();
    if (!c) return null;

    // Compute grades from routes
    const routes = this.global.cragRoutesResource.value() ?? [];
    const gradesVal: AmountByEveryGrade = {};
    for (const r of routes) {
      if (typeof r.grade === 'number' && r.grade >= 0) {
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

  protected goToTopo(id: number): void {
    void this.router.navigate([
      '/area',
      this.areaSlug(),
      this.cragSlug(),
      'topo',
      id,
    ]);
  }

  constructor() {
    // Synchronize selected area/crag in global state from route
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
    this.filtersService.openFilters();
  }

  openCreateRoute(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(RouteFormComponent), {
        label: this.translate.instant('routes.newTitle'),
        size: 'l',
        data: { cragId: c.id },
      })
      .subscribe();
  }

  openCreateParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(ParkingFormComponent), {
        label: this.translate.instant('actions.new'),
        size: 'l',
        data: { cragId: c.id },
      })
      .subscribe((result) => {
        if (result) {
          this.global.cragDetailResource.reload();
        }
      });
  }

  openLinkParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    const existingParkingIds = c.parkings.map((p) => p.id);
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(LinkParkingFormComponent), {
        label: this.translate.instant('actions.link'),
        size: 'm',
        data: { cragId: c.id, existingParkingIds },
      })
      .subscribe((result) => {
        if (result) {
          this.global.cragDetailResource.reload();
        }
      });
  }

  openEditParking(parking: ParkingDto): void {
    this.dialogs
      .open<boolean>(new PolymorpheusComponent(ParkingFormComponent), {
        label: this.translate.instant('actions.edit'),
        size: 'l',
        data: { parkingData: parking },
      })
      .subscribe((result) => {
        if (result) {
          this.global.cragDetailResource.reload();
        }
      });
  }

  removeParking(parking: ParkingDto): void {
    const c = this.cragDetail();
    if (!c || !isPlatformBrowser(this.platformId)) return;

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
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
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.parkings
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
    this.crags.toggleCragLike(c.id).then(() => {
      // Option: reload resource
      // this.global.cragDetailResource.reload();
    });
  }

  deleteCrag(): void {
    const c = this.cragDetail();
    if (!c) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.translate
      .get(['crags.deleteTitle', 'crags.deleteConfirm'], { name: c.name })
      .subscribe((t) => {
        const title = t['crags.deleteTitle'];
        const message = t['crags.deleteConfirm'];
        const data: TuiConfirmData = {
          content: message,
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
          appearance: 'accent',
        };
        this.dialogs
          .open<boolean>(TUI_CONFIRM, {
            label: title,
            size: 's',
            data,
          })
          .subscribe({
            next: async (confirmed) => {
              if (!confirmed) return;
              try {
                const ok = await this.crags.delete(c.id);
                if (ok) {
                  await this.router.navigateByUrl(`/area/${c.area_slug}`);
                }
              } catch (e) {
                const error = e as Error;
                console.error('[CragComponent] Error deleting crag:', error);
                handleErrorToast(error, this.toast);
              }
            },
          });
      });
  }

  openEditCrag(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.dialogs
      .open<string | null>(new PolymorpheusComponent(CragFormComponent), {
        label: this.translate.instant('crags.editTitle'),
        size: 'l',
        data: {
          cragData: {
            id: c.id,
            area_id: c.area_id,
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
        },
      })
      .subscribe({
        next: async (result) => {
          if (typeof result === 'string' && result.length) {
            if (isPlatformBrowser(this.platformId)) {
              if (result !== c.slug) {
                await this.router.navigateByUrl(
                  `/area/${this.areaSlug()}/${result}`,
                );
                return;
              }
            }
          }
        },
      });
  }

  openCreateTopo(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.dialogs
      .open<string | null>(new PolymorpheusComponent(TopoFormComponent), {
        label: this.translate.instant('topos.newTitle'),
        size: 'l',
        data: { cragId: c.id },
      })
      .subscribe();
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
