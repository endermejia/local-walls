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
import type {
  AscentListItem,
  ClimbingCrag,
  MapAreaItem,
  MapCragItem,
  MapItem,
} from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { GlobalData } from '../services';
import { FormsModule } from '@angular/forms';
import { Location, LowerCasePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiAvatar, TuiRating } from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { TuiLoader, TuiTitle, TuiButton } from '@taiga-ui/core';
import { TuiSurface } from '@taiga-ui/core';
import { TuiTable } from '@taiga-ui/addon-table';
import { mapLocationUrl } from '../utils';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    ChartRoutesByGradeComponent,
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
    TuiTable,
    TuiCell,
    TuiAvatar,
    TuiRating,
    FormsModule,
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
              <strong>{{ c.totalZlaggables }}</strong>
              {{ 'labels.routes' | translate | lowercase }}
            </div>
          }
          @if (c.totalSectors) {
            <div>
              <strong>{{ c.totalSectors }}</strong>
              {{ 'labels.sectors' | translate | lowercase }}
            </div>
          }
          @if (c.totalAscents) {
            <div>
              <strong>{{ c.totalAscents }}</strong>
              {{ 'labels.ascents' | translate | lowercase }}
            </div>
          }
          @if (c.averageRating) {
            <tui-rating
              [max]="5"
              [ngModel]="c.averageRating"
              [readOnly]="true"
              [style.font-size.rem]="0.5"
            />
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

        @if (global.selectedMapCragItem()?.grades; as grades) {
          <app-chart-routes-by-grade class="mt-4" [grades]="grades" />
        }

        <!-- Sectors list with app aesthetics (cards) -->
        @if (sectors().length > 0) {
          <div class="mt-6">
            <h2 class="text-lg font-semibold mb-2">
              {{ 'labels.sectors' | translate }}
            </h2>
            <div class="grid gap-2">
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

        <!-- Latest ascents table -->
        <div class="mt-6">
          <h2 class="text-lg font-semibold mb-2">
            {{ 'labels.latestAscents' | translate }}
          </h2>

          @if (ascents().length === 0 && global.loading()) {
            <div class="flex items-center justify-center w-full min-h-[20vh]">
              <tui-loader size="l"></tui-loader>
            </div>
          } @else {
            <div class="overflow-auto">
              <table tuiTable class="w-full" [columns]="ascColumns">
                <thead tuiThead>
                  <tr tuiThGroup>
                    @for (col of ascColumns; track col) {
                      <th *tuiHead="col" tuiTh>
                        <div>
                          {{ 'labels.' + col | translate }}
                        </div>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody tuiTbody [data]="ascents()">
                  @for (a of ascents(); track a.ascentId) {
                    <tr tuiTr>
                      <td *tuiCell="'user'" tuiTd>
                        <div tuiCell size="m" class="flex items-center gap-2">
                          <tui-avatar
                            tuiThumbnail
                            size="s"
                            [src]="a.userAvatar || undefined"
                            [attr.aria-label]="
                              a.userName || ('labels.anonymous' | translate)
                            "
                          >
                            {{ (a.userName || '?').charAt(0) }}
                          </tui-avatar>
                          <div class="truncate max-w-[160px]">
                            {{
                              a.userPrivate
                                ? ('labels.anonymous' | translate)
                                : a.userName || '—'
                            }}
                          </div>
                        </div>
                      </td>
                      <td *tuiCell="'date'" tuiTd>
                        <div tuiCell size="m">
                          {{ (a.date || '').slice(0, 10) }}
                        </div>
                      </td>
                      <td *tuiCell="'grade'" tuiTd>
                        <div tuiCell size="m">{{ a.difficulty || '—' }}</div>
                      </td>
                      <td *tuiCell="'route'" tuiTd>
                        <div tuiCell size="m" class="truncate max-w-[220px]">
                          {{ a.zlaggableName || ('labels.route' | translate) }}
                        </div>
                      </td>
                      <td *tuiCell="'sector'" tuiTd>
                        <div tuiCell size="m" class="truncate max-w-[160px]">
                          {{ a.sectorName || '—' }}
                        </div>
                      </td>
                      <td *tuiCell="'type'" tuiTd>
                        <div tuiCell size="m">{{ a.type.toUpperCase() }}</div>
                      </td>
                      <td *tuiCell="'rating'" tuiTd>
                        <div tuiCell size="m">{{ a.rating || 0 }}</div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            @if (hasAscNext()) {
              <div class="flex justify-center mt-3">
                <button
                  tuiButton
                  appearance="flat"
                  size="m"
                  (click.zoneless)="loadMoreAscents()"
                >
                  {{ 'actions.loadMore' | translate }}
                </button>
              </div>
            }
          }
        </div>
      } @else {
        <div class="flex items-center justify-center w-full min-h-[50vh]">
          <tui-loader size="xxl"></tui-loader>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
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

  // Ascents table data
  ascents = computed<readonly AscentListItem[]>(
    () => this.global.ascentsPageable()?.items ?? [],
  );
  ascPagination = computed(() => this.global.ascentsPageable()?.pagination);
  hasAscNext = computed(() => this.ascPagination()?.hasNext ?? false);
  ascColumns: readonly string[] = [
    'user',
    'date',
    'grade',
    'route',
    'sector',
    'type',
    'rating',
  ];

  constructor() {
    effect(() => {
      this.global.resetDataByPage('crag');
      const countrySlug = this.countrySlug();
      const cragSlug = this.cragSlug();
      void this.global.loadCrag(countrySlug, cragSlug);
      void this.global.loadCragRoutes(countrySlug, cragSlug);
      void this.global.loadCragSectors(countrySlug, cragSlug);
      void this.global.loadCragAscents(countrySlug, cragSlug, { pageIndex: 0 });
    });

    // Keep the selected map crag item in sync once crag is loaded
    effect(() => {
      const cragSlug = this.cragSlug();
      const crag = this.global.crag();
      const selected = this.global.selectedMapCragItem();
      const needsSelect = !selected || selected.slug !== cragSlug;
      if (!needsSelect) return;

      const id = crag?.unifiedId;
      if (id) {
        this.global
          .refreshMapItemById(id)
          .then((item) => item && this.global.selectedMapCragItem.set(item))
          .catch(() => void 0);
        return;
      }
      const cached = this.global
        .mapItems()
        .find(
          (it: MapItem) =>
            it && it.slug === cragSlug && !(it as MapAreaItem)?.area_type,
        ) as MapCragItem | undefined;
      if (cached) {
        this.global.selectedMapCragItem.set(cached);
      }
    });
  }

  loadMoreAscents(): void {
    const countrySlug = this.countrySlug();
    const cragSlug = this.cragSlug();
    const next = (this.ascPagination()?.pageIndex ?? 0) + 1;
    void this.global.loadCragAscents(countrySlug, cragSlug, {
      pageIndex: next,
    });
  }

  goBack(): void {
    this.location.back();
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
    void this.router.navigateByUrl('/home');
  }
}
