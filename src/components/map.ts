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
  OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type {
  MapCragItem,
  MapOptions,
  MapCragsData,
  MapBounds,
} from '../models';
import { MapBuilder } from '../services/map-builder';
import type { MapBuilderCallbacks } from '../services/map-builder';
import { GlobalData } from '../services';
import { TuiButton, TuiHint } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [TuiButton, TuiHint, TranslatePipe],
  template: `
    <div class="relative w-full h-full">
      <div
        #container
        class="absolute inset-0"
        aria-label="Interactive map"
        role="application"
      ></div>
      <!-- Locate button -->
      <div class="absolute left-4 top-24 z-1 pointer-events-none">
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto"
          (click.zoneless)="onLocateClick()"
          [iconStart]="'@tui.locate'"
          [tuiHint]="'labels.myLocation' | translate"
        >
          {{ 'labels.myLocation' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow min-h-0 w-full',
  },
  providers: [MapBuilder],
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mapBuilder = inject(MapBuilder);
  private readonly global = inject(GlobalData);

  private readonly mapInitialized = signal(false);
  private initialCragsData = signal<MapCragsData | null>(null);
  public mapCragItems: InputSignal<readonly MapCragItem[]> = input<
    readonly MapCragItem[]
  >([]);

  public selectedMapCragItem: InputSignal<MapCragItem | null> =
    input<MapCragItem | null>(null);
  public selectedMapCragItemChange: OutputEmitterRef<MapCragItem | null> =
    output<MapCragItem | null>();

  public selection: InputSignal<{ lat: number; lng: number } | null> = input<{
    lat: number;
    lng: number;
  } | null>(null);

  public options: InputSignal<MapOptions> = input<MapOptions>({
    center: [38.7, -0.7],
    zoom: 10,
    maxZoom: 18,
    minZoom: 6,
  });
  public mapClick = output<{ lat: number; lng: number }>();
  public interactionStart = output<void>();

  private readonly callbacks: MapBuilderCallbacks = {
    onSelectedCragChange: (crag) => this.selectedMapCragItemChange.emit(crag),
    onMapClick: (lat, lng) => this.mapClick.emit({ lat, lng }),
    onInteractionStart: () => this.interactionStart.emit(),
    onViewportChange: (v: Partial<MapBounds>) => {
      if (!this.isBrowser()) return;
      const previousViewport = this.global.mapBounds();
      const viewport = {
        ...previousViewport,
        ...v,
      };
      this.global.mapBounds.set(viewport as MapBounds);
    },
  };

  @ViewChild('container', { read: ElementRef })
  private containerRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const crags = this.mapCragItems();
      const selected = this.selectedMapCragItem();
      if (this.mapInitialized()) {
        void this.mapBuilder.updateData(
          crags,
          selected,
          this.callbacks,
          this.initialCragsData(),
        );
      }
    });

    effect(() => {
      const selection = this.selection();
      if (this.mapInitialized() && selection) {
        this.mapBuilder.setSelectionMarker(selection.lat, selection.lng);
      }
    });
  }

  ngOnInit(): void {
    if (this.isBrowser()) {
      this.loadGeoJsonData();
    }
  }

  async loadGeoJsonData(): Promise<void> {
    if (!this.isBrowser()) return;
    try {
      const cragsJson = (await fetch('/map/map_crags.json').then((res) =>
        res.json(),
      )) as MapCragsData;
      const filtered: MapCragsData = {
        ...cragsJson,
        features: Array.isArray(cragsJson.features)
          ? cragsJson.features.filter((f) => {
              const cat = (f as any)?.properties?.category;
              return cat === 1 || cat === 2;
            })
          : [],
      };
      this.initialCragsData.set(filtered);
    } catch (e) {
      console.error('Error loading GeoJSON data:', e);
    }
  }

  ngAfterViewInit(): void {
    this.tryInit();
  }

  onLocateClick(): void {
    if (!this.isBrowser()) return;
    void this.mapBuilder.goToCurrentLocation();
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
      this.mapCragItems(),
      this.selectedMapCragItem(),
      this.callbacks,
      this.initialCragsData(),
    );
    this.mapInitialized.set(true);
  }
}
