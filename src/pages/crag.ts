import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  effect,
  InputSignal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser, Location, LowerCasePipe } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiAvatar, TUI_CONFIRM, type TuiConfirmData } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import {
  TuiLoader,
  TuiTitle,
  TuiButton,
  TuiHint,
  TuiNotification,
} from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  ChartRoutesByGradeComponent,
  RoutesTableComponent,
  SectionHeaderComponent,
} from '../components';
import { CragsService, GlobalData } from '../services';
import { TuiToastService } from '@taiga-ui/kit';
import {
  type CragDetail,
  RouteWithExtras,
  type TopoListItem,
  AmountByEveryGrade,
  VERTICAL_LIFE_GRADES,
  RouteAscentDto,
} from '../models';
import { mapLocationUrl } from '../utils';
import { CragFormComponent } from './crag-form';
import { RouteFormComponent } from './route-form';
import AscentFormComponent from './ascent-form';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { handleErrorToast } from '../utils';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
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
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (cragDetail(); as c) {
        <div class="mb-4 flex items-center justify-between gap-2">
          <app-section-header
            class="w-full"
            [title]="c.name"
            [liked]="c.liked"
            (back)="goBack()"
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
              [tuiHint]="'actions.edit' | translate"
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
              [tuiHint]="'actions.delete' | translate"
              (click.zoneless)="deleteCrag()"
            >
              {{ 'actions.delete' | translate }}
            </button>
          }
        </div>

        <div class="flex flex-col md:flex-row md:justify-between gap-2">
          <div class="flex flex-col gap-3">
            @let lang = global.selectedLanguage();
            @let desc = lang === 'es' ? c.description_es : c.description_en;
            @let warn = lang === 'es' ? c.warning_es : c.warning_en;

            @if (desc) {
              <p class="text-lg">{{ desc }}</p>
            }

            @if (warn) {
              <tui-notification appearance="warning">
                {{ warn }}
              </tui-notification>
            }

            @if (c.latitude && c.longitude) {
              <div class="flex gap-2 items-center">
                <button
                  tuiButton
                  appearance="secondary"
                  size="s"
                  type="button"
                  (click.zoneless)="viewOnMap(c.latitude, c.longitude)"
                  [iconStart]="'@tui.map'"
                >
                  {{ 'actions.viewOnMap' | translate }}
                </button>
                <a
                  tuiButton
                  appearance="flat"
                  size="s"
                  [href]="
                    mapLocationUrl({
                      latitude: c.latitude,
                      longitude: c.longitude,
                    })
                  "
                  target="_blank"
                  rel="noopener noreferrer"
                  [iconStart]="'@tui.map-pin'"
                  [attr.aria-label]="'actions.openGoogleMaps' | translate"
                  [attr.title]="'actions.openGoogleMaps' | translate"
                >
                  {{ 'actions.openGoogleMaps' | translate }}
                </a>
              </div>
            }
          </div>
          <app-chart-routes-by-grade class="self-end" [grades]="c.grades" />
        </div>

        @if (c.parkings.length) {
          <div class="mt-6 grid gap-3">
            <h2 class="text-2xl font-semibold">
              {{ 'labels.parkings' | translate }}
            </h2>
            <div class="grid gap-2">
              @for (p of c.parkings; track p.id) {
                <div tuiCardLarge [tuiSurface]="'neutral'">
                  <div class="flex flex-col gap-2">
                    <header tuiHeader>
                      <h3 tuiTitle class="truncate">{{ p.name }}</h3>
                    </header>
                    <section
                      class="text-sm opacity-80 grid grid-cols-1 sm:grid-cols-3 gap-2"
                    >
                      <div>
                        <strong>{{ 'labels.capacity' | translate }}:</strong>
                        {{ p.size }}
                      </div>
                      <div>
                        <strong>{{ 'labels.lat' | translate }}:</strong>
                        {{ p.latitude }}
                      </div>
                      <div>
                        <strong>{{ 'labels.lng' | translate }}:</strong>
                        {{ p.longitude }}
                      </div>
                    </section>
                    @if (p.latitude && p.longitude) {
                      <div class="flex gap-2">
                        <button
                          tuiButton
                          appearance="secondary"
                          size="s"
                          type="button"
                          (click.zoneless)="viewOnMap(p.latitude, p.longitude)"
                          [iconStart]="'@tui.map'"
                        >
                          {{ 'actions.viewOnMap' | translate }}
                        </button>
                        <a
                          tuiButton
                          appearance="flat"
                          size="s"
                          [href]="
                            mapLocationUrl({
                              latitude: p.latitude,
                              longitude: p.longitude,
                            })
                          "
                          target="_blank"
                          rel="noopener noreferrer"
                          [iconStart]="'@tui.map-pin'"
                          [attr.aria-label]="
                            'actions.openGoogleMaps' | translate
                          "
                          [attr.title]="'actions.openGoogleMaps' | translate"
                        >
                          {{ 'actions.openGoogleMaps' | translate }}
                        </a>
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
            @for (t of c.topos; track t.id) {
              <div tuiCardLarge [tuiSurface]="'outline'" class="cursor-pointer">
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ t.name }}</h2>
                  </header>
                  <section class="flex gap-3 mt-2">
                    @if (t.photo) {
                      <img
                        [src]="t.photo"
                        alt="topo"
                        class="w-24 h-24 object-cover rounded shadow-sm"
                        loading="lazy"
                        decoding="async"
                      />
                    }
                    <div class="flex flex-col flex-1 min-w-0">
                      <div class="text-sm opacity-80 mb-2">
                        {{ shadeText(t) }}
                        @if (t.shade_change_hour) {
                          · {{ t.shade_change_hour }}
                        }
                      </div>
                      <div class="mt-auto flex justify-end">
                        <app-chart-routes-by-grade [grades]="t.grades" />
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            }
          </div>
        </div>
        <div class="flex items-center justify-between gap-2 my-4">
          <h2 class="text-2xl font-semibold m-2">
            <tui-avatar
              tuiThumbnail
              size="l"
              src="@tui.chart-no-axes-column"
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
        <app-routes-table
          [data]="global.cragRoutesResource.value() ?? []"
          (logAscent)="onLogAscent($event)"
          (editAscent)="onEditAscent($event)"
        />
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

  private readonly location = inject(Location);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly toast = inject(TuiToastService);
  private readonly translate = inject(TranslateService);
  private readonly crags = inject(CragsService);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly mapLocationUrl = mapLocationUrl;

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
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

  protected readonly routesCount = computed(
    () => (this.global.cragRoutesResource.value() ?? []).length,
  );

  constructor() {
    // Sincroniza área/crag seleccionados en el estado global desde la ruta
    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      this.global.resetDataByPage('crag');
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
    });
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

  goBack(): void {
    this.location.back();
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
                handleErrorToast(error, this.toast, this.translate);
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
    // TODO: navigate to/create topo form for this crag
  }

  protected shadeText(t: TopoListItem): string {
    const lang = this.global.selectedLanguage();
    const morning = t.shade_morning;
    const afternoon = t.shade_afternoon;
    if (morning && afternoon) {
      return this.translate.instant('filters.shade.allDay');
    }
    if (!morning && !afternoon) {
      return lang === 'es' ? 'Sol todo el día' : 'Sun all day';
    }
    if (morning && !afternoon) {
      return this.translate.instant('filters.shade.morning');
    }
    return this.translate.instant('filters.shade.afternoon');
  }

  protected onLogAscent(route: RouteWithExtras): void {
    this.dialogs
      .open(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant('ascent.new'),
        data: { routeId: route.id, grade: route.grade },
        size: 'm',
      })
      .subscribe();
  }

  onEditAscent(ascent: RouteAscentDto): void {
    this.dialogs
      .open(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant('ascent.edit'),
        data: { routeId: ascent.route_id, ascentData: ascent },
        size: 'm',
      })
      .subscribe();
  }
}
