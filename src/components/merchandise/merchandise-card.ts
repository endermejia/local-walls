import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { TuiAppearance, TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { CustomCarouselComponent } from '../ui/custom-carousel';
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
    CustomCarouselComponent,
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
        @let images = item().image_urls || [];

        @if (images && images.length > 0) {
          @let carouselItems = getCarouselItems(images);
          <app-custom-carousel
            [items]="carouselItems"
            [(index)]="index"
            [hideArrowsUntilHover]="true"
            [hideDotsUntilHover]="true"
            [objectCover]="true"
          />
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

  protected getCarouselItems(images: string[]) {
    return images.map((url) => ({
      type: 'image' as const,
      url,
      alt: this.item().name,
    }));
  }
}
