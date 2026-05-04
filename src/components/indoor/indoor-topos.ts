import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TuiAppearance, TuiLoader } from '@taiga-ui/core';

import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { IndoorTopoDto } from '../../models';

@Component({
  selector: 'app-indoor-topos',
  standalone: true,
  imports: [CommonModule, TranslateModule, TuiAppearance, TuiLoader],
  template: `
    <div class="flex flex-col gap-6">
      @if (toposResource.value(); as topos) {
        @if (topos.length > 0) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (topo of topos; track topo.id) {
              <div
                tuiAppearance="flat-grayscale"
                class="rounded-3xl overflow-hidden flex flex-col group cursor-pointer"
              >
                <div
                  class="aspect-video relative overflow-hidden bg-neutral-200 dark:bg-neutral-800"
                >
                  <img
                    [src]="
                      supabase.getPublicUrl('indoor-assets', topo.image_url)
                    "
                    class="w-full h-full object-cover transition-transform group-hover:scale-105"
                    [alt]="topo.name"
                  />
                </div>
                <div class="p-4">
                  <h4 class="font-bold text-lg">{{ topo.name }}</h4>
                </div>
              </div>
            }
          </div>
        } @else {
          <div class="p-20 text-center opacity-50">
            {{ 'empty' | translate }}
          </div>
        }
      } @else if (toposResource.isLoading()) {
        <tui-loader />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorToposComponent {
  centerId = input.required<string>();

  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);

  protected readonly toposResource = resource({
    params: () => this.centerId(),
    loader: ({ params: id }): Promise<IndoorTopoDto[]> =>
      this.indoor.getCenterTopos(id),
  });
}
