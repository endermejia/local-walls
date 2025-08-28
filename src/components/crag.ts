import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GlobalData } from '../services';
import { TuiTitle, TuiSurface } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
import type { Crag, Topo, Parking } from '../models';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-crag',
  standalone: true,
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TuiSurface,
    TuiBadge,
    TranslatePipe,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (crag(); as c) {
        <header class="mb-4 flex items-start justify-between gap-2">
          <div>
            <h1 class="text-2xl font-bold">{{ c.name }}</h1>
            @if (c.description) {
              <p class="mt-2 opacity-80">{{ c.description }}</p>
            }
          </div>
          <tui-badge
            [appearance]="global.isCragLiked(c.id) ? 'negative' : 'neutral'"
            iconStart="@tui.heart"
            size="xl"
            (click.zoneless)="global.toggleLikeCrag(c.id)"
            [attr.aria-label]="
              (global.isCragLiked(c.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
            [attr.title]="
              (global.isCragLiked(c.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
          ></tui-badge>
        </header>

        <div class="mt-4">
          <h2 class="text-xl font-semibold">
            {{ 'labels.parkings' | translate }}
          </h2>
          <ul class="mt-2 grid gap-2">
            @for (p of cragParkings(); track p.id) {
              <li class="p-3 rounded border">
                <div class="font-medium">{{ p.name }}</div>
                <div class="text-sm opacity-70">
                  {{ 'labels.lat' | translate }}: {{ p.ubication.lat }} ·
                  {{ 'labels.lng' | translate }}: {{ p.ubication.lng }}
                </div>
                @if (p.capacity) {
                  <div class="text-sm opacity-70">
                    {{ 'labels.capacity' | translate }}: {{ p.capacity }}
                  </div>
                }
              </li>
            }
          </ul>
        </div>

        @if (likedTopos().length) {
          <h2 class="text-xl font-semibold mt-6 mb-2">
            {{ 'labels.toposFavorites' | translate }}
          </h2>
          <div class="grid gap-2">
            @for (t of likedTopos(); track t.id) {
              <div
                tuiCardLarge
                tuiSurface="neutral"
                class="tui-space_top-4 cursor-pointer"
                [routerLink]="['/topo', t.id]"
              >
                <header tuiHeader>
                  <h2 tuiTitle>{{ t.name }}</h2>
                  <aside tuiAccessories>
                    <tui-badge
                      [appearance]="
                        global.isTopoLiked(t.id) ? 'negative' : 'neutral'
                      "
                      iconStart="@tui.heart"
                      size="xl"
                      (click.zoneless)="
                        $event.stopPropagation(); global.toggleLikeTopo(t.id)
                      "
                      [attr.aria-label]="
                        (global.isTopoLiked(t.id)
                          ? 'actions.favorite.remove'
                          : 'actions.favorite.add'
                        ) | translate
                      "
                      [attr.title]="
                        (global.isTopoLiked(t.id)
                          ? 'actions.favorite.remove'
                          : 'actions.favorite.add'
                        ) | translate
                      "
                    ></tui-badge>
                  </aside>
                </header>
                <section>
                  <div class="text-sm opacity-80">
                    {{ 'labels.routes' | translate }}:
                    {{ topoRouteCount(t.id) }}
                  </div>
                </section>
              </div>
            }
          </div>
        }

        <h2 class="text-xl font-semibold mt-6 mb-2">
          {{ 'labels.topos' | translate }}
        </h2>
        <div class="grid gap-2">
          @for (t of otherTopos(); track t.id) {
            <div
              tuiCardLarge
              tuiSurface="neutral"
              class="tui-space_top-4 cursor-pointer"
              [routerLink]="['/topo', t.id]"
            >
              <header tuiHeader>
                <h2 tuiTitle>{{ t.name }}</h2>
                <aside tuiAccessories>
                  <tui-badge
                    [appearance]="
                      global.isTopoLiked(t.id) ? 'negative' : 'neutral'
                    "
                    iconStart="@tui.heart"
                    size="xl"
                    (click.zoneless)="
                      $event.stopPropagation(); global.toggleLikeTopo(t.id)
                    "
                    [attr.aria-label]="
                      (global.isTopoLiked(t.id)
                        ? 'actions.favorite.remove'
                        : 'actions.favorite.add'
                      ) | translate
                    "
                    [attr.title]="
                      (global.isTopoLiked(t.id)
                        ? 'actions.favorite.remove'
                        : 'actions.favorite.add'
                      ) | translate
                    "
                  ></tui-badge>
                </aside>
              </header>
              <section>
                <div class="text-sm opacity-80">
                  {{ 'labels.routes' | translate }}: {{ topoRouteCount(t.id) }}
                </div>
              </section>
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
export class CragComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly global = inject(GlobalData);

  cragId = signal<string | null>(null);
  crag = computed<Crag | null>(() => {
    const id = this.cragId();
    return id ? this.global.crags().find((c) => c.id === id) || null : null;
  });

  toposAll = this.global.selectedCragTopos;
  likedTopos = computed<Topo[]>(() => {
    const liked = new Set(this.global.appUser()?.likedTopos ?? []);
    return this.toposAll().filter((t) => liked.has(t.id));
  });
  otherTopos = computed<Topo[]>(() => {
    const liked = new Set(this.global.appUser()?.likedTopos ?? []);
    return this.toposAll().filter((t) => !liked.has(t.id));
  });

  cragParkings = computed<Parking[]>(() => {
    const c = this.crag();
    if (!c) return [];
    const ids = new Set(c.parkings);
    return this.global.parkings().filter((p) => ids.has(p.id));
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    this.cragId.set(id);
    this.global.setSelectedCrag(id);
    const crag = this.global.crags().find((c) => c.id === id);
    if (crag) {
      this.global.setSelectedZone(crag.zoneId);
    }
    this.global.setSelectedTopo(null);
    this.global.setSelectedRoute(null);
  }

  topoRouteCount(topoId: string): number {
    return this.global.topoRoutes().filter((r) => r.topoId === topoId).length;
  }
}
