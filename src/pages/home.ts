import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  PLATFORM_ID,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { GlobalData } from '../services';
import { remToPx, parkingMapUrl } from '../utils';
import { RouterLink } from '@angular/router';
import {
  TuiButton,
  TuiLink,
  TuiLoader,
  TuiSurface,
  TuiTitle,
  TuiDataListComponent,
} from '@taiga-ui/core';
import {
  TuiDropdown,
  TuiDropdownOpen,
} from '@taiga-ui/core/directives/dropdown';
import { TuiOptionNew } from '@taiga-ui/core/components/data-list';
import { TuiCardLarge, TuiHeader, TuiCell } from '@taiga-ui/layout';
import { TuiAvatar, TuiCopy } from '@taiga-ui/kit';
import { TuiBottomSheet, TuiSwipeActions } from '@taiga-ui/addon-mobile';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TuiAlertService } from '@taiga-ui/core';
import { TuiCopyProcessor } from '@taiga-ui/cdk';
import { MapComponent } from '../components';
import { Crag, Zone } from '../models';

@Component({
  selector: 'app-home',
  host: {
    class: 'flex grow h-full',
    '(copy)': 'onCopy()',
  },
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiCell,
    TuiTitle,
    TranslatePipe,
    TuiLoader,
    TuiSurface,
    TuiBottomSheet,
    TuiSwipeActions,
    TuiButton,
    LowerCasePipe,
    TuiLink,
    MapComponent,
    TuiAvatar,
    TuiDataListComponent,
    TuiDropdown,
    TuiDropdownOpen,
    TuiOptionNew,
    TuiCopy,
    TuiCopyProcessor,
  ],
  template: ` <div class="h-full w-full">
    @let bottomSheetExpanded = isBottomSheetExpanded();
    <!-- Toggle view button -->
    <div class="absolute right-4 top-16 z-100">
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
        class="w-full h-full"
        [crags]="global.crags()"
        [selectedCrag]="selectedCrag()"
        (selectedCragChange)="selectCrag($event)"
        (mapClick)="closeAll()"
        (interactionStart)="setBottomSheet('close')"
        (visibleChange)="updateBottomSheet($event)"
      />
    } @placeholder {
      <tui-loader size="xxl" class="w-full h-full flex" />
    }

    @if (selectedCrag(); as c) {
      <!-- Sección de información del crag seleccionado con el mismo ancho que el bottom-sheet -->
      <div
        class="absolute w-full max-w-[40rem] mx-auto z-50 pointer-events-none left-0 right-0 bottom-0"
      >
        <tui-swipe-actions class="m-4 pointer-events-auto">
          <ng-template #content>
            <tui-data-list>
              <tui-copy
                tuiOption
                new
                (click.zoneless)="$event.stopPropagation()"
                [tuiCopyProcessor]="copyProcessor"
              >
                {{ selectedCragShareUrl() }}
              </tui-copy>
              @if (selectedCragParkingUrl(); as url) {
                <a
                  tuiOption
                  new
                  [href]="url"
                  target="_blank"
                  rel="noopener noreferrer"
                  (click.zoneless)="$event.stopPropagation()"
                >
                  {{ 'actions.openMap' | translate }}
                </a>
              }
            </tui-data-list>
          </ng-template>
          <div
            tuiCardLarge
            tuiSurface="floating"
            tuiCell
            class="relative cursor-pointer"
            [routerLink]="['/crag', c.id]"
          >
            <tui-avatar
              appearance="primary"
              tuiThumbnail
              size="l"
              [src]="global.iconSrc()('crag')"
              class="self-center"
              [attr.aria-label]="'labels.crag' | translate"
            />
            <div tuiTitle class="flex flex-col min-w-0 grow">
              <header tuiHeader>
                <h2 tuiTitle>{{ c.name }}</h2>
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
            <button
              appearance="flat"
              iconStart="@tui.ellipsis-vertical"
              size="s"
              tuiDropdownOpen
              tuiIconButton
              type="button"
              class="fallback hidden"
              [tuiDropdown]="content"
              [attr.aria-label]="'labels.actions' | translate"
              (click.zoneless)="$event.stopPropagation()"
            >
              {{ 'labels.actions' | translate }}
            </button>
          </div>

          <tui-copy
            tuiSwipeAction
            [tuiCopyProcessor]="copyProcessor"
            [attr.aria-label]="'actions.share' | translate"
            (click.zoneless)="$event.stopPropagation()"
          >
            <button
              tuiIconButton
              appearance="flat"
              size="m"
              iconStart="@tui.share-2"
              type="button"
              (click.zoneless)="$event.stopPropagation()"
              [attr.aria-label]="'actions.share' | translate"
            >
              Share
            </button>
            <span class="sr-only">{{ selectedCragShareUrl() }}</span>
          </tui-copy>

          @if (selectedCragParkingUrl(); as url) {
            <a
              tuiButton
              appearance="flat"
              tuiIconButton
              tuiSwipeAction
              size="m"
              [iconStart]="'@tui.map'"
              [attr.aria-label]="'actions.openMap' | translate"
              [href]="url"
              target="_blank"
              rel="noopener noreferrer"
              (click.zoneless)="$event.stopPropagation()"
            >
              {{ 'actions.openMap' | translate }}
            </a>
          }
        </tui-swipe-actions>
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
          <section class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto">
            <div class="grid gap-2">
              @for (z of zones; track z.id) {
                <div
                  tuiCardLarge
                  [tuiSurface]="
                    global.isZoneLiked()(z.id) ? 'accent' : 'neutral'
                  "
                  class="cursor-pointer"
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
                <tui-loader size="xxl" />
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
          <section class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto">
            <div class="grid gap-2">
              @for (c of crags; track c.id) {
                <div
                  tuiCardLarge
                  [tuiSurface]="
                    global.isCragLiked()(c.id) ? 'accent' : 'neutral'
                  "
                  class="cursor-pointer"
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
                <tui-loader size="xl" />
              }
            </div>
          </section>
        </tui-bottom-sheet>
      }
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements AfterViewInit {
  private readonly alerts = inject(TuiAlertService);
  private readonly i18n = inject(TranslateService);

  protected readonly copyProcessor = (text: string) => text;
  private readonly _platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);

  protected readonly stops = ['6rem'] as const;

  @ViewChild('sheet', { read: ElementRef }) sheetRef?: ElementRef<HTMLElement>;

  private readonly _sheetClientHeight: WritableSignal<number> = signal(0);
  private readonly _sheetScrollTop: WritableSignal<number> = signal(0);
  private readonly _visibleZoneIds: WritableSignal<Set<string>> = signal<
    Set<string>
  >(new Set());
  private readonly _visibleCragIds: WritableSignal<Set<string>> = signal<
    Set<string>
  >(new Set());
  protected readonly sheetMounted: WritableSignal<boolean> = signal(true);

  protected readonly isBottomSheetExpanded: Signal<boolean> = computed(() => {
    const clientHeight = this._sheetClientHeight();
    const scrollTop = this._sheetScrollTop();
    if (clientHeight <= 0) return false;
    const offset = remToPx(this.stops[0] as string) || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    return scrollTop >= maxTop * 0.5;
  });

  protected readonly selectedCrag: Signal<Crag | null> = computed(() => {
    const id = this.global.selectedCragId();
    return id ? (this.global.crags().find((c) => c.id === id) ?? null) : null;
  });

  protected readonly selectedCragParkingUrl: Signal<string | null> = computed(
    () => {
      const c = this.selectedCrag();
      if (!c) return null;
      const ids = Array.isArray((c as any).parkings)
        ? ((c as any).parkings as string[])
        : [];
      const firstId = ids.length ? ids[0] : null;
      if (!firstId) return null;
      const p = this.global.parkings().find((x) => x.id === firstId);
      return p ? parkingMapUrl(p as any) : null;
    },
  );

  protected readonly selectedCragShareUrl: Signal<string> = computed(() => {
    const c = this.selectedCrag();
    if (!c) return '';
    // Build absolute URL based on current location in browser. SSR-safe fallback to relative.
    if (isPlatformBrowser(this._platformId) && typeof window !== 'undefined') {
      const loc = window.location;
      const origin = loc.origin;
      // current path without query/hash
      let path = loc.pathname || '';
      // strip trailing /home (with or without trailing slash) and then a trailing slash
      path = path.replace(/\/home\/?$/i, '').replace(/\/$/, '');
      const base = path ? `${origin}${path}` : origin;
      return `${base}/crag/${c.id}`;
    }
    return `/crag/${c.id}`;
  });

  protected readonly zonesInMapSorted: Signal<Zone[]> = computed(() => {
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

  protected readonly cragsInMapSorted: Signal<Crag[]> = computed(() => {
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
    return isPlatformBrowser(this._platformId) && typeof window !== 'undefined';
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
    if (!isPlatformBrowser(this._platformId) || typeof window === 'undefined') {
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

  protected selectCrag(crag: Crag | null): void {
    if (!crag) return;
    this.global.setSelectedCrag(crag.id);
    this.global.setSelectedZone(crag.zoneId);
    this.setBottomSheet('open');
  }

  protected closeAll(): void {
    this.global.setSelectedCrag(null);
    this.global.setSelectedZone(null);
    this.setBottomSheet('close');
  }

  protected updateBottomSheet(event: {
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

  protected onCopy(): void {
    const message = this.i18n.instant('messages.copied');
    this.alerts.open(message).subscribe();
  }
}
