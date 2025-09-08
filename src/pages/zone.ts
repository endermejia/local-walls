import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  input,
  effect,
  InputSignal,
} from '@angular/core';
import type { Crag, Zone } from '../models';
import { ChartRoutesByGradeComponent } from '../components';
import { GlobalData } from '../services';
import { ApiService } from '../services';
import { Location, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SectionHeaderComponent } from '../components/section-header';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { TuiSurface, TuiTitle, TuiLoader } from '@taiga-ui/core';

@Component({
  selector: 'app-zone',
  standalone: true,
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TranslatePipe,
    TuiSurface,
    SectionHeaderComponent,
    ChartRoutesByGradeComponent,
    TuiLoader,
    LowerCasePipe,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (zone(); as z) {
        <app-section-header
          [title]="z.name"
          [liked]="global.isZoneLiked()(z.id)"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeZone(z.id)"
        />

        @if (z.description) {
          <p class="mt-2 opacity-80">{{ z.description }}</p>
        }

        <app-chart-routes-by-grade class="mt-4" [counts]="routesByGrade()" />

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.crags' | translate }}
        </h2>
        <div class="grid gap-2">
          @for (c of cragsSorted(); track c.id) {
            <div
              tuiCardLarge
              [tuiSurface]="global.isCragLiked()(c.id) ? 'accent' : 'neutral'"
              class="cursor-pointer"
              [routerLink]="['/crag', c.id]"
            >
              <div class="flex items-center gap-3">
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ c.name }}</h2>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      {{ 'labels.approach' | translate }} :
                      {{ c.approach || '—' }}
                      {{ 'units.min' | translate }}
                    </div>
                    <div class="text-sm mt-1">
                      {{ c.parkings.length }}
                      {{ 'labels.parkings' | translate | lowercase }}
                    </div>
                  </section>
                </div>
                <div (click.zoneless)="$event.stopPropagation()">
                  <app-chart-routes-by-grade
                    class="mt-2"
                    [counts]="cragRoutesByGrade()(c.id)"
                  />
                </div>
              </div>
            </div>
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
  host: { class: 'flex grow overflow-auto sm:p-4' },
})
export class ZoneComponent {
  private readonly api = inject(ApiService);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  id: InputSignal<string> = input.required<string>();
  zone: Signal<Zone | null> = computed<Zone | null>(() => {
    const id = this.id();
    return this.global.zones().find((z) => z.id === id) || null;
  });

  crags: Signal<Crag[]> = this.global.selectedZoneCrags;
  cragsSorted: Signal<Crag[]> = computed<Crag[]>(() => {
    const likedIds = new Set(this.global.appUser()?.likedCrags ?? []);
    return [...this.crags()].sort(
      (a, b) =>
        +!likedIds.has(a.id) - +!likedIds.has(b.id) ||
        a.name.localeCompare(b.name),
    );
  });

  cragRoutesByGrade = computed(() => this.global.cragRoutesByGrade());
  routesByGrade = computed(() => this.global.routesByGradeForSelectedZone());

  constructor() {
    // Ensure data is present when directly navigating by ID
    effect(() => {
      const id = this.id();
      if (!this.zone()) {
        // Try to load from remote if not available yet
        void this.api.loadZoneById(id);
      }
    });
    effect(() => {
      const id = this.id();
      this.global.setSelectedZone(id);
      this.global.setSelectedCrag(null);
      this.global.setSelectedTopo(null);
      this.global.setSelectedRoute(null);
    });
  }

  goBack(): void {
    this.location.back();
  }
}
