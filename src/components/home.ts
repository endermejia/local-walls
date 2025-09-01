import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { GlobalData } from '../services';
import { remToPx } from '../utils';
import { RouterLink } from '@angular/router';
import {
  TuiButton,
  TuiLink,
  TuiLoader,
  TuiSurface,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { TuiBadge, TuiButtonClose, TuiAvatar } from '@taiga-ui/kit';
import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import { TranslatePipe } from '@ngx-translate/core';
import { MapComponent } from './map';

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
    MapComponent,
    TuiAvatar,
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
      <app-map
        [crags]="global.crags()"
        [selectedCragId]="global.selectedCragId()"
        (cragSelect)="onCragSelect($event)"
        (mapClick)="onMapClick()"
        (interactionStart)="onInteractionStart()"
        (visibleChange)="onVisibleChange($event)"
      ></app-map>
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
          <div class="flex items-center gap-3">
            <tui-avatar
              tuiThumbnail
              size="l"
              [src]="global.iconSrc()('crag')"
              class="self-center"
              [attr.aria-label]="'labels.crag' | translate"
            />
            <div class="flex flex-col min-w-0 grow">
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
                    (click.zoneless)="
                      $event.stopPropagation(); closeSelectedCrag()
                    "
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
                  <div class="flex items-center gap-3">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      [src]="global.iconSrc()('zone')"
                      class="self-center"
                      [attr.aria-label]="'labels.zone' | translate"
                    />
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ z.name }}</h2>
                        <aside tuiAccessories>
                          <tui-badge
                            [appearance]="
                              global.isZoneLiked()(z.id)
                                ? 'negative'
                                : 'neutral'
                            "
                            iconStart="@tui.heart"
                            size="xl"
                            (click.zoneless)="
                              $event.stopPropagation();
                              global.toggleLikeZone(z.id)
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
                          {{ 'labels.crags' | translate }}:
                          {{ z.cragIds.length }}
                        </div>
                        @if (z.description) {
                          <div class="text-sm mt-1 opacity-70">
                            {{ z.description }}
                          </div>
                        }
                      </section>
                    </div>
                  </div>
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
                  <div class="flex items-center gap-3">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      [src]="global.iconSrc()('crag')"
                      class="self-center"
                      [attr.aria-label]="'labels.crag' | translate"
                    />
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ c.name }}</h2>
                        <aside tuiAccessories>
                          <tui-badge
                            [appearance]="
                              global.isCragLiked()(c.id)
                                ? 'negative'
                                : 'neutral'
                            "
                            iconStart="@tui.heart"
                            size="xl"
                            (click.zoneless)="
                              $event.stopPropagation();
                              global.toggleLikeCrag(c.id)
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
                  </div>
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
export class HomeComponent implements AfterViewInit {
  protected readonly global = inject(GlobalData);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly stops = ['6rem'] as const;

  @ViewChild('sheet', { read: ElementRef }) sheetRef?: ElementRef<HTMLElement>;

  private readonly _sheetClientHeight = signal(0);
  private readonly _sheetScrollTop = signal(0);
  private readonly _visibleZoneIds = signal<Set<string>>(new Set());
  private readonly _visibleCragIds = signal<Set<string>>(new Set());
  protected readonly sheetMounted = signal(true);

  protected readonly isBottomSheetExpanded = computed(() => {
    const clientHeight = this._sheetClientHeight();
    const scrollTop = this._sheetScrollTop();
    if (clientHeight <= 0) return false;
    const offset = remToPx(this.stops[0] as string) || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    return scrollTop >= maxTop * 0.5;
  });

  protected readonly selectedCrag = computed(() => {
    const id = this.global.selectedCragId();
    return id ? (this.global.crags().find((c) => c.id === id) ?? null) : null;
  });

  protected readonly mapUrl = computed(() => {
    const c = this.selectedCrag();
    if (!c) return null;
    const { lat, lng } = c.ubication;
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  });

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

  private remountBottomSheet(): void {
    if (!this.isBrowser()) return;
    if (this.selectedCrag()) return;
    this.sheetMounted.set(false);
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
    const offsetPx = remToPx(this.stops[0] as string) || 0;
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

  protected onSheetScroll(event: Event): void {
    if (!this.isBrowser()) return;
    const target =
      (event?.target as HTMLElement) || this.sheetRef?.nativeElement;
    if (!target) return;
    this.updateBottomSheetScrollSignals(target);
  }

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

  closeSelectedCrag(): void {
    this.global.setSelectedCrag(null);
    this.global.setSelectedZone(null);
  }

  // Handlers from app-map component
  protected onCragSelect(event: { cragId: string; zoneId: string }): void {
    this.global.setSelectedCrag(event.cragId);
    this.global.setSelectedZone(event.zoneId);
    this.setBottomSheet('open');
  }

  protected onMapClick(): void {
    this.closeSelectedCrag();
    this.setBottomSheet('close');
  }

  protected onInteractionStart(): void {
    this.setBottomSheet('close');
  }

  protected onVisibleChange(event: {
    zoneIds: string[];
    cragIds: string[];
  }): void {
    this._visibleZoneIds.set(new Set(event.zoneIds));
    this._visibleCragIds.set(new Set(event.cragIds));
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
}
