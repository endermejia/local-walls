import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalData } from '../services';
import { TuiButton } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [TuiButton, TuiAvatar, TranslatePipe],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <header class="mb-4 flex items-start justify-between gap-2">
          <div>
            <h1 class="text-2xl font-bold">{{ r.name }}</h1>
            @if (r.grade) {
              <p class="mt-2 opacity-80">
                {{ 'labels.grade' | translate }}: {{ r.grade }}
              </p>
            }
          </div>
          <button
            tuiButton
            [appearance]="global.isRouteLiked(r.id) ? 'secondary' : 'flat'"
            size="s"
            (click.zoneless)="global.toggleLikeRoute(r.id)"
            [attr.aria-label]="
              (global.isRouteLiked(r.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
            [attr.title]="
              (global.isRouteLiked(r.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
          >
            <tui-avatar [src]="'@tui.heart'"></tui-avatar>
          </button>
        </header>
      } @else {
        <p>{{ 'common.loading' | translate }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow overflow-auto p-4' },
})
export class RouteComponent {
  private readonly routeParam = inject(ActivatedRoute);
  protected readonly global = inject(GlobalData);

  routeId = signal<string | null>(null);
  route = computed(() => {
    const id = this.routeId();
    return id
      ? this.global.routesData().find((r) => r.id === id) || null
      : null;
  });

  constructor() {
    const id = this.routeParam.snapshot.paramMap.get('id');
    this.routeId.set(id);
    this.global.setSelectedRoute(id);
    // Try to derive topo from topoRoutes and set parent crag and zone for breadcrumb
    const tr = this.global.topoRoutes().find((x) => x.routeId === id);
    if (tr) {
      const topo = this.global.topos().find((t) => t.id === tr.topoId);
      if (topo) {
        this.global.setSelectedTopo(topo.id);
        this.global.setSelectedCrag(topo.cragId);
        const crag = this.global.crags().find((c) => c.id === topo.cragId);
        if (crag) this.global.setSelectedZone(crag.zoneId);
      }
    }
  }
}
