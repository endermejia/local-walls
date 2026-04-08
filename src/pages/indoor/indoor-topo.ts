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
  selector: 'app-indoor-topo',
  standalone: true,
  imports: [CommonModule, ],
  template: `
    <div class="flex flex-col h-full overflow-y-auto p-4 bg-base-100">
      @if (topo()) {
        <div class="mb-4">
          <h1 class="text-3xl font-bold">{{ topo()?.name }}</h1>
          <div class="text-sm mt-1">
            {{ topo()?.start_date | date }} - {{ topo()?.end_date | date }}
          </div>
        </div>

        <div class="mb-4 relative w-full" style="padding-bottom: 75%;">
          <img
            [src]="topo()?.image_url"
            alt="Topo {{ topo()?.name }}"
            class="absolute top-0 left-0 w-full h-full object-contain bg-base-200 rounded-lg"
          />
        </div>

        <div class="mt-8">
          <h2 class="text-2xl font-bold mb-4">Fotos</h2>
          <!-- Placeholder para galería de fotos -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div class="aspect-square bg-base-200 rounded-lg flex items-center justify-center">
              <span class="text-base-content/50">No hay fotos</span>
            </div>
          </div>

          <div class="max-w-sm">
            <h3 class="text-lg font-bold mb-2">Subir foto</h3>
            <button class="tui-button" size="m" (click)="uploadPhoto()">Seleccionar archivo</button>
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
export class IndoorTopoComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly indoorService = inject(IndoorService);

  private readonly paramMap = toSignal(this.route.paramMap);
  protected readonly topoId = computed(() => this.paramMap()?.get('id'));

  private readonly topoResource = resource({
    params: () => this.topoId(),
    loader: async ({ params: id }) => {
      if (!id) return null;
      return await new Promise((resolve) => {
        this.indoorService.getTopo(id).subscribe(resolve);
      });
    },
  });

  protected readonly topo = computed<any>(() => this.topoResource.value());

  protected uploadPhoto(): void {
    console.log('Upload photo dialog');
  }
}
