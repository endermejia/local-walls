import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import {  } from '@taiga-ui/core';

import { IndoorService } from '../../services/indoor.service';

@Component({
  selector: 'app-indoor-route',
  standalone: true,
  imports: [CommonModule, ],
  template: `
    <div class="flex flex-col h-full overflow-y-auto p-4 bg-base-100">
      @if (route()) {
        <div class="mb-4">
          <div class="flex items-center gap-3">
            @if (route()?.color) {
              <div class="w-6 h-6 rounded-full" [style.backgroundColor]="route()?.color"></div>
            }
            <h1 class="text-3xl font-bold">{{ route()?.name }}</h1>
          </div>
          @if (route()?.grade) {
            <p class="text-xl mt-2">Grado: {{ route()?.grade }}</p>
          }
        </div>

        <div class="mt-8">
          <h2 class="text-2xl font-bold mb-4">Registrar Ascenso</h2>
          <!-- Reutilizando Ascent logic structure (placeholder for actual integration) -->
          <div class="p-6 bg-base-200 rounded-lg max-w-lg">
            <p class="text-center text-base-content/70">
              Formulario de ascenso (a implementar con componentes de app-ascent-card)
            </p>
          </div>
        </div>
      } @else {
        <div class="flex items-center justify-center h-64">
          <span>Cargando...</span>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorRouteComponent {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly indoorService = inject(IndoorService);

  private readonly paramMap = toSignal(this.activatedRoute.paramMap);
  protected readonly centerSlug = computed(() => this.paramMap()?.get('slug'));
  protected readonly routeId = computed(() => this.paramMap()?.get('id'));

  private readonly routeResource = resource({
    params: () => ({
      slug: this.centerSlug(),
      id: this.routeId(),
    }),
    loader: async ({ params: { slug, id } }) => {
      if (!slug || !id) return null;
      // Fetch the center and then its routes to find the matching id
      return await new Promise((resolve) => {
        this.indoorService.getCenter(slug).subscribe((center) => {
          if (!center) {
            resolve(null);
            return;
          }
          this.indoorService.getRoutes(center.id).subscribe((routes) => {
            resolve(routes.find(r => r.id === id) || null);
          });
        });
      });
    },
  });

  protected readonly route = computed<any>(() => this.routeResource.value());
}
