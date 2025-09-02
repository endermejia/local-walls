import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  output,
  PLATFORM_ID,
  ViewChild,
  effect,
  InputSignal,
  OutputEmitterRef,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Crag, MapOptions, MapVisibleElements } from '../models';
import { MapBuilder } from '../services/map-builder';
import type { MapBuilderCallbacks } from '../services/map-builder';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `
    <div
      #container
      class="w-full grow min-h-0"
      aria-label="Interactive map"
      role="application"
    ></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow min-h-0 w-full',
  },
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mapBuilder = inject(MapBuilder);

  private readonly mapInitialized = signal(false);
  public crags: InputSignal<readonly Crag[]> = input<readonly Crag[]>([]);
  public selectedCrag: InputSignal<Crag | null> = input<Crag | null>(null);
  public selectedCragChange: OutputEmitterRef<Crag | null> =
    output<Crag | null>();
  public options: InputSignal<MapOptions> = input<MapOptions>({
    center: [39.5, -0.5],
    zoom: 7,
    maxZoom: 19,
    minZoom: 5,
  });
  public mapClick = output<void>();
  public interactionStart = output<void>();
  public visibleChange = output<MapVisibleElements>();

  private readonly callbacks: MapBuilderCallbacks = {
    onSelectedCragChange: (crag) => this.selectedCragChange.emit(crag),
    onMapClick: () => this.mapClick.emit(),
    onInteractionStart: () => this.interactionStart.emit(),
    onVisibleChange: (visible) => this.visibleChange.emit(visible),
  };

  @ViewChild('container', { read: ElementRef })
  private containerRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const crags = this.crags();
      const selected = this.selectedCrag();
      if (this.mapInitialized()) {
        void this.mapBuilder.updateData(crags, selected, this.callbacks);
      }
    });
  }

  ngAfterViewInit(): void {
    this.tryInit();
  }

  ngOnDestroy(): void {
    try {
      this.mapBuilder.destroy();
    } catch {
      // ignore
    }
    this.mapInitialized.set(false);
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  private tryInit(): void {
    const el = this.containerRef?.nativeElement;
    if (!el || this.mapInitialized() || !this.isBrowser()) return;
    const raf = (
      window as unknown as {
        requestAnimationFrame?: (cb: FrameRequestCallback) => number;
      }
    ).requestAnimationFrame;
    if (typeof raf === 'function') {
      raf(() => void this.initMap());
    } else {
      void this.initMap();
    }
  }

  private async initMap(): Promise<void> {
    if (this.mapInitialized() || !this.isBrowser()) return;
    const el = this.containerRef?.nativeElement;
    if (!el) return;
    await this.mapBuilder.init(
      el,
      this.options(),
      this.crags(),
      this.selectedCrag(),
      this.callbacks,
    );
    this.mapInitialized.set(true);
  }
}
