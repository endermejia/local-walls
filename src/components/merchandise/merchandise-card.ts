import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TuiCardLarge } from '@taiga-ui/layout';

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
    TuiBadge,
    TuiButton,
    CustomCarouselComponent,
    TuiIcon,
    TuiCardLarge,
  ],
  template: `
    <button
      tuiCardLarge
      appearance="floating"
      class="w-full h-full flex flex-col gap-4 text-start rounded-[2.5rem]! p-4! overflow-hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-accent group relative border border-(--tui-border-normal)"
      type="button"
      [attr.aria-label]="item().name"
      (click)="clicked.emit(item())"
    >
      <!-- Image Container -->
      <div
        class="relative aspect-square w-full rounded-[1.8rem] overflow-hidden border border-(--tui-border-normal) shrink-0 bg-(--tui-background-neutral-1)"
      >
        @let images = item().image_urls || [];

        @if (images && images.length > 0) {
          <app-custom-carousel
            [items]="carouselItems()"
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
        <div class="absolute top-3 right-3 z-10">
          <span
            tuiBadge
            appearance="primary"
            size="m"
            class="shadow-md font-black rounded-lg! border border-white/20"
          >
            {{ item().price | number: '1.2-2' }}€
          </span>
        </div>

        @if (isAdmin() && global.editingMode()) {
          <div class="absolute top-3 left-3 flex flex-col gap-2 z-10">
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
              <span tuiBadge size="s">
                {{ 'merchandising.items.inactive' | translate }}
              </span>
            }
          </div>
        }
      </div>

      <!-- Info Container -->
      <div class="flex flex-col gap-1 w-full px-1 pb-1">
        <span
          class="font-black text-lg truncate leading-tight text-(--tui-text-primary)"
        >
          {{ item().name }}
        </span>
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
    </button>
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

  protected readonly carouselItems = computed(() => {
    return (this.item().image_urls || []).map((url) => ({
      type: 'image' as const,
      url,
      alt: this.item().name,
    }));
  });
}
