import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  effect,
  Signal,
  InputSignal,
  signal,
} from '@angular/core';
import type { CragDetail, TopoListItem, ClimbingCrag } from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { GlobalData } from '../services';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser, Location, LowerCasePipe } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import {
  TuiLoader,
  TuiTitle,
  TuiButton,
  TuiNotification,
} from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { mapLocationUrl } from '../utils';
import { CragsService } from '../services/crags.service';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { ConfirmDialogComponent } from '../components/confirm-dialog';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    ChartRoutesByGradeComponent,
    LowerCasePipe,
    SectionHeaderComponent,
    TranslatePipe,
    TuiCardLarge,
    TuiHeader,
    TuiLoader,
    TuiSurface,
    TuiTitle,
    TuiButton,
    TuiBadge,
    FormsModule,
    TuiNotification,
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
            <tui-badge
              class="cursor-pointer"
              appearance="neutral"
              iconStart="@tui.square-pen"
              size="xl"
              (click.zoneless)="openEditCrag()"
              [attr.aria-label]="'common.edit' | translate"
              [attr.title]="'common.edit' | translate"
            />
            <tui-badge
              class="cursor-pointer"
              appearance="negative"
              iconStart="@tui.trash"
              size="xl"
              (click.zoneless)="deleteCrag()"
              [attr.aria-label]="'common.delete' | translate"
              [attr.title]="'common.delete' | translate"
            />
          }
        </div>

        <div class="flex items-center justify-between gap-2">
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
          </div>
          <app-chart-routes-by-grade [grades]="c.grades" />
        </div>

        @if ((c.parkings || []).length) {
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
                        [attr.aria-label]="'actions.openGoogleMaps' | translate"
                        [attr.title]="'actions.openGoogleMaps' | translate"
                      >
                        {{ 'actions.openGoogleMaps' | translate }}
                      </a>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="mt-6 grid gap-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-2xl font-semibold m-0">
              {{ 'labels.topos' | translate }}
            </h2>
            @if (global.isAdmin()) {
              <button
                tuiButton
                appearance="primary"
                size="s"
                type="button"
                (click.zoneless)="addTopo()"
                [iconStart]="'@tui.plus'"
                [attr.aria-label]="'actions.addTopo' | translate"
                [attr.title]="'actions.addTopo' | translate"
              >
                {{ 'actions.addTopo' | translate }}
              </button>
            }
          </div>
          <div class="grid gap-3">
            @for (t of c.topos; track t.id) {
              <div tuiCardLarge [tuiSurface]="'neutral'">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div class="md:col-span-2 flex gap-3">
                    @if (t.photo) {
                      <img
                        [src]="t.photo"
                        alt="topo"
                        class="w-40 h-28 object-cover rounded"
                        loading="lazy"
                        decoding="async"
                      />
                    }
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold mb-1">{{ t.name }}</h3>
                      <div class="text-sm opacity-80">
                        {{ shadeText(t) }}
                        @if (t.shade_change_hour) {
                          · {{ t.shade_change_hour }}
                        }
                      </div>
                    </div>
                  </div>
                  <div class="md:col-span-1 flex justify-end">
                    <app-chart-routes-by-grade [grades]="t.grades" />
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
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
  private readonly translate = inject(TranslateService);
  private readonly crags = inject(CragsService);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly mapLocationUrl = mapLocationUrl;

  cragSlug: InputSignal<string> = input.required<string>();
  readonly loading = this.crags.loading;
  cragDetail = signal<CragDetail | null>(null);

  constructor() {
    effect(() => {
      const slug = this.cragSlug();
      void this.load(slug);
    });
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

  private async load(slug: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    const detail = await this.crags.getCragDetailBySlug(slug);
    this.cragDetail.set(detail);
    // Update global breadcrumb source with the new CragDetail shape
    if (detail) {
      const mapped: ClimbingCrag = {
        cragSlug: detail.slug,
        cragName: detail.name,
        areaSlug: detail.area_slug,
        areaName: detail.area_name,
        liked: detail.liked,
        location: {
          latitude: detail.latitude,
          longitude: detail.longitude,
        },
      } as ClimbingCrag;
      this.global.crag.set(mapped);
    } else {
      this.global.crag.set(null);
    }
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const c = this.cragDetail();
    if (!c) return;
    this.cragDetail.set({ ...c, liked: !c.liked });
    this.crags
      .toggleCragLike(c.id)
      .catch(() => this.cragDetail.set({ ...c, liked: c.liked }));
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
        this.dialogs
          .open<boolean>(new PolymorpheusComponent(ConfirmDialogComponent), {
            label: title,
            size: 's',
            data: {
              title,
              message,
              confirmLabel: 'common.delete',
              cancelLabel: 'common.cancel',
            },
          })
          .subscribe({
            next: async (confirmed) => {
              if (!confirmed) return;
              try {
                const ok = await this.crags.delete(c.id);
                if (ok) {
                  await this.router.navigateByUrl(`/area/${c.area_slug}`);
                }
              } catch {
                /* empty */
              }
            },
          });
      });
  }

  openEditCrag(): void {
    const c = this.cragDetail();
    if (!c) return;
    // TODO: open crag-form component when available
  }

  addTopo(): void {
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
}
