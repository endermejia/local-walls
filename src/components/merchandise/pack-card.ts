import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { TuiAppearance, TuiButton, TuiCarousel, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../../services/global-data';
import { AreaPackDetail } from '../../models';

@Component({
  selector: 'app-pack-card',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    TranslatePipe,
    TuiAppearance,
    TuiBadge,
    TuiButton,
    TuiCarousel,
    TuiIcon,
  ],
  template: `
    <article
      class="group relative flex flex-col rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
      style="background: var(--tui-background-base); border: 1px solid var(--tui-border-normal);"
      role="button"
      tabindex="0"
      [attr.aria-label]="pack().name"
      (click)="clicked.emit(pack())"
      (keydown.enter)="clicked.emit(pack())"
      (keydown.space)="clicked.emit(pack()); $event.preventDefault()"
    >
      <!-- Illustration / Image -->
      <div
        class="relative h-48 overflow-hidden bg-(--tui-background-neutral-1)"
      >
        @let images =
          pack().image_urls?.length
            ? pack().image_urls
            : pack().image_url
              ? [pack().image_url]
              : ['/assets/images/area-pack-promo.png'];

        @if (images && images.length > 0) {
          <tui-carousel #carousel [(index)]="index" class="w-full h-full">
            <ng-template tuiItem let-i>
              @let n = images.length;
              <div class="w-full h-full overflow-hidden">
                <img
                  [src]="images[((i % n) + n) % n]"
                  [alt]="pack().name"
                  [class.grayscale]="pack().active === false"
                  [class.opacity-50]="pack().active === false"
                  class="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000"
                />
              </div>
            </ng-template>
          </tui-carousel>

          @if (images.length > 1) {
            @let ni =
              ((index() % images.length) + images.length) % images.length;
            <button
              type="button"
              class="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 text-white"
              (click)="carousel.prev(); $event.stopPropagation()"
            >
              <tui-icon icon="@tui.chevron-left" class="text-xs" />
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 text-white"
              (click)="carousel.next(); $event.stopPropagation()"
            >
              <tui-icon icon="@tui.chevron-right" class="text-xs" />
            </button>
            <div
              class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10 pointer-events-none bg-black/30 backdrop-blur-sm rounded-full px-2 py-1"
            >
              @for (_ of images; track $index; let i = $index) {
                <div
                  class="h-1.5 rounded-full bg-white transition-all duration-300"
                  [style.width.rem]="ni === i ? 1 : 0.375"
                  [style.opacity]="ni === i ? '1' : '0.45'"
                ></div>
              }
            </div>
          }
        }

        <div class="absolute top-4 right-4 z-10">
          <span
            tuiBadge
            appearance="primary"
            size="l"
            class="shadow-xl font-black rounded-xl! border border-white/20"
          >
            {{ pack().price | number: '1.2-2' }}€
          </span>
        </div>

        @if (isAdmin() && global.editingMode()) {
          <div class="absolute top-4 left-4 flex flex-col gap-2 z-10">
            <button
              tuiIconButton
              appearance="accent"
              size="s"
              type="button"
              class="rounded-xl! shadow-lg bg-(--tui-background-accent-1)! text-(--tui-background-base)!"
              (click)="edit.emit(pack()); $event.stopPropagation()"
            >
              <tui-icon icon="@tui.pencil" />
            </button>

            @if (pack().active === false) {
              <span tuiBadge>
                {{ 'merchandising.items.inactive' | translate }}
              </span>
            }
          </div>
        }
      </div>

      <div class="flex flex-col p-8 gap-4">
        <h3
          class="font-black text-2xl leading-tight tracking-tight flex-1 text-balance"
        >
          {{ pack().name }}
        </h3>

        @if (pack().description) {
          <p class="text-sm text-(--tui-text-secondary) leading-relaxed">
            {{ pack().description }}
          </p>
        }

        <!-- Area listing -->
        <div class="flex flex-wrap gap-2 pt-2">
          @for (item of pack().items; track item.area_id) {
            <span
              tuiBadge
              appearance="primary"
              size="m"
              class="font-semibold rounded-xl! opacity-90"
            >
              {{ item.area.name }}
            </span>
          }
        </div>
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PackCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly isAdmin = this.global.isAdmin;

  pack = input.required<AreaPackDetail>();
  clicked = output<AreaPackDetail>();
  edit = output<AreaPackDetail>();

  protected readonly index = signal(0);
}
