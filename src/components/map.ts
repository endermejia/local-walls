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
import type { MapCragItem, MapOptions } from '../models';
import { MapBuilder } from '../services/map-builder';
import type { MapBuilderCallbacks } from '../services/map-builder';
import { GlobalData } from '../services';
import { TuiButton } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [TuiButton, TranslatePipe],
  template: `
    <div class="relative w-full h-full">
      <div
        #container
        class="absolute inset-0"
        aria-label="Interactive map"
        role="application"
      ></div>
      <!-- Locate button -->
      <div class="absolute right-4 top-14 z-100 pointer-events-none">
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          class="pointer-events-auto sm:hidden"
          (click.zoneless)="onLocateClick()"
          [iconStart]="'@tui.map-pinned'"
          [attr.aria-label]="'labels.myLocation' | translate"
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
})
export class MapComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly mapBuilder = inject(MapBuilder);
  private readonly global = inject(GlobalData);

  private readonly mapInitialized = signal(false);
  public mapCragItems: InputSignal<readonly MapCragItem[]> = input<
    readonly MapCragItem[]
  >([]);
  public selectedMapCragItem: InputSignal<MapCragItem | null> =
    input<MapCragItem | null>(null);
  public selectedMapCragItemChange: OutputEmitterRef<MapCragItem | null> =
    output<MapCragItem | null>();
  public options: InputSignal<MapOptions> = input<MapOptions>({
    center: [38.7, -0.7],
    zoom: 10,
    maxZoom: 15,
    minZoom: 5,
  });
  public mapClick = output<void>();
  public interactionStart = output<void>();

  private _viewportDebounce?: ReturnType<typeof setTimeout>;

  private readonly callbacks: MapBuilderCallbacks = {
    onSelectedCragChange: (crag) => this.selectedMapCragItemChange.emit(crag),
    onMapClick: () => this.mapClick.emit(),
    onInteractionStart: () => this.interactionStart.emit(),
    onViewportChange: (v) => {
      // Drive data loading from here (map owns fetching)
      if (!this.isBrowser()) return;
      if (this._viewportDebounce) clearTimeout(this._viewportDebounce);
      this._viewportDebounce = setTimeout(() => {
        void this.global.loadMapItems({
          south_west_latitude: v.south_west_latitude,
          south_west_longitude: v.south_west_longitude,
          north_east_latitude: v.north_east_latitude,
          north_east_longitude: v.north_east_longitude,
          zoom: v.zoom,
          page_index: 0,
          page_size: 50,
        });
      }, 300);
    },
  };

  @ViewChild('container', { read: ElementRef })
  private containerRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      const crags = this.mapCragItems();
      const selected = this.selectedMapCragItem();
      if (this.mapInitialized()) {
        void this.mapBuilder.updateData(crags, selected, this.callbacks);
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
    );
    this.mapInitialized.set(true);
  }
}
