import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  InputSignal,
  OnDestroy,
  output,
  OutputEmitterRef,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';

import { TuiButton, TuiHint } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import type { MapBounds, MapCragItem, MapOptions, ParkingDto } from '../models';

import { GlobalData } from '../services';
import { MapBuilder } from '../services/map-builder';
import type { MapBuilderCallbacks } from '../services/map-builder';

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
          [tuiHint]="
            global.isMobile() ? null : ('labels.myLocation' | translate)
          "
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
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mapBuilder = inject(MapBuilder);
  protected readonly global = inject(GlobalData);

  private readonly mapInitialized = signal(false);
  public mapCragItems: InputSignal<readonly MapCragItem[]> = input<
    readonly MapCragItem[]
  >([]);

  public selectedMapCragItem: InputSignal<MapCragItem | null> =
    input<MapCragItem | null>(null);
  public selectedMapCragItemChange: OutputEmitterRef<MapCragItem | null> =
    output<MapCragItem | null>();

  public mapParkingItems: InputSignal<readonly ParkingDto[]> = input<
    readonly ParkingDto[]
  >([]);
  public selectedMapParkingItem: InputSignal<ParkingDto | null> =
    input<ParkingDto | null>(null);
  public selectedMapParkingItemChange: OutputEmitterRef<ParkingDto | null> =
    output<ParkingDto | null>();

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
    onSelectedParkingChange: (parking) =>
      this.selectedMapParkingItemChange.emit(parking),
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
      const selectedCrag = this.selectedMapCragItem();
      const parkings = this.mapParkingItems();
      const selectedParking = this.selectedMapParkingItem();

      if (this.mapInitialized()) {
        void this.mapBuilder.updateData(
          crags,
          selectedCrag,
          parkings,
          selectedParking,
          this.callbacks,
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
    window.requestAnimationFrame(() => void this.initMap());
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
      this.mapParkingItems(),
      this.selectedMapParkingItem(),
      this.callbacks,
    );
    this.mapInitialized.set(true);
  }
}
