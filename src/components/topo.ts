import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';
import { TuiTitle, TuiSurface } from '@taiga-ui/core';
import { TuiBadge, TuiAvatar } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import { GlobalData } from '../services';
import type { Topo, TopoRoute, Route } from '../models';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-topo',
  standalone: true,
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TuiSurface,
    TuiBadge,
    TuiAvatar,
    TranslatePipe,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (topo(); as t) {
        <header tuiHeader class="mb-4">
          <h1 tuiTitle>{{ t.name }}</h1>
          <aside tuiAccessories>
            <tui-badge
              [appearance]="'neutral'"
              iconStart="@tui.chevron-left"
              size="l"
              (click.zoneless)="goBack()"
              [attr.aria-label]="'actions.back' | translate"
              [attr.title]="'actions.back' | translate"
            ></tui-badge>
            <tui-badge
              [appearance]="global.isTopoLiked()(t.id) ? 'negative' : 'neutral'"
              iconStart="@tui.heart"
              size="xl"
              (click.zoneless)="global.toggleLikeTopo(t.id)"
              [attr.aria-label]="
                (global.isTopoLiked()(t.id)
                  ? 'actions.favorite.remove'
                  : 'actions.favorite.add'
                ) | translate
              "
              [attr.title]="
                (global.isTopoLiked()(t.id)
                  ? 'actions.favorite.remove'
                  : 'actions.favorite.add'
                ) | translate
              "
            ></tui-badge>
          </aside>
        </header>

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.routes' | translate }}
        </h2>
        <div class="grid gap-2">
          @for (tr of topoRoutesDetailed(); track tr.id) {
            <div
              tuiCardLarge
              tuiSurface="neutral"
              class="tui-space_top-4 cursor-pointer"
              [routerLink]="['/route', tr.routeId]"
            >
              <div class="flex items-center gap-3">
                <tui-avatar
                  tuiThumbnail
                  size="l"
                  [src]="global.iconSrc()('route')"
                  class="self-center"
                  [attr.aria-label]="'labels.route' | translate"
                />
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>
                      {{ tr.route?.name || ('labels.route' | translate) }}
                    </h2>
                    <aside tuiAccessories>
                      <tui-badge
                        [appearance]="
                          global.isRouteLiked()(tr.routeId)
                            ? 'negative'
                            : 'neutral'
                        "
                        iconStart="@tui.heart"
                        size="xl"
                        (click.zoneless)="
                          $event.stopPropagation();
                          global.toggleLikeRoute(tr.routeId)
                        "
                        [attr.aria-label]="
                          (global.isRouteLiked()(tr.routeId)
                            ? 'actions.favorite.remove'
                            : 'actions.favorite.add'
                          ) | translate
                        "
                        [attr.title]="
                          (global.isRouteLiked()(tr.routeId)
                            ? 'actions.favorite.remove'
                            : 'actions.favorite.add'
                          ) | translate
                        "
                      ></tui-badge>
                    </aside>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      {{ 'labels.number' | translate }}: #{{ tr.number }}
                    </div>
                    <div class="text-sm mt-1">
                      {{ 'labels.grade' | translate }}:
                      {{ tr.route?.grade || '—' }}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <p>{{ 'common.loading' | translate }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto p-4' },
})
export class TopoComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  topoId = signal<string | null>(null);
  topo = computed<Topo | null>(() => {
    const id = this.topoId();
    return id ? this.global.topos().find((t) => t.id === id) || null : null;
  });

  topoRoutesDetailed = computed(() => {
    const id = this.topoId();
    if (!id) return [] as (TopoRoute & { route?: Route })[];
    const tr = this.global.topoRoutes().filter((r) => r.topoId === id);
    const routesIndex = new Map(
      this.global.routesData().map((r) => [r.id, r] as const),
    );
    return tr.map((item) => ({
      ...item,
      route: routesIndex.get(item.routeId),
    }));
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.topoId.set(id);
    this.global.setSelectedTopo(id);
    // set selected crag and zone from topo context if possible
    const topo = this.global.topos().find((t) => t.id === id);
    if (topo) {
      this.global.setSelectedCrag(topo.cragId);
      const crag = this.global.crags().find((c) => c.id === topo.cragId);
      if (crag) this.global.setSelectedZone(crag.zoneId);
      // entering a topo clears any specific route selection
      this.global.setSelectedRoute(null);
    }
  }

  goBack(): void {
    this.location.back();
  }
}
