import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  computed,
  signal,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { GlobalData } from '../services';
import { RouterLink } from '@angular/router';
import { TuiTitle, TuiLoader, TuiButton, TuiSurface } from '@taiga-ui/core';
import { TuiHeader, TuiCardLarge } from '@taiga-ui/layout';
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
  ],
  template: ` <div class="flex flex-col gap-4 h-full w-full relative">
    @let bottomSheetExpanded = isBottomSheetExpanded();
    <!-- Toggle view button -->
    <div class="absolute right-4 top-4 z-100 flex gap-2">
      <button
        tuiIconButton
        size="s"
        appearance="primary-grayscale"
        (click.zoneless)="toggleBottomSheet()"
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
    @defer {
      <div
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
        class="absolute w-full max-w-[40rem] mx-auto z-50 pointer-events-none left-0 right-0 bottom-5"
      >
        <div
          tuiCardLarge
          tuiSurface="floating"
          class="tui-space_top-4 relative pointer-events-auto cursor-pointer mx-4"
          [routerLink]="['/crag', c.id]"
        >
          <header tuiHeader>
            <h2 tuiTitle>{{ c.name }}</h2>
            <aside tuiAccessories class="flex items-center gap-2">
              <tui-badge
                [appearance]="global.isCragLiked(c.id) ? 'negative' : 'neutral'"
                iconStart="@tui.heart"
                size="xl"
                (click.zoneless)="
                  $event.stopPropagation(); global.toggleLikeCrag(c.id)
                "
                [attr.aria-label]="
                  (global.isCragLiked(c.id)
                    ? 'actions.favorite.remove'
                    : 'actions.favorite.add'
                  ) | translate
                "
                [attr.title]="
                  (global.isCragLiked(c.id)
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
              {{ 'labels.zone' | translate }}: {{ zoneNameById(c.zoneId) }}
            </div>
            @if (c.description) {
              <div class="text-sm mt-1 opacity-70">{{ c.description }}</div>
            }
          </section>
        </div>
      </div>
    } @else {
      <!-- BottomSheet -->
      <tui-bottom-sheet
        #sheet
        [stops]="stops"
        class="z-50"
        role="dialog"
        aria-labelledby="zones-title crags-title"
        (scroll.zoneless)="onSheetScroll($any($event))"
      >
        <h3 tuiHeader id="zones-title">
          @let numZonas = zonesInMapSorted().length;
          <span tuiTitle class="place-items-center">
            {{ zonesInMapSorted().length }}
            {{
              'labels.zones-' + (numZonas === 1 ? 'singular' : 'plural')
                | translate
            }}
          </span>
        </h3>
        <section class="w-full max-w-5xl mx-auto p-4 overflow-auto">
          <div class="grid gap-2">
            @for (z of zonesInMapSorted(); track z.id) {
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
                        global.isZoneLiked(z.id) ? 'negative' : 'neutral'
                      "
                      iconStart="@tui.heart"
                      size="xl"
                      (click.zoneless)="
                        $event.stopPropagation(); global.toggleLikeZone(z.id)
                      "
                      [attr.aria-label]="
                        (global.isZoneLiked(z.id)
                          ? 'actions.favorite.remove'
                          : 'actions.favorite.add'
                        ) | translate
                      "
                      [attr.title]="
                        (global.isZoneLiked(z.id)
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
              <div class="opacity-70">{{ 'common.noResults' | translate }}</div>
            }
          </div>
        </section>
        <h3 tuiHeader id="crags-title">
          @let numCrags = cragsInMapSorted().length;
          <span tuiTitle class="place-items-center">
            {{ numCrags }}
            {{
              'labels.crags-' + (numCrags === 1 ? 'singular' : 'plural')
                | translate
            }}
          </span>
        </h3>
        <section class="w-full max-w-5xl mx-auto p-4 overflow-auto">
          <div class="grid gap-2">
            @for (c of cragsInMapSorted(); track c.id) {
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
                        global.isCragLiked(c.id) ? 'negative' : 'neutral'
                      "
                      iconStart="@tui.heart"
                      size="xl"
                      (click.zoneless)="
                        $event.stopPropagation(); global.toggleLikeCrag(c.id)
                      "
                      [attr.aria-label]="
                        (global.isCragLiked(c.id)
                          ? 'actions.favorite.remove'
                          : 'actions.favorite.add'
                        ) | translate
                      "
                      [attr.title]="
                        (global.isCragLiked(c.id)
                          ? 'actions.favorite.remove'
                          : 'actions.favorite.add'
                        ) | translate
                      "
                    ></tui-badge>
                  </aside>
                </header>
                <section>
                  <div class="text-sm opacity-80">
                    {{ 'labels.zone' | translate }}:
                    {{ zoneNameById(c.zoneId) }}
                  </div>
                  @if (c.description) {
                    <div class="text-sm mt-1 opacity-70">
                      {{ c.description }}
                    </div>
                  }
                </section>
              </div>
            } @empty {
              <div class="opacity-70">{{ 'common.noResults' | translate }}</div>
            }
          </div>
        </section>
      </tui-bottom-sheet>
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow',
  },
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  // Actualiza señales del estado del bottom-sheet según el scroll
  onSheetScroll(event: Event): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return;
    }
    const target =
      (event?.target as HTMLElement) || this.sheetRef?.nativeElement;
    if (!target) return;
    // En zoneless, usamos señales para forzar la actualización de la vista
    this._sheetClientHeight.set(target.clientHeight || 0);
    this._sheetScrollTop.set(target.scrollTop || 0);
  }
  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly stops = ['6rem'] as const;

  @ViewChild('sheet', { read: ElementRef }) sheetRef?: ElementRef<HTMLElement>;

  private readonly _sheetClientHeight = signal(0);
  private readonly _sheetScrollTop = signal(0);

  protected readonly isBottomSheetExpanded = computed(() => {
    const clientHeight = this._sheetClientHeight();
    const scrollTop = this._sheetScrollTop();
    if (clientHeight <= 0) return false;
    const offset = Number.parseInt(this.stops[0] as string, 10) || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    return scrollTop >= maxTop * 0.5;
  });

  toggleBottomSheet(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return;
    }
    const el = this.sheetRef?.nativeElement;
    if (!el) return;

    const offsetRaw = this.stops[0] as string;
    const offset = Number.parseInt(offsetRaw, 10) || 0;
    const clientHeight = el.clientHeight || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    const current = el.scrollTop || 0;
    const target = current < maxTop * 0.5 ? maxTop : 0;

    this._sheetClientHeight.set(clientHeight);
    this._sheetScrollTop.set(target);

    try {
      el.scrollTo({ top: target, behavior: 'smooth' });
    } catch {
      el.scrollTop = target;
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

  zoneNameById(id: string): string {
    const z = this.global.zones().find((x) => x.id === id);
    return z ? z.name : '';
  }

  closeSelectedCrag(): void {
    this.global.setSelectedCrag(null);
    this.global.setSelectedZone(null);
  }

  private _map: import('leaflet').Map | null = null;
  private _mapInitialized = false;
  private _pollHandle: number | null = null;
  private _destroyed = false;

  constructor() {
    this.global.setSelectedZone(null);
    this.global.setSelectedCrag(null);
    this.global.setSelectedTopo(null);
    this.global.setSelectedRoute(null);

    Promise.resolve().then(() => {
      if (
        !isPlatformBrowser(this.platformId) ||
        typeof window === 'undefined'
      ) {
        return;
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      console.info('Not in browser environment, skipping map initialization');
      return;
    }
    this.waitForMapContainerAndInit();
  }

  private waitForMapContainerAndInit(attempt = 0): void {
    if (this._destroyed) return;

    const containerEl =
      typeof document !== 'undefined'
        ? document.getElementById('cragsMap')
        : null;
    if (!containerEl) {
      this._mapInitialized = false;
    }

    if (containerEl && !this._mapInitialized) {
      this.initMap().catch((err) =>
        console.error('Error initializing Leaflet map:', err),
      );
      return;
    }
    if (attempt > 50) return;
    if (typeof window !== 'undefined') {
      this._pollHandle = window.setTimeout(
        () => this.waitForMapContainerAndInit(attempt + 1),
        100,
      );
    }
  }

  private async initMap(): Promise<void> {
    if (this._mapInitialized) return;

    const [{ default: L }] = await Promise.all([import('leaflet')]);

    const containerId = 'cragsMap';
    const containerEl = document.getElementById(containerId);
    if (!containerEl) return;

    this._map = L.map(containerId, {
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
      const labelHtml = `<div class="w-fit bg-black/70 text-white px-2 py-1 rounded-xl text-xs leading-tight whitespace-nowrap -translate-y-full pointer-events-auto border border-transparent shadow hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/70" role="button" tabindex="0" aria-label="${c.name}" aria-pressed="${this.global.selectedCragId() === c.id}">${c.name}</div>`;
      const icon = L.divIcon({
        html: labelHtml,
        className: 'pointer-events-none',
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      const marker = L.marker(latLng, { icon }).addTo(this._map);
      marker.on('click', () => {
        this.global.setSelectedCrag(c.id);
        this.global.setSelectedZone(c.zoneId);
      });
      // Keyboard accessibility: Enter/Space select marker
      const el = marker.getElement();
      if (el) {
        el.addEventListener('keydown', (ev: KeyboardEvent) => {
          const key = ev.key;
          if (key === 'Enter' || key === ' ') {
            ev.preventDefault();
            this.global.setSelectedCrag(c.id);
            this.global.setSelectedZone(c.zoneId);
          }
        });
      }
    }

    this._map.on('click', () => {
      this.global.setSelectedCrag(null);
      this.global.setSelectedZone(null);

      if (this.isBottomSheetExpanded()) {
        this.toggleBottomSheet();
      }
    });

    if (latLngs.length) {
      const bounds = L.latLngBounds(latLngs);
      this._map.fitBounds(bounds, { padding: [24, 24] });
    }

    const recalcVisible = () => {
      if (!this._map) return;
      const b = this._map.getBounds();
      const visibleZones = new Set<string>();
      const visibleCrags = new Set<string>();
      for (const c of this.global.crags()) {
        const { lat, lng } = c.ubication;
        const wrapped = L.latLng(lat, lng).wrap();
        if (b.contains(wrapped)) {
          visibleZones.add(c.zoneId);
          visibleCrags.add(c.id);
        }
      }
      this._visibleZoneIds.set(visibleZones);
      this._visibleCragIds.set(visibleCrags);
    };
    recalcVisible();
    this._map.on('moveend', recalcVisible);
    this._map.on('zoomend', recalcVisible);

    this._mapInitialized = true;

    if (typeof window !== 'undefined') {
      const raf = (
        window as unknown as {
          requestAnimationFrame?: (cb: FrameRequestCallback) => number;
        }
      ).requestAnimationFrame;
      if (typeof raf === 'function') {
        raf(() => this._map?.invalidateSize?.());
      } else {
        setTimeout(() => this._map?.invalidateSize?.(), 0);
      }
      setTimeout(() => this._map?.invalidateSize?.(), 250);
    }
  }

  ngOnDestroy(): void {
    this._destroyed = true;
    if (this._pollHandle !== null) {
      clearTimeout(this._pollHandle);
      this._pollHandle = null;
    }
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
