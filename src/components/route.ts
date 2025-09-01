import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalData } from '../services';
import { Location } from '@angular/common';
import { TuiTitle } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [TuiHeader, TuiTitle, TuiBadge, TranslatePipe],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <header tuiHeader class="mb-4 gap-2">
          <tui-badge
            [appearance]="'neutral'"
            iconStart="@tui.chevron-left"
            size="l"
            (click.zoneless)="goBack()"
            [attr.aria-label]="'actions.back' | translate"
            [attr.title]="'actions.back' | translate"
          ></tui-badge>
          <h1 tuiTitle>{{ r.name }}</h1>
          <tui-badge
            [appearance]="global.isRouteLiked()(r.id) ? 'negative' : 'neutral'"
            iconStart="@tui.heart"
            size="xl"
            (click.zoneless)="global.toggleLikeRoute(r.id)"
            [attr.aria-label]="
              (global.isRouteLiked()(r.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
            [attr.title]="
              (global.isRouteLiked()(r.id)
                ? 'actions.favorite.remove'
                : 'actions.favorite.add'
              ) | translate
            "
          ></tui-badge>
        </header>
        @if (r.grade) {
          <p class="mt-2 opacity-80">
            {{ 'labels.grade' | translate }}: {{ r.grade }}
          </p>
        }
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
  private readonly location = inject(Location);

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

  goBack(): void {
    this.location.back();
  }
}
