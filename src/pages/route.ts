import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GlobalData } from '../services';
import { Location } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '../components/section-header';
import { Route } from '../models';

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [SectionHeaderComponent, TranslatePipe],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      @if (route(); as r) {
        <app-section-header
          [title]="r.name"
          [liked]="global.isRouteLiked()(r.id)"
          (back)="goBack()"
          (toggleLike)="global.toggleLikeRoute(r.id)"
        />
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
  host: { class: 'flex grow overflow-auto sm:p-4' },
})
export class RouteComponent {
  private readonly routeParam = inject(ActivatedRoute);
  protected readonly global = inject(GlobalData);
  private readonly location = inject(Location);

  routeId: WritableSignal<string | null> = signal<string | null>(null);
  route: Signal<Route | null> = computed(() => {
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
