import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { GlobalData } from '../services';
import { RouterLink } from '@angular/router';
import {
  TuiButton,
  TuiLink,
  TuiLoader,
  TuiSurface,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { TuiBadge, TuiButtonClose } from '@taiga-ui/kit';
import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TranslatePipe,
    TuiLoader,
    TuiSurface,
    TuiBottomSheet,
    TuiButton,
    TuiBadge,
    TuiButtonClose,
    LowerCasePipe,
    TuiLink,
  ],
  template: ` <div class="flex flex-col gap-4 h-full w-full relative">
    @let bottomSheetExpanded = isBottomSheetExpanded();
    <!-- Toggle view button -->
    <div class="absolute right-4 top-4 z-100 flex gap-2">
      <button
        tuiIconButton
        size="s"
        appearance="primary-grayscale"
        (click.zoneless)="setBottomSheet('toggle')"
        [iconStart]="bottomSheetExpanded ? '@tui.map' : '@tui.list'"
        class="pointer-events-auto"
        [attr.aria-label]="
          bottomSheetExpanded
            ? ('labels.map' | translate)
            : ('labels.list' | translate)
        "
      >
        Toggle view
      </button>
    </div>

    <!-- Map -->
    @defer (on viewport) {
      <div
        #mapContainer
        id="cragsMap"
        class="w-full grow min-h-0"
        aria-label="Interactive map"
        role="application"
      ></div>
    } @placeholder {
      <tui-loader class="w-full h-full flex" />
    }

    @if (selectedCrag(); as c) {
      <!-- Sección de información del crag seleccionado con el mismo ancho que el bottom-sheet -->
      <div
        class="absolute w-full max-w-[40rem] mx-auto z-50 pointer-events-none left-0 right-0 bottom-0"
      >
        <div
          tuiCardLarge
          tuiSurface="floating"
          class="tui-space_top-4 relative pointer-events-auto cursor-pointer m-4"
          [routerLink]="['/crag', c.id]"
        >
          <header tuiHeader>
            <h2 tuiTitle>{{ c.name }}</h2>
            <aside tuiAccessories class="flex items-center gap-2">
              <tui-badge
                [appearance]="
                  global.isCragLiked()(c.id) ? 'negative' : 'neutral'
                "
                iconStart="@tui.heart"
                size="xl"
                (click.zoneless)="
                  $event.stopPropagation(); global.toggleLikeCrag(c.id)
                "
                [attr.aria-label]="
                  (global.isCragLiked()(c.id)
                    ? 'actions.favorite.remove'
                    : 'actions.favorite.add'
                  ) | translate
                "
                [attr.title]="
                  (global.isCragLiked()(c.id)
                    ? 'actions.favorite.remove'
                    : 'actions.favorite.add'
                  ) | translate
                "
              ></tui-badge>
              @if (mapUrl(); as m) {
                <a
                  [href]="m"
                  rel="noopener noreferrer"
                  target="_blank"
                  (click.zoneless)="$event.stopPropagation()"
                  [attr.aria-label]="'actions.openMap' | translate"
                  [attr.title]="'actions.openMap' | translate"
                >
                  <tui-badge
                    appearance="neutral"
                    iconStart="@tui.map-pin"
                    size="xl"
                  ></tui-badge>
                </a>
              }
              <button
                size="s"
                tuiButtonClose
                tuiIconButton
                type="button"
                (click.zoneless)="$event.stopPropagation(); closeSelectedCrag()"
                [attr.aria-label]="'common.close' | translate"
                title="Close"
              >
                Close
              </button>
            </aside>
          </header>
          <section>
            <div class="text-sm opacity-80">
              <a
                tuiLink
                appearance="action-grayscale"
                [routerLink]="['/zone', c.zoneId]"
                (click.zoneless)="$event.stopPropagation()"
                >{{ global.zoneNameById()(c.zoneId) }}</a
              >
            </div>
            @if (c.description) {
              <div class="text-sm mt-1 opacity-70">{{ c.description }}</div>
            }
          </section>
        </div>
      </div>
    } @else {
      <!-- BottomSheet -->
      @if (sheetMounted()) {
        <tui-bottom-sheet
          #sheet
          [stops]="stops"
          class="z-50"
          role="dialog"
          aria-labelledby="zones-title crags-title"
          (scroll.zoneless)="onSheetScroll($any($event))"
        >
          @let zones = zonesInMapSorted();
          <h3 tuiHeader id="zones-title">
            <span tuiTitle class="place-items-center">
              {{ zones.length }}
              {{
                'labels.' + (zones.length === 1 ? 'zone' : 'zones')
                  | translate
                  | lowercase
              }}
            </span>
          </h3>
          <section class="w-full max-w-5xl mx-auto p-4 overflow-auto">
            <div class="grid gap-2">
              @for (z of zones; track z.id) {
                <div
                  tuiCardLarge
                  tuiSurface="neutral"
                  class="tui-space_top-4 cursor-pointer"
                  [routerLink]="['/zone', z.id]"
                >
                  <header tuiHeader>
                    <h2 tuiTitle>{{ z.name }}</h2>
                    <aside tuiAccessories>
                      <tui-badge
                        [appearance]="
                          global.isZoneLiked()(z.id) ? 'negative' : 'neutral'
                        "
                        iconStart="@tui.heart"
                        size="xl"
                        (click.zoneless)="
                          $event.stopPropagation(); global.toggleLikeZone(z.id)
                        "
                        [attr.aria-label]="
                          (global.isZoneLiked()(z.id)
                            ? 'actions.favorite.remove'
                            : 'actions.favorite.add'
                          ) | translate
                        "
                        [attr.title]="
                          (global.isZoneLiked()(z.id)
                            ? 'actions.favorite.remove'
                            : 'actions.favorite.add'
                          ) | translate
                        "
                      ></tui-badge>
                    </aside>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      {{ 'labels.crags' | translate }}: {{ z.cragIds.length }}
                    </div>
                    @if (z.description) {
                      <div class="text-sm mt-1 opacity-70">
                        {{ z.description }}
                      </div>
                    }
                  </section>
                </div>
              } @empty {
                <div class="opacity-70">
                  {{ 'common.noResults' | translate }}
                </div>
              }
            </div>
          </section>
          @let crags = cragsInMapSorted();
          <h3 tuiHeader id="crags-title">
            <span tuiTitle class="place-items-center">
              {{ crags.length }}
              {{
                'labels.' + (crags.length === 1 ? 'crag' : 'crags')
                  | translate
                  | lowercase
              }}
            </span>
          </h3>
          <section class="w-full max-w-5xl mx-auto p-4 overflow-auto">
            <div class="grid gap-2">
              @for (c of crags; track c.id) {
                <div
                  tuiCardLarge
                  tuiSurface="neutral"
                  class="tui-space_top-4 cursor-pointer"
                  [routerLink]="['/crag', c.id]"
                >
                  <header tuiHeader>
                    <h2 tuiTitle>{{ c.name }}</h2>
                    <aside tuiAccessories>
                      <tui-badge
                        [appearance]="
                          global.isCragLiked()(c.id) ? 'negative' : 'neutral'
                        "
                        iconStart="@tui.heart"
                        size="xl"
                        (click.zoneless)="
                          $event.stopPropagation(); global.toggleLikeCrag(c.id)
                        "
                        [attr.aria-label]="
                          (global.isCragLiked()(c.id)
                            ? 'actions.favorite.remove'
                            : 'actions.favorite.add'
                          ) | translate
                        "
                        [attr.title]="
                          (global.isCragLiked()(c.id)
                            ? 'actions.favorite.remove'
                            : 'actions.favorite.add'
                          ) | translate
                        "
                      ></tui-badge>
                    </aside>
                  </header>
                  <section>
                    <div class="text-sm opacity-80">
                      <a
                        tuiLink
                        appearance="action-grayscale"
                        [routerLink]="['/zone', c.zoneId]"
                        (click.zoneless)="$event.stopPropagation()"
                        >{{ global.zoneNameById()(c.zoneId) }}</a
                      >
                    </div>
                    @if (c.description) {
                      <div class="text-sm mt-1 opacity-70">
                        {{ c.description }}
                      </div>
                    }
                  </section>
                </div>
              } @empty {
                <div class="opacity-70">
                  {{ 'common.noResults' | translate }}
                </div>
              }
            </div>
          </section>
        </tui-bottom-sheet>
      }
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow',
  },
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  onSheetScroll(event: Event): void {
    if (!this.isBrowser()) return;
    const target =
      (event?.target as HTMLElement) || this.sheetRef?.nativeElement;
    if (!target) return;
    this.updateBottomSheetScrollSignals(target);
  }
  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly stops = ['6rem'] as const;

  private remToPx(remOrPx: string): number {
    if (!this.isBrowser()) {
      const num = Number.parseFloat(remOrPx);
      return isNaN(num)
        ? 0
        : Math.round(num * (remOrPx.includes('rem') ? 16 : 1));
    }
    const num = Number.parseFloat(remOrPx);
    if (isNaN(num)) return 0;
    if (remOrPx.trim().endsWith('rem')) {
      const rootFont = window.getComputedStyle(
        document.documentElement,
      ).fontSize;
      const base = Number.parseFloat(rootFont) || 16;
      return Math.round(num * base);
    }
    return Math.round(num);
  }

  @ViewChild('sheet', { read: ElementRef }) sheetRef?: ElementRef<HTMLElement>;
  private _mapContainer?: HTMLElement;

  @ViewChild('mapContainer', { read: ElementRef })
  set mapContainerRef(ref: ElementRef<HTMLElement> | undefined) {
    const el = ref?.nativeElement;
    this._mapContainer = el ?? undefined;
    if (
      el &&
      !this._mapInitialized &&
      isPlatformBrowser(this.platformId) &&
      typeof window !== 'undefined'
    ) {
      const raf =
        typeof window !== 'undefined'
          ? (window.requestAnimationFrame as
              | undefined
              | ((cb: FrameRequestCallback) => number))
          : undefined;
      if (typeof raf === 'function') {
        raf(() =>
          this.initMap().catch((e) =>
            console.error('Error initializing Leaflet map:', e),
          ),
        );
      } else {
        Promise.resolve().then(() =>
          this.initMap().catch((e) =>
            console.error('Error initializing Leaflet map:', e),
          ),
        );
      }
    }
  }

  private readonly _sheetClientHeight = signal(0);
  private readonly _sheetScrollTop = signal(0);
  protected readonly sheetMounted = signal(true);

  private remountBottomSheet(): void {
    if (!this.isBrowser()) return;
    // Only remount if the bottom sheet is the visible branch (no crag selected)
    if (this.selectedCrag()) return;
    this.sheetMounted.set(false);
    // Remount on the next frames to ensure destroy then recreate in zoneless mode
    this.scheduleNextFrame(() =>
      this.scheduleNextFrame(() => this.sheetMounted.set(true)),
    );
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId) && typeof window !== 'undefined';
  }

  private scheduleNextFrame(run: () => void): void {
    if (!this.isBrowser()) return;
    const raf = (
      window as unknown as {
        requestAnimationFrame?: (cb: FrameRequestCallback) => number;
      }
    ).requestAnimationFrame;
    if (typeof raf === 'function') {
      raf(() => run());
    } else {
      Promise.resolve().then(run);
    }
  }

  private computeBottomSheetTargetTop(node: HTMLElement): number {
    const offsetPx = this.remToPx(this.stops[0] as string) || 0;
    const clientHeight = node.clientHeight || 0;
    return Math.max(0, clientHeight - offsetPx);
  }

  private updateBottomSheetScrollSignals(
    node: HTMLElement,
    targetTop?: number,
  ): void {
    const clientHeight = node.clientHeight || 0;
    const top = typeof targetTop === 'number' ? targetTop : node.scrollTop || 0;
    this._sheetClientHeight.set(clientHeight);
    this._sheetScrollTop.set(top);
  }

  private scrollBottomSheetTo(node: HTMLElement, top: number): void {
    this.updateBottomSheetScrollSignals(node, top);
    try {
      node.scrollTo({ top, behavior: 'smooth' });
    } catch {
      node.scrollTop = top;
    }
  }

  protected readonly isBottomSheetExpanded = computed(() => {
    const clientHeight = this._sheetClientHeight();
    const scrollTop = this._sheetScrollTop();
    if (clientHeight <= 0) return false;
    const offset = this.remToPx(this.stops[0] as string) || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    return scrollTop >= maxTop * 0.5;
  });

  protected setBottomSheet(mode: 'open' | 'close' | 'toggle' = 'toggle'): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return;
    }

    const hadCragSelected = !!this.global.selectedCragId();

    if (hadCragSelected && mode !== 'open') {
      this.global.setSelectedCrag(null);
      this.global.setSelectedZone(null);
    }

    const el = this.sheetRef?.nativeElement;
    if (!el) {
      const raf = (
        window as unknown as {
          requestAnimationFrame?: (cb: FrameRequestCallback) => number;
        }
      ).requestAnimationFrame;
      if (typeof raf === 'function') {
        raf(() => {
          const node = this.sheetRef?.nativeElement;
          if (!node) return;
          raf(() => {
            const target =
              mode === 'close' ? 0 : this.computeBottomSheetTargetTop(node);
            this.scrollBottomSheetTo(node, mode === 'open' ? target : target);
            if (mode === 'close') {
              this._sheetClientHeight.set(0);
              this._sheetScrollTop.set(0);
            }
          });
        });
      }
      return;
    }

    const maxTop = this.computeBottomSheetTargetTop(el);
    const currentTop = el.scrollTop || 0;

    let targetTop = 0;
    if (mode === 'open') {
      targetTop = maxTop;
    } else if (mode === 'close') {
      targetTop = 0;
    } else {
      const shouldExpand = hadCragSelected ? true : currentTop < maxTop * 0.5;
      targetTop = shouldExpand ? maxTop : 0;
    }

    const doScroll = (node: HTMLElement) => {
      this.scrollBottomSheetTo(node, targetTop);
      if (targetTop === 0) {
        // reset signals when closing
        this._sheetClientHeight.set(0);
        this._sheetScrollTop.set(0);
      }
    };

    const raf = (
      window as unknown as {
        requestAnimationFrame?: (cb: FrameRequestCallback) => number;
      }
    ).requestAnimationFrame;
    if (typeof raf === 'function') {
      raf(() => {
        const nodeA = this.sheetRef?.nativeElement || el;
        raf(() => doScroll(nodeA));
      });
    } else {
      doScroll(el);
    }
  }

  readonly selectedCrag = computed(() => {
    const id = this.global.selectedCragId();
    return id ? (this.global.crags().find((c) => c.id === id) ?? null) : null;
  });

  private readonly _visibleZoneIds = signal<Set<string>>(new Set());
  private readonly _visibleCragIds = signal<Set<string>>(new Set());

  protected readonly zonesInMapSorted = computed(() => {
    const zones = this.global.zones();
    const crags = this.global.crags();
    const zoneHasCrag = new Set(crags.map((c) => c.zoneId));
    const liked = new Set(this.global.appUser()?.likedZones ?? []);
    const visible = this._visibleZoneIds();
    const visibleFilter = visible.size
      ? (zId: string) => visible.has(zId)
      : (zId: string) => zoneHasCrag.has(zId);
    return zones
      .filter((z) => visibleFilter(z.id))
      .sort(
        (a, b) =>
          +!liked.has(a.id) - +!liked.has(b.id) || a.name.localeCompare(b.name),
      );
  });

  protected readonly cragsInMapSorted = computed(() => {
    const crags = this.global.crags();
    const visible = this._visibleCragIds();
    const useAll = visible.size === 0;
    const liked = new Set(this.global.appUser()?.likedCrags ?? []);
    return crags
      .filter((c) => (useAll ? true : visible.has(c.id)))
      .sort(
        (a, b) =>
          +!liked.has(a.id) - +!liked.has(b.id) || a.name.localeCompare(b.name),
      );
  });

  readonly mapUrl = computed(() => {
    const c = this.selectedCrag();
    if (!c) return null;
    const { lat, lng } = c.ubication;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  });

  closeSelectedCrag(): void {
    this.global.setSelectedCrag(null);
    this.global.setSelectedZone(null);
  }

  private _map: import('leaflet').Map | null = null;
  private _mapInitialized = false;

  private cragLabelHtml(name: string, isSelected: boolean): string {
    return `<div class="w-fit bg-black/70 text-white px-2 py-1 rounded-xl text-xs leading-tight whitespace-nowrap -translate-y-full pointer-events-auto border border-transparent shadow hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/70" role="button" tabindex="0" aria-label="${name}" aria-pressed="${isSelected}">${name}</div>`;
  }

  private attachMarkerKeyboardSelection(
    marker: import('leaflet').Marker,
    cragId: string,
    zoneId: string,
  ): void {
    const el = marker.getElement();
    if (!el) return;
    el.addEventListener('keydown', (ev: KeyboardEvent) => {
      const key = ev.key;
      if (key === 'Enter' || key === ' ') {
        ev.preventDefault();
        this.selectCragFromMap(cragId, zoneId);
      }
    });
  }

  private selectCragFromMap(cragId: string, zoneId: string): void {
    this.global.setSelectedCrag(cragId);
    this.global.setSelectedZone(zoneId);
    this.setBottomSheet('open');
  }

  private updateVisibleIdsFromCurrentBounds(L: typeof import('leaflet')): void {
    if (!this._map) return;
    const bounds = this._map.getBounds();
    const visibleZones = new Set<string>();
    const visibleCrags = new Set<string>();
    for (const c of this.global.crags()) {
      const { lat, lng } = c.ubication;
      const wrapped = L.latLng(lat, lng).wrap();
      if (bounds.contains(wrapped)) {
        visibleZones.add(c.zoneId);
        visibleCrags.add(c.id);
      }
    }
    this._visibleZoneIds.set(visibleZones);
    this._visibleCragIds.set(visibleCrags);
    this.remountBottomSheet();
  }

  constructor() {
    this.global.setSelectedZone(null);
    this.global.setSelectedCrag(null);
    this.global.setSelectedTopo(null);
    this.global.setSelectedRoute(null);
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser()) return;
  }

  private async initMap(): Promise<void> {
    if (this._mapInitialized) return;

    const [{ default: L }] = await Promise.all([import('leaflet')]);

    const containerEl = this._mapContainer;
    if (!containerEl) return;

    this._map = L.map(containerEl, {
      center: [39.5, -0.5],
      zoom: 7,
      worldCopyJump: true,
    });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        minZoom: 5,
      },
    ).addTo(this._map);

    const crags = this.global.crags();
    const latLngs: [number, number][] = [];
    for (const c of crags) {
      const { lat, lng } = c.ubication;
      const latLng: [number, number] = [lat, lng];
      latLngs.push(latLng);
      const icon = L.divIcon({
        html: this.cragLabelHtml(c.name, this.global.selectedCragId() === c.id),
        className: 'pointer-events-none',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker(latLng, { icon }).addTo(this._map);
      marker.on('click', () => this.selectCragFromMap(c.id, c.zoneId));
      this.attachMarkerKeyboardSelection(marker, c.id, c.zoneId);
    }

    this._map.on('click', () => {
      this.closeSelectedCrag();
      this.setBottomSheet('close');
    });

    if (latLngs.length) {
      const bounds = L.latLngBounds(latLngs);
      this._map.fitBounds(bounds, { padding: [24, 24] });
    }

    const recalcVisible = () => this.updateVisibleIdsFromCurrentBounds(L);
    recalcVisible();
    const collapseOnInteraction = () => this.setBottomSheet('close');
    this._map.on('movestart', collapseOnInteraction);
    this._map.on('zoomstart', collapseOnInteraction);
    this._map.on('moveend', recalcVisible);
    this._map.on('zoomend', recalcVisible);

    this._mapInitialized = true;

    if (typeof window !== 'undefined') {
      this.scheduleNextFrame(() => {
        this._map?.invalidateSize?.();
        this.scheduleNextFrame(() => this._map?.invalidateSize?.());
      });
    }
  }

  ngOnDestroy(): void {
    try {
      if (this._map && typeof this._map.remove === 'function') {
        this._map.remove();
      }
    } catch (e) {
      console.debug('Map cleanup error ignored:', e);
    }
    this._map = null;
    this._mapInitialized = false;
  }
}
