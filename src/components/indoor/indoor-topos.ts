import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  computed,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GlobalData } from '../../services/global-data';

import { TuiAppearance, TuiLoader, TuiButton } from '@taiga-ui/core';

import { IndoorService } from '../../services/indoor.service';
import { SupabaseService } from '../../services/supabase.service';
import { IndoorTopoDto } from '../../models';
import { EmptyStateComponent } from '../ui/empty-state';

@Component({
  selector: 'app-indoor-topos',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TuiAppearance,
    TuiLoader,
    TuiButton,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex flex-col gap-6">
      @if (canEdit()) {
        <div class="flex justify-end px-3">
          <button
            tuiButton
            appearance="textfield"
            size="s"
            iconStart="@tui.plus"
            (click.zoneless)="createTopo()"
          >
            {{ 'new' | translate }}
          </button>
        </div>
      }

      @if (toposResource.value(); as topos) {
        @if (topos.length > 0) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            @for (topo of topos; track topo.id) {
              <div
                tuiAppearance="flat-grayscale"
                class="rounded-3xl overflow-hidden flex flex-col group cursor-pointer relative"
              >
                @if (canEdit()) {
                  <div
                    class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      tuiIconButton
                      appearance="flat-grayscale"
                      size="s"
                      iconStart="@tui.square-pen"
                      class="rounded-full! bg-white/80 dark:bg-black/80 backdrop-blur"
                      [attr.aria-label]="'edit' | translate"
                      (click.zoneless)="editTopo(topo, $event)"
                    ></button>
                    <button
                      tuiIconButton
                      appearance="flat-grayscale"
                      size="s"
                      iconStart="@tui.trash"
                      class="rounded-full! bg-white/80 dark:bg-black/80 backdrop-blur text-red-500"
                      [attr.aria-label]="'delete' | translate"
                      (click.zoneless)="deleteTopo(topo, $event)"
                    ></button>
                  </div>
                }
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
          <app-empty-state />
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
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);

  protected readonly canEdit = computed(() => {
    return this.global.indoorAdminPermissions()[this.centerId()];
  });

  protected readonly toposResource = resource({
    params: () => this.centerId(),
    loader: ({ params: id }): Promise<IndoorTopoDto[]> =>
      this.indoor.getCenterTopos(id),
  });

  async createTopo(): Promise<void> {
    const success = await this.indoor.openIndoorTopoForm(this.centerId());
    if (success) {
      this.toposResource.reload();
    }
  }

  async editTopo(topo: IndoorTopoDto, event: Event): Promise<void> {
    event.stopPropagation();
    const success = await this.indoor.openIndoorTopoForm(this.centerId(), topo);
    if (success) {
      this.toposResource.reload();
    }
  }

  async deleteTopo(topo: IndoorTopoDto, event: Event): Promise<void> {
    event.stopPropagation();
    if (confirm(this.translate.instant('deleteCommentConfirm'))) {
      await this.indoor.deleteTopo(topo.id);
      this.toposResource.reload();
    }
  }
}
