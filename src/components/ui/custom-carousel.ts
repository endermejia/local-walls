import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { SafeResourceUrl } from '@angular/platform-browser';

export interface CarouselItem {
  type: 'image' | 'video';
  url: string | SafeResourceUrl;
  alt?: string;
}

@Component({
  selector: 'app-custom-carousel',
  standalone: true,
  imports: [CommonModule, TuiIcon],
  template: `
    <div
      class="relative w-full h-full overflow-hidden group rounded-inherit touch-pan-y"
      (mouseenter)="isHovered.set(true)"
      (mouseleave)="isHovered.set(false)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd()"
    >
      <!-- Carousel Track -->
      <div
        class="flex h-full"
        [class.transition-transform]="!isDragging()"
        [class.duration-500]="!isDragging()"
        [class.ease-out]="!isDragging()"
        [style.transform]="
          'translateX(calc(-' + index() * 100 + '% + ' + touchOffset() + 'px))'
        "
      >
        @for (item of items(); track $index) {
          <div
            class="w-full shrink-0 flex items-center justify-center min-h-[inherit]"
          >
            @if (item.type === 'image') {
              <img
                [src]="item.url"
                [alt]="item.alt || ''"
                class="w-full h-auto block object-contain select-none"
                [style.max-height]="maxHeight()"
                [class.cursor-pointer]="clickable()"
                [class.object-cover]="objectCover()"
                [class.h-full]="objectCover()"
                [attr.tabindex]="clickable() ? 0 : null"
                [attr.role]="clickable() ? 'button' : null"
                (click)="clickable() && imageClick.emit(item.url)"
                (keydown.enter)="clickable() && imageClick.emit(item.url)"
              />
            } @else {
              <div class="w-full aspect-video flex items-center justify-center">
                <iframe
                  [src]="item.url"
                  class="w-full h-full max-w-full"
                  frameborder="0"
                  allowfullscreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              </div>
            }
          </div>
        }
      </div>

      <!-- Navigation Arrows -->
      @if (items().length > 1) {
        <button
          type="button"
          class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white hover:bg-black/70 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
          [class.opacity-0]="!isHovered() && hideArrowsUntilHover()"
          [class.pointer-events-none]="!isHovered() && hideArrowsUntilHover()"
          [disabled]="index() === 0"
          (click)="prev(); $event.stopPropagation()"
        >
          <tui-icon icon="@tui.chevron-left" class="text-sm" />
        </button>
        <button
          type="button"
          class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white hover:bg-black/70 transition-all duration-300 disabled:opacity-0 disabled:pointer-events-none"
          [class.opacity-0]="!isHovered() && hideArrowsUntilHover()"
          [class.pointer-events-none]="!isHovered() && hideArrowsUntilHover()"
          [disabled]="index() === items().length - 1"
          (click)="next(); $event.stopPropagation()"
        >
          <tui-icon icon="@tui.chevron-right" class="text-sm" />
        </button>

        <!-- Dots -->
        <div
          class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1 transition-opacity duration-300"
          [class.opacity-0]="!isHovered() && hideDotsUntilHover()"
        >
          @for (_ of items(); track $index; let i = $index) {
            <div
              class="h-1.5 rounded-full bg-white transition-all duration-300"
              [style.width.rem]="index() === i ? 1 : 0.375"
              [style.opacity]="index() === i ? '1' : '0.45'"
            ></div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
      .rounded-inherit {
        border-radius: inherit;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomCarouselComponent {
  items = input.required<CarouselItem[]>();
  index = model(0);
  clickable = input(false);
  objectCover = input(false);
  maxHeight = input('500px');
  hideArrowsUntilHover = input(false);
  hideDotsUntilHover = input(false);

  imageClick = output<string | SafeResourceUrl>();

  protected readonly isHovered = signal(false);
  protected readonly touchOffset = signal(0);
  protected readonly isDragging = signal(false);

  private touchStartX = 0;
  private readonly swipeThreshold = 50;

  next(): void {
    if (this.index() < this.items().length - 1) {
      this.index.update((i) => i + 1);
    }
  }

  prev(): void {
    if (this.index() > 0) {
      this.index.update((i) => i - 1);
    }
  }

  protected onTouchStart(event: TouchEvent): void {
    if (this.items().length <= 1) return;
    this.touchStartX = event.touches[0].clientX;
    this.isDragging.set(true);
    this.touchOffset.set(0);
  }

  protected onTouchMove(event: TouchEvent): void {
    if (!this.isDragging()) return;
    const currentX = event.touches[0].clientX;
    const offset = currentX - this.touchStartX;

    // Resistance at the edges
    const isAtStart = this.index() === 0 && offset > 0;
    const isAtEnd = this.index() === this.items().length - 1 && offset < 0;

    if (isAtStart || isAtEnd) {
      this.touchOffset.set(offset * 0.3); // Apply 30% resistance
    } else {
      this.touchOffset.set(offset);
    }
  }

  protected onTouchEnd(): void {
    if (!this.isDragging()) return;

    const offset = this.touchOffset();
    this.isDragging.set(false);
    this.touchOffset.set(0);

    if (Math.abs(offset) > this.swipeThreshold) {
      if (offset > 0) {
        this.prev();
      } else {
        this.next();
      }
    }
  }
}
