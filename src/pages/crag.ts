import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  effect,
  Signal,
  InputSignal,
} from '@angular/core';
import type { ClimbingCrag } from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { GlobalData } from '../services';
import { Location, LowerCasePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { TuiLoader, TuiTitle, TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { mapLocationUrl } from '../utils';
import { normalizeRoutesByGrade, RoutesByGrade } from '../models';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    ChartRoutesByGradeComponent,
    DecimalPipe,
    LowerCasePipe,
    RouterLink,
    SectionHeaderComponent,
    TranslatePipe,
    TuiCardLarge,
    TuiHeader,
    TuiLoader,
    TuiSurface,
    TuiTitle,
    TuiButton,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (crag(); as c) {
        <app-section-header
          [title]="c.cragName"
          [liked]="global.liked()"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeCrag(c.cragSlug)"
        />

        @if (c.description) {
          <p class="mt-2 opacity-80">{{ c.description }}</p>
        }

        <div
          class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm opacity-80"
        >
          <div>
            <strong>{{ 'labels.country' | translate }}:</strong>
            {{ c.countryName }}
          </div>
          <div>
            <strong>{{ 'labels.zone' | translate }}:</strong>
            {{ c.areaName }}
          </div>
          @if (c.totalZlaggables) {
            <div>
              <strong>{{ 'labels.routes' | translate | lowercase }}:</strong>
              {{ c.totalZlaggables }}
            </div>
          }
          @if (c.totalSectors) {
            <div>
              <strong>{{ 'labels.sectors' | translate | lowercase }}:</strong>
              {{ c.totalSectors }}
            </div>
          }
          @if (c.totalAscents) {
            <div>
              <strong>{{ 'labels.ascents' | translate | lowercase }}:</strong>
              {{ c.totalAscents }}
            </div>
          }
          @if (c.averageRating) {
            <div>
              <strong>{{ 'labels.rating' | translate | lowercase }}:</strong>
              {{ c.averageRating | number: '1.1-2' }}
            </div>
          }
          @if (c.location) {
            <div class="flex gap-2 items-center">
              <button
                tuiButton
                appearance="secondary"
                size="s"
                type="button"
                (click.zoneless)="viewOnMap(c)"
                [iconStart]="'@tui.map'"
              >
                {{ 'actions.viewOnMap' | translate }}
              </button>
              <a
                tuiButton
                appearance="flat"
                size="s"
                [href]="mapLocationUrl(c.location)"
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

        <!-- TODO: get cragInfo -->
        <app-chart-routes-by-grade class="mt-4" [grades]="routesByGrade()" />

        <!-- Sectors list with app aesthetics (cards) -->
        @if (sectors().length > 0) {
          <div class="mt-6">
            <h2 class="text-lg font-semibold mb-2">
              {{ 'labels.sectors' | translate }}
            </h2>
            <div class="grid gap-2 pb-4">
              @for (s of sectors(); track s.sectorSlug) {
                <div
                  tuiCardLarge
                  [tuiSurface]="global.liked() ? 'accent' : 'neutral'"
                  class="cursor-pointer"
                  [routerLink]="[
                    '/sector',
                    c.countrySlug,
                    c.cragSlug,
                    s.sectorSlug,
                  ]"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ s.sectorName }}</h2>
                      </header>
                      <section>
                        <div class="text-sm opacity-80">
                          {{ s.totalZlaggables }}
                          {{ 'labels.routes' | translate | lowercase }}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      } @else {
        <div class="flex items-center justify-center w-full min-h-[50vh]">
          <tui-loader size="xxl"></tui-loader>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto sm:p-4' },
})
export class CragComponent {
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  protected readonly mapLocationUrl = mapLocationUrl;

  countrySlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  crag: Signal<ClimbingCrag | null> = computed(() => this.global.crag());
  sectors: Signal<
    readonly {
      sectorId: number;
      sectorName: string;
      sectorSlug: string;
      totalZlaggables: number;
    }[]
  > = computed(() => this.global.cragSectors());

  // Routes pageable items from global state
  private readonly routes = computed(
    () => this.global.routesPageable()?.items ?? [],
  );

  // Aggregate number of routes per difficulty label
  routesByGrade = computed<RoutesByGrade>(() => {
    const acc: Record<string, number> = {};
    for (const r of this.routes()) {
      const label = r.difficulty;
      if (!label) continue;
      acc[label] = (acc[label] ?? 0) + 1;
    }
    return normalizeRoutesByGrade(acc);
  });

  constructor() {
    effect(() => {
      this.global.resetDataByPage('crag');
      const countrySlug = this.countrySlug();
      const cragSlug = this.cragSlug();
      this.global.loadCrag(countrySlug, cragSlug);
      this.global.loadCragRoutes(countrySlug, cragSlug);
      this.global.loadCragSectors(countrySlug, cragSlug);
    });
  }

  goBack(): void {
    this.location.back();
  }

  openSector(sectorSlug: string): void {
    const countrySlug = this.countrySlug();
    const cragSlug = this.cragSlug();
    this.router.navigate(['/sector', countrySlug, cragSlug, sectorSlug]);
  }

  viewOnMap(c: ClimbingCrag): void {
    const loc = c.location;
    if (!loc) return;
    // Set viewport bounds centered on the crag with a target zoom
    const zoom = 13;
    this.global.mapBounds.set({
      south_west_latitude: loc.latitude,
      south_west_longitude: loc.longitude,
      north_east_latitude: loc.latitude,
      north_east_longitude: loc.longitude,
      zoom,
    });
    this.router.navigateByUrl('/home');
  }
}
