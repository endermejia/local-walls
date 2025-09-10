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
import type { ClimbingCrag, ClimbingTopo } from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { GlobalData } from '../services';
import { Location, LowerCasePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiLoader, TuiButton } from '@taiga-ui/core';
import { mapLocationUrl } from '../utils';
import { Router } from '@angular/router';
import {
  normalizeRoutesByGrade,
  RoutesByGrade,
} from '../models/grade.model';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    TranslatePipe,
    SectionHeaderComponent,
    ChartRoutesByGradeComponent,
    TuiLoader,
    TuiButton,
    LowerCasePipe,
    DecimalPipe,
    KeyValuePipe,
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

        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm opacity-80">
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
              {{ c.averageRating | number:'1.1-2' }}
            </div>
          }
          @if (c.location) {
            <div>
              <a
                class="tui-link"
                [href]="mapLocationUrl(c.location)"
                target="_blank"
                rel="noopener noreferrer"
                [attr.aria-label]="'actions.openMap' | translate"
                [attr.title]="'actions.openMap' | translate"
                >{{ 'actions.openMap' | translate }}</a
              >
            </div>
          }
        </div>

        @if (routesByGrade() | keyvalue; as kv) {
          @if (kv.length > 0) {
            <app-chart-routes-by-grade class="mt-4" [grades]="routesByGrade()" />

            <!-- Generate Topo button -->
            <div class="mt-4">
              <button tuiButton appearance="primary" (click.zoneless)="openTopo()">
                {{ 'labels.topo' | translate }}
              </button>
            </div>
          }
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

  // Routes pageable items from global state
  private readonly routes = computed(() =>
    this.global.routesPageable()?.items ?? [],
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
      const countrySlug = this.countrySlug();
      const cragSlug = this.cragSlug();
      // Load crag basic info
      this.global.loadCrag(countrySlug, cragSlug);
      // Load routes to build grades chart
      this.global.loadCragRoutes(countrySlug, cragSlug);
    });
  }

  goBack(): void {
    this.location.back();
  }

  openTopo(): void {
    const crag = this.crag();
    const countrySlug = this.countrySlug();
    const cragSlug = this.cragSlug();
    const routes = this.routes();
    if (!crag) return;

    // Build a minimal synthetic topo using current routes
    const topoId = Date.now();
    const topo: ClimbingTopo = {
      id: topoId,
      slug: `${cragSlug}-topo`,
      name: `${crag.cragName} — Topo`,
      cragId: String(cragSlug),
      photo: undefined,
      grades: {},
      topoRoutes: routes.map((r, i) => ({
        id: r.zlaggableId,
        routeId: r.zlaggableId,
        orderNumber: i + 1,
      })),
    } as any;

    this.global.topo.set(topo);
    this.router.navigate(['/topo', countrySlug, cragSlug, topoId.toString()]);
  }
}
