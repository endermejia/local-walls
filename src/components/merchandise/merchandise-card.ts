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
import { MerchandiseItemDetail } from '../../models';

@Component({
  selector: 'app-merchandise-card',
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
      class="flex flex-col gap-4 group cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent rounded-[2.5rem]"
      role="button"
      tabindex="0"
      [attr.aria-label]="item().name"
      (click)="clicked.emit(item())"
      (keydown.enter)="clicked.emit(item())"
      (keydown.space)="clicked.emit(item()); $event.preventDefault()"
    >
      <div
        class="relative aspect-square rounded-[2.5rem] overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1.5 border border-(--tui-border-normal)"
        style="background: var(--tui-background-neutral-1)"
      >
        @let images =
          item().image_urls?.length
            ? item().image_urls
            : item().image_url
              ? [item().image_url]
              : [];

        @if (images && images.length > 0) {
          <tui-carousel #carousel [(index)]="index" class="w-full h-full">
            <ng-template tuiItem let-i>
              @let n = images.length;
              <div class="w-full h-full overflow-hidden">
                <img
                  [src]="images[((i % n) + n) % n]"
                  [alt]="item().name"
                  [class.grayscale]="item().active === false"
                  [class.opacity-50]="item().active === false"
                  class="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
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
        } @else {
          <div class="w-full h-full flex items-center justify-center p-12">
            <tui-icon
              icon="@tui.shirt"
              class="text-(--tui-text-tertiary) text-7xl opacity-20"
            />
          </div>
        }

        <!-- Price badge -->
        <div class="absolute top-4 right-4 z-10">
          <span
            tuiBadge
            appearance="primary"
            size="l"
            class="shadow-xl font-black rounded-xl! border border-white/20"
          >
            {{ item().price | number: '1.2-2' }}€
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
              (click)="edit.emit(item()); $event.stopPropagation()"
            >
              <tui-icon icon="@tui.pencil" />
            </button>

            @if (item().active === false) {
              <span tuiBadge>
                {{ 'merchandising.items.inactive' | translate }}
              </span>
            }
          </div>
        }
      </div>

      <div class="flex flex-col px-2 gap-1">
        <span class="font-black text-lg truncate leading-tight">{{
          item().name
        }}</span>
        @if (item().category) {
          <span
            class="text-[10px] font-bold uppercase tracking-widest text-(--tui-text-tertiary)"
          >
            {{
              'merchandising.filter.' + item().category!.toLowerCase()
                | translate
            }}
          </span>
        }
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchandiseCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly isAdmin = this.global.isAdmin;

  item = input.required<MerchandiseItemDetail>();
  clicked = output<MerchandiseItemDetail>();
  edit = output<MerchandiseItemDetail>();

  protected readonly index = signal(0);
}
