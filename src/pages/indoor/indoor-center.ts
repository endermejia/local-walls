import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { TuiButton, TuiLoader } from '@taiga-ui/core';
import { TuiTabs } from '@taiga-ui/kit';

import { IndoorService } from '../../services/indoor.service';

@Component({
  selector: 'app-indoor-center',
  standalone: true,
  imports: [
    CommonModule,
    TuiTabs, RouterLink,
  ],
  template: `
    <div class="flex flex-col h-full overflow-y-auto p-4 bg-base-100">
      @if (center()) {
        <div class="mb-4">
          <h1 class="text-3xl font-bold">{{ center()?.name }}</h1>
          @if (center()?.city || center()?.country) {
            <p class="text-base-content/70">{{ center()?.city }}, {{ center()?.country }}</p>
          }
          <p class="mt-2">{{ center()?.description }}</p>
          <div class="mt-4">
            <button class="tui-button" size="m" (click)="buyPass()">Comprar bonos</button>
          </div>
        </div>

        <tui-tabs [(activeItemIndex)]="activeTab" class="mb-4">
          <button tuiTab>Topos</button>
          <button tuiTab>Routes</button>
          <button tuiTab>Ascents</button>
        </tui-tabs>

        @if (activeTab() === 0) {
          <div>
            <div class="mb-4 max-w-sm">
              <h3 class="text-lg font-semibold mb-2">Filtrar por fecha</h3>
              <p class="text-sm text-base-content/70">Topos activos mostrados por defecto</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              @for (tp of topos(); track tp.id) {
                <div
                  class="bg-base-200 rounded-lg p-4 cursor-pointer hover:bg-base-300 transition-colors"
                  [routerLink]="['/indoor', center()?.slug, 'topo', tp.id]"
                >
                  <h4 class="font-bold">{{ tp.name }}</h4>
                  <div class="text-sm mt-1">
                    {{ tp.start_date | date }} - {{ tp.end_date | date }}
                  </div>
                </div>
              }
            </div>
          </div>
        }

        @if (activeTab() === 1) {
          <div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              @for (rt of routes(); track rt.id) {
                <div
                  class="bg-base-200 rounded-lg p-4 cursor-pointer hover:bg-base-300 transition-colors"
                  [routerLink]="['/indoor', center()?.slug, 'route', rt.id]"
                >
                  <div class="flex items-center gap-2">
                    @if (rt.color) {
                      <div class="w-4 h-4 rounded-full" [style.backgroundColor]="rt.color"></div>
                    }
                    <h4 class="font-bold">{{ rt.name }}</h4>
                  </div>
                  @if (rt.grade) {
                    <div class="text-sm mt-1">Grado: {{ rt.grade }}</div>
                  }
                </div>
              }
            </div>
          </div>
        }

        @if (activeTab() === 2) {
          <div>
            <p class="text-center p-8 bg-base-200 rounded-lg">Lista de ascensos del centro</p>
          </div>
        }

      } @else {
        <div class="flex items-center justify-center h-64">
          <span>Cargando...</span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorCenterComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly indoorService = inject(IndoorService);

  private readonly paramMap = toSignal(this.route.paramMap);
  protected readonly slug = computed(() => this.paramMap()?.get('slug'));

  protected readonly activeTab = signal(0);

  private readonly centerResource = resource({
    params: () => this.slug(),
    loader: async ({ params: slug }) => {
      if (!slug) return null;
      return await new Promise((resolve) => {
        this.indoorService.getCenter(slug).subscribe(resolve);
      });
    },
  });

  protected readonly center = computed<any>(() => this.centerResource.value());

  private readonly toposResource = resource({
    params: () => ((this.center() as any) || {}).id,
    loader: async ({ params: centerId }) => {
      if (!centerId) return [];
      return await new Promise((resolve) => {
        this.indoorService.getTopos(centerId).subscribe(resolve);
      });
    },
  });

  protected readonly topos = computed<any[]>(() => (this.toposResource.value() as any[]) || []);

  private readonly routesResource = resource({
    params: () => ((this.center() as any) || {}).id,
    loader: async ({ params: centerId }) => {
      if (!centerId) return [];
      return await new Promise((resolve) => {
        this.indoorService.getRoutes(centerId).subscribe(resolve);
      });
    },
  });

  protected readonly routes = computed<any[]>(() => (this.routesResource.value() as any[]) || []);

  protected buyPass(): void {
    console.log('Open buy pass dialog');
  }
}
