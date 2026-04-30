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

import { TuiAppearance, TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../../services/global-data';
import { AreaPackDetail } from '../../models';
import { CarouselItem, CustomCarouselComponent } from '../ui/custom-carousel';

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
    TuiBadge,
    TuiButton,
    TuiIcon,
    CustomCarouselComponent,
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
        <app-custom-carousel
          [items]="carouselItems()"
          [(index)]="index"
          [objectCover]="true"
          maxHeight="100%"
          [hideArrowsUntilHover]="true"
          class="w-full h-full"
          [class.grayscale]="pack().active === false"
          [class.opacity-50]="pack().active === false"
        />

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

  protected readonly carouselItems = computed<CarouselItem[]>(() => {
    const imageUrls = this.pack().image_urls;
    const urls =
      imageUrls && imageUrls.length > 0 ? imageUrls : ['/logo/climbeast.svg'];

    return urls.map((url) => ({ type: 'image', url }));
  });
}
