import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeUrl } from '@angular/platform-browser';
import { ZoomPanHandler } from '../utils/zoom-pan.utils';

@Component({
  selector: 'app-zoomable-image',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="w-full h-full overflow-hidden cursor-move touch-none flex items-center justify-center relative bg-[var(--tui-background-neutral-1)]"
      #container
      (wheel.zoneless)="onWheel($event)"
      (touchstart.zoneless)="onTouchStart($event)"
      (touchmove.zoneless)="onTouchMove($event)"
      (touchend.zoneless)="onTouchEnd()"
      (mousedown.zoneless)="onMouseDown($event)"
      (mousemove.zoneless)="onMouseMove($event)"
      (mouseup.zoneless)="onMouseUp()"
      (mouseleave.zoneless)="onMouseUp()"
    >
      <div
        class="relative transition-transform duration-75 ease-out origin-top-left zoom-container"
        [style.transform]="transform()"
        (click)="onContainerClick($event)"
        #content
      >
        <img
          [src]="src"
          [alt]="alt"
          class="block select-none pointer-events-none object-contain"
          [ngClass]="imageClass"
          draggable="false"
          (load)="onImageLoad($event)"
        />
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .zoom-container {
      display: inline-block;
      vertical-align: middle;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZoomableImageComponent {
  @Input({ required: true }) src!: string | SafeUrl;
  @Input() alt = '';

  @Input() set minScale(val: number) { this.zoomHandler.minScale = val; }
  @Input() set maxScale(val: number) { this.zoomHandler.maxScale = val; }

  @Input() imageClass = 'h-full w-auto max-w-none';

  @Output() imageLoad = new EventEmitter<{ width: number; height: number; ratio: number; element: HTMLImageElement }>();
  @Output() zoomChange = new EventEmitter<{ scale: number; x: number; y: number }>();
  @Output() imageClick = new EventEmitter<MouseEvent>();

  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('content') contentRef!: ElementRef<HTMLDivElement>;

  protected zoomHandler = new ZoomPanHandler(1, 5);

  protected readonly transform = computed(() => {
    const s = this.zoomHandler.scale();
    const t = this.zoomHandler.translate();
    return `translate(${t.x}px, ${t.y}px) scale(${s})`;
  });

  constructor() {
    effect(() => {
        const s = this.zoomHandler.scale();
        const t = this.zoomHandler.translate();
        this.zoomChange.emit({ scale: s, x: t.x, y: t.y });
    });
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.naturalWidth && img.naturalHeight) {
       this.imageLoad.emit({
        width: img.naturalWidth,
        height: img.naturalHeight,
        ratio: img.naturalWidth / img.naturalHeight,
        element: img
      });
    }

    this.zoomHandler.reset();
  }

  onContainerClick(event: MouseEvent): void {
      if (!this.zoomHandler.hasMoved()) {
          this.imageClick.emit(event);
      }
  }

  private constrain() {
      const rect = this.containerRef.nativeElement.getBoundingClientRect();
      const contentWidth = this.contentRef.nativeElement.offsetWidth;
      const contentHeight = this.contentRef.nativeElement.offsetHeight;
      this.zoomHandler.constrainTranslation(rect, contentWidth, contentHeight);
  }

  onWheel(e: Event) {
      this.zoomHandler.handleWheel(e as WheelEvent, this.containerRef.nativeElement.getBoundingClientRect());
      this.constrain();
  }

  onTouchStart(e: Event) { this.zoomHandler.handleTouchStart(e as TouchEvent, this.containerRef.nativeElement.getBoundingClientRect()); }

  onTouchMove(e: Event) {
      this.zoomHandler.handleTouchMove(e as TouchEvent, this.containerRef.nativeElement.getBoundingClientRect());
      this.constrain();
  }

  onTouchEnd() { this.zoomHandler.handleTouchEnd(); }
  onMouseDown(e: Event) { this.zoomHandler.handleMouseDown(e as MouseEvent); }

  onMouseMove(e: Event) {
      this.zoomHandler.handleMouseMove(e as MouseEvent);
      this.constrain();
  }

  onMouseUp() { this.zoomHandler.handleMouseUp(); }

  reset() {
      this.zoomHandler.reset();
  }

  get scale() { return this.zoomHandler.scale(); }
  get translate() { return this.zoomHandler.translate(); }
}
