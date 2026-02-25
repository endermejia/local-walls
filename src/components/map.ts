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

import { TuiButton } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { GlobalData } from '../services/global-data';
import { MapBuilder, MapBuilderCallbacks } from '../services/map-builder';

import type {
  MapAreaItem,
  MapBounds,
  MapCragItem,
  MapOptions,
  ParkingDto,
} from '../models';

@Component({
  selector: 'app-map',
  imports: [TuiButton, TranslatePipe],
  template: `
    <div class="relative w-full h-full">
      <div
        #container
        class="absolute inset-0"
        aria-label="Interactive map"
        role="application"
      ></div>

      <div
        class="absolute left-4 top-4 z-1 flex flex-col gap-2 pointer-events-none"
      >
        <!-- Zoom in button -->
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto"
          (click.zoneless)="onZoomInClick()"
          [iconStart]="'@tui.plus'"
        >
          {{ 'zoomIn' | translate }}
        </button>

        <!-- Zoom out button -->
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto"
          (click.zoneless)="onZoomOutClick()"
          [iconStart]="'@tui.minus'"
        >
          {{ 'zoomOut' | translate }}
        </button>

        <!-- Locate button -->
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto"
          (click.zoneless)="onLocateClick()"
          [iconStart]="'@tui.locate'"
        >
          {{ 'myLocation' | translate }}
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

  public mapAreaItems: InputSignal<readonly MapAreaItem[]> = input<
    readonly MapAreaItem[]
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
    maxZoom: 22,
    minZoom: 4,
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
      const areas = this.mapAreaItems();
      const selectedCrag = this.selectedMapCragItem();
      const parkings = this.mapParkingItems();
      const selectedParking = this.selectedMapParkingItem();

      if (this.mapInitialized()) {
        void this.mapBuilder.updateData(
          crags,
          selectedCrag,
          parkings,
          selectedParking,
          areas,
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
    this.global.mapActive.set(true);
    this.tryInit();
  }

  onLocateClick(): void {
    if (!this.isBrowser()) return;
    void this.mapBuilder.goToCurrentLocation();
  }

  onZoomInClick(): void {
    if (!this.isBrowser()) return;
    this.mapBuilder.zoomIn();
  }

  onZoomOutClick(): void {
    if (!this.isBrowser()) return;
    this.mapBuilder.zoomOut();
  }

  ngOnDestroy(): void {
    this.global.mapActive.set(false);
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
      this.mapAreaItems(),
      this.callbacks,
    );
    this.mapInitialized.set(true);
  }
}
