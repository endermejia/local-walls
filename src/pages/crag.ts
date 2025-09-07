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
import { RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { GlobalData } from '../services';
import { TuiTitle, TuiSurface, TuiLoader } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import type { Crag, Topo, Parking, RoutesByGrade } from '../models';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '../components/section-header';
import { ChartRoutesByGradeComponent } from '../components';
import { parkingMapUrl } from '../utils';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TuiSurface,
    TranslatePipe,
    TuiAvatar,
    SectionHeaderComponent,
    ChartRoutesByGradeComponent,
    TuiLoader,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (crag(); as c) {
        <app-section-header
          [title]="c.name"
          [liked]="global.isCragLiked()(c.id)"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeCrag(c.id)"
        />

        @if (c.description) {
          <p class="mt-2 opacity-80">{{ c.description }}</p>
        }

        <app-chart-routes-by-grade class="mt-2" [counts]="routesByGrade()" />

        <h2 class="text-xl font-semibold mt-6">
          {{ 'labels.parkings' | translate }}
        </h2>
        <div class="mt-2 grid gap-2">
          @for (p of cragParkings(); track p.id) {
            <a
              class="block"
              [href]="parkingMapUrl(p)"
              target="_blank"
              rel="noopener noreferrer"
              [attr.aria-label]="'actions.openMap' | translate"
              [attr.title]="'actions.openMap' | translate"
            >
              <div tuiCardLarge tuiSurface="neutral" class="cursor-pointer">
                <div class="flex items-center gap-3">
                  <tui-avatar
                    tuiThumbnail
                    size="l"
                    src="@tui.square-parking"
                    class="self-center"
                    [attr.aria-label]="'labels.parking' | translate"
                  />
                  <div class="flex flex-col min-w-0 grow">
                    <header tuiHeader>
                      <h2 tuiTitle>{{ p.name }}</h2>
                    </header>
                    <section>
                      <div class="text-sm opacity-80">
                        {{ 'labels.lat' | translate }}: {{ p.ubication.lat }} ·
                        {{ 'labels.lng' | translate }}: {{ p.ubication.lng }}
                      </div>
                      @if (p.capacity) {
                        <div class="text-sm opacity-80">
                          {{ 'labels.capacity' | translate }}:
                          {{ p.capacity }}
                        </div>
                      }
                    </section>
                  </div>
                </div>
              </div>
            </a>
          }
        </div>

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.topos' | translate }}
        </h2>
        <div class="grid gap-2">
          @for (t of toposSorted(); track t.id) {
            <div
              tuiCardLarge
              [tuiSurface]="global.isTopoLiked()(t.id) ? 'accent' : 'neutral'"
              class="cursor-pointer"
              [routerLink]="['/topo', t.id]"
            >
              <div class="flex items-center gap-3">
                <tui-avatar
                  tuiThumbnail
                  size="l"
                  [src]="global.iconSrc()('topo')"
                  class="self-center"
                  [attr.aria-label]="'labels.topo' | translate"
                />
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ t.name }}</h2>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      {{ 'labels.routes' | translate }}:
                      {{ topoRouteCount(t.id) }}
                    </div>
                  </section>
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
export class CragComponent {
  routesByGrade = computed(() => {
    const c = this.crag();
    if (!c) return {} as RoutesByGrade;

    const topos = this.global.selectedCragTopos();
    if (!topos.length) return {} as RoutesByGrade;

    const topoIds = new Set(topos.map((t) => t.id));
    const routeIds = new Set(
      this.global
        .topoRoutes()
        .filter((tr) => topoIds.has(tr.topoId))
        .map((tr) => tr.routeId),
    );

    const counts: Record<string, number> = {};
    for (const r of this.global.routesData()) {
      if (!routeIds.has(r.id)) continue;
      const g = (r.grade || '').trim();
      if (!g) continue;
      counts[g] = (counts[g] ?? 0) + 1;
    }
    return counts as RoutesByGrade;
  });
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);
  protected readonly parkingMapUrl = parkingMapUrl;

  id: InputSignal<string> = input.required<string>();
  crag: Signal<Crag | null> = computed<Crag | null>(() => {
    const id = this.id();
    return this.global.crags().find((c) => c.id === id) || null;
  });

  toposSorted: Signal<Topo[]> = computed<Topo[]>(() => {
    const liked = new Set(this.global.appUser()?.likedTopos ?? []);
    return [...this.global.selectedCragTopos()].sort((a, b) => {
      const la = liked.has(a.id) ? 1 : 0;
      const lb = liked.has(b.id) ? 1 : 0;
      if (la !== lb) return lb - la; // liked first
      return a.name.localeCompare(b.name);
    });
  });

  cragParkings: Signal<Parking[]> = computed<Parking[]>(() => {
    const c = this.crag();
    if (!c) return [];
    const ids = new Set(c.parkings);
    return this.global.parkings().filter((p) => ids.has(p.id));
  });

  constructor() {
    effect(() => {
      const id = this.id();
      this.global.setSelectedCrag(id);
      const crag = this.global.crags().find((c) => c.id === id);
      if (crag) {
        this.global.setSelectedZone(crag.zoneId);
      }
      this.global.setSelectedTopo(null);
      this.global.setSelectedRoute(null);
    });
  }

  topoRouteCount(topoId: string): number {
    return this.global.topoRoutes().filter((r) => r.topoId === topoId).length;
  }

  goBack(): void {
    this.location.back();
  }
}
