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
import { GlobalData } from '../services';
import { ApiService } from '../services';

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
  private readonly api = inject(ApiService);
  private readonly global = inject(GlobalData);

  private readonly mapInitialized = signal(false);
  public crags: InputSignal<readonly Crag[]> = input<readonly Crag[]>([]);
  public selectedCrag: InputSignal<Crag | null> = input<Crag | null>(null);
  public selectedCragChange: OutputEmitterRef<Crag | null> =
    output<Crag | null>();
  public options: InputSignal<MapOptions> = input<MapOptions>({
    center: [39.5, -0.5],
    zoom: 7,
    maxZoom: 15,
    minZoom: 5,
  });
  public mapClick = output<void>();
  public interactionStart = output<void>();
  public visibleChange = output<MapVisibleElements>();
  // Deprecated output: Home no longer listens; kept for backward compatibility in templates
  public viewportChange = output<{
    south_west_latitude: number;
    south_west_longitude: number;
    north_east_latitude: number;
    north_east_longitude: number;
    zoom: number;
  }>();

  private _visibleCragIds: Set<string> = new Set<string>();
  private _viewportDebounce?: ReturnType<typeof setTimeout>;

  private readonly callbacks: MapBuilderCallbacks = {
    onSelectedCragChange: (crag) => this.selectedCragChange.emit(crag),
    onMapClick: () => this.mapClick.emit(),
    onInteractionStart: () => this.interactionStart.emit(),
    onVisibleChange: (visible) => {
      // Keep UI in sync
      this.visibleChange.emit(visible);
      // Track for prefetch
      this._visibleCragIds = new Set(visible.cragIds);
    },
    onViewportChange: (v) => {
      // Keep output for backwards compatibility
      this.viewportChange.emit(v);
      // Drive data loading from here (map owns fetching)
      if (!this.isBrowser()) return;
      if (this._viewportDebounce) clearTimeout(this._viewportDebounce);
      this._viewportDebounce = setTimeout(() => {
        void this.api.loadZonesAndCragsFromBounds({
          south_west_latitude: v.south_west_latitude,
          south_west_longitude: v.south_west_longitude,
          north_east_latitude: v.north_east_latitude,
          north_east_longitude: v.north_east_longitude,
          zoom: v.zoom,
          page_index: 0,
          page_size: 1000,
        });

        // Prefetch a few visible crags routes if not already loaded
        const visible = Array.from(this._visibleCragIds);
        if (visible.length) {
          const LIMIT = 5;
          const toPrefetch: string[] = [];
          for (const cragId of visible) {
            const hasTopo = this.global
              .topos()
              .some((t) => t.cragId === cragId);
            const hasTopoRoutes =
              hasTopo &&
              this.global.topoRoutes().some((tr) => {
                const t = this.global.topos().find((x) => x.id === tr.topoId);
                return t?.cragId === cragId;
              });
            if (!hasTopo || !hasTopoRoutes) {
              toPrefetch.push(cragId);
              if (toPrefetch.length >= LIMIT) break;
            }
          }
          for (const id of toPrefetch) {
            void this.api.loadCragRoutes(id);
          }
        }
      }, 300);
    },
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
