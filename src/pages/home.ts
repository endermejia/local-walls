import {
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
import { MapAreaItem, MapCounts, MapCragItem } from '../models';
import { GlobalData } from '../services';
import { ChartRoutesByGradeComponent, MapComponent } from '../components';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import {
  TuiButton,
  TuiLink,
  TuiLoader,
  TuiSurface,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { remToPx } from '../utils';

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
    LowerCasePipe,
    TuiLink,
    MapComponent,
    ChartRoutesByGradeComponent,
    TuiAvatar,
  ],
  template: ` <div class="h-full w-full">
    <div class="absolute right-4 top-16 flex flex-col gap-2">
      @let bottomSheetExpanded = isBottomSheetExpanded();
      <div class="z-100">
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
      <div class="z-10">
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          (click.zoneless)="setBottomSheet('toggle')"
          iconStart="@tui.sliders-horizontal"
          class="pointer-events-auto"
          [attr.aria-label]="'labels.filters' | translate"
        >
          Filter
        </button>
      </div>
    </div>

    <!-- Map -->
    @defer (on viewport) {
      <app-map
        class="w-full h-full"
        [mapCragItems]="mapCragItems()"
        [selectedMapCragItem]="global.selectedMapCragItem()"
        (selectedMapCragItemChange)="selectMapCragItem($event)"
        (mapClick)="closeAll()"
        (interactionStart)="setBottomSheet('close')"
      />
      <!-- (visibleChange)="remountBottomSheet()" -->
    } @placeholder {
      <tui-loader size="xxl" class="w-full h-full flex" />
    }

    @if (global.selectedMapCragItem(); as c) {
      <!-- Sección de información del crag seleccionado con el mismo ancho que el bottom-sheet -->
      <div
        class="absolute w-full max-w-[40rem] mx-auto z-50 pointer-events-none left-0 right-0 bottom-0"
      >
        <div
          tuiCardLarge
          tuiSurface="floating"
          class="relative pointer-events-auto cursor-pointer m-4"
          [routerLink]="['/crag', c.country_slug, c.slug]"
        >
          <div class="flex items-center gap-3">
            <div class="flex flex-col min-w-0 grow">
              <header tuiHeader>
                <h2 tuiTitle>{{ c.name }}</h2>
              </header>
              <section>
                <a
                  tuiLink
                  appearance="action-grayscale"
                  [routerLink]="['/zone', c.country_slug, c.area_slug]"
                  (click.zoneless)="$event.stopPropagation()"
                  >{{ c.area_name }}</a
                >
              </section>
            </div>
            @if (global.selectedMapCragItem()?.grades; as grades) {
              <div (click.zoneless)="$event.stopPropagation()">
                <app-chart-routes-by-grade [grades]="grades" />
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <!-- BottomSheet -->
      @let counts = mapCounts();
      @let areas = mapAreaItems();
      @let crags = mapCragItems();
      @if (global.loading()) {
        <div class="absolute w-full h-full top-0">
          <tui-loader size="xxl" class="absolute w-full h-full z-50" />
        </div>
      } @else if (areas.length || crags.length) {
        <tui-bottom-sheet
          #sheet
          [stops]="stops"
          class="z-50"
          role="dialog"
          aria-labelledby="zones-title crags-title"
          (scroll.zoneless)="onSheetScroll($any($event))"
        >
          @if (areas.length) {
            <h3 tuiHeader id="zones-title" class="justify-center">
              <div
                class="flex flex-row align-items-center justify-center gap-2"
              >
                <tui-avatar
                  tuiThumbnail
                  size="l"
                  [src]="global.iconSrc()('zone')"
                  [attr.aria-label]="'labels.zone' | translate"
                />
                <span tuiTitle class="justify-center">
                  {{ areas.length }}
                  {{
                    'labels.' + (areas.length === 1 ? 'zone' : 'zones')
                      | translate
                      | lowercase
                  }}
                </span>
              </div>
            </h3>
            <section
              class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto"
            >
              <div class="grid gap-2">
                @for (a of areas; track a.id) {
                  <div
                    tuiCardLarge
                    [tuiSurface]="a.liked ? 'accent' : 'neutral'"
                    class="cursor-pointer"
                    [routerLink]="['/zone', a.country_slug, a.slug]"
                  >
                    <div class="flex items-center gap-3">
                      <div class="flex flex-col min-w-0 grow">
                        <header tuiHeader>
                          <h2 tuiTitle>{{ a.name }}</h2>
                        </header>
                        <section>
                          <div class="opacity-80">
                            {{ a.country_name }}
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
          @if (crags.length) {
            <h3 tuiHeader id="crags-title" class="justify-center">
              <div
                class="flex flex-row align-items-center justify-center gap-2"
              >
                <tui-avatar
                  tuiThumbnail
                  size="l"
                  [src]="global.iconSrc()('crag')"
                  class="self-center"
                  [attr.aria-label]="'labels.crag' | translate"
                />
                <span tuiTitle class="justify-center">
                  {{ counts?.locations ?? 0 }}
                  {{
                    'labels.' + (counts?.locations === 1 ? 'crag' : 'crags')
                      | translate
                      | lowercase
                  }}
                </span>
              </div>
            </h3>
            <section
              class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto"
            >
              <div class="grid gap-2">
                @for (c of crags; track c.id) {
                  <div
                    tuiCardLarge
                    [tuiSurface]="c.liked ? 'accent' : 'neutral'"
                    class="cursor-pointer"
                    [routerLink]="['/crag', c.country_slug, c.slug]"
                  >
                    <div class="flex items-center gap-3">
                      <div class="flex flex-col min-w-0 grow">
                        <header tuiHeader>
                          <h2 tuiTitle>{{ c.name }}</h2>
                        </header>
                        <section>
                          <a
                            tuiLink
                            appearance="action-grayscale"
                            [routerLink]="[
                              '/zone',
                              c.country_slug,
                              c.area_slug,
                            ]"
                            (click.zoneless)="$event.stopPropagation()"
                            >{{ c.area_name }}</a
                          >
                        </section>
                      </div>
                      <div (click.zoneless)="$event.stopPropagation()">
                        <app-chart-routes-by-grade
                          class="mt-2"
                          [grades]="c.grades"
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
        </tui-bottom-sheet>
      }
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full',
  },
})
export class HomeComponent {
  private readonly _platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);

  constructor() {
    this.global.resetDataByPage('home');
  }

  protected readonly stops = ['6rem'] as const;

  @ViewChild('sheet', { read: ElementRef }) sheetRef?: ElementRef<HTMLElement>;

  private readonly _sheetClientHeight: WritableSignal<number> = signal(0);
  private readonly _sheetScrollTop: WritableSignal<number> = signal(0);

  protected mapCragItems: Signal<MapCragItem[]> = computed(() => {
    const items = this.global.mapItemsOnViewport();
    return items.filter(
      (item): item is MapCragItem =>
        (item as MapAreaItem).area_type !== 0 &&
        !!(item as MapCragItem).total_ascendables,
    );
  });

  protected mapAreaItems: Signal<MapAreaItem[]> = computed(() => {
    const items = this.global.mapItemsOnViewport();

    return items.filter(
      (item): item is MapAreaItem => (item as MapAreaItem).area_type === 0,
    );
  });
  protected mapCounts: Signal<MapCounts | null> = computed(
    () => this.global.mapResponse()?.counts ?? null,
  );

  protected readonly isBottomSheetExpanded: Signal<boolean> = computed(() => {
    const clientHeight = this._sheetClientHeight();
    const scrollTop = this._sheetScrollTop();
    if (clientHeight <= 0) return false;
    const offset = remToPx(this.stops[0] as string) || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    return scrollTop >= maxTop * 0.5;
  });

  private isBrowser(): boolean {
    return isPlatformBrowser(this._platformId) && typeof window !== 'undefined';
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

    const hadSelectedMapItem = !!this.global.selectedMapCragItem();

    if (hadSelectedMapItem && mode !== 'open') {
      this.global.selectedMapCragItem.set(null);
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
      const shouldExpand = hadSelectedMapItem
        ? true
        : currentTop < maxTop * 0.5;
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

  protected selectMapCragItem(mapCragItem: MapCragItem | null): void {
    if (!mapCragItem) return;
    this.global.selectedMapCragItem.set(mapCragItem);
    this.setBottomSheet('open');
  }

  protected closeAll(): void {
    this.global.selectedMapCragItem.set(null);
    this.setBottomSheet('close');
  }
}
