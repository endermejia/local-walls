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
import { MapCragItem, MapAreaItem, MapCounts } from '../models';
import { GlobalData } from '../services';
import { MapComponent, ChartRoutesByGradeComponent } from '../components';
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
                <div class="text-sm opacity-80">
                  <a
                    tuiLink
                    appearance="action-grayscale"
                    [routerLink]="['/zone', c.country_slug, c.area_slug]"
                    (click.zoneless)="$event.stopPropagation()"
                    >{{ c.area_name }}</a
                  >
                </div>
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
      @if (sheetMounted()) {
        @let counts = mapCounts();
        <tui-bottom-sheet
          #sheet
          [stops]="stops"
          class="z-50"
          role="dialog"
          aria-labelledby="zones-title crags-title"
          (scroll.zoneless)="onSheetScroll($any($event))"
        >
          @let areas = mapAreaItems();
          <h3 tuiHeader id="zones-title">
            <span tuiTitle class="items-center">
              {{ counts?.map_collections ?? 0 }}
              {{
                'labels.' + (counts?.map_collections === 1 ? 'zone' : 'zones')
                  | translate
                  | lowercase
              }}
            </span>
          </h3>
          <section class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto">
            <div class="grid gap-2">
              @for (a of areas; track a.id) {
                <div
                  tuiCardLarge
                  [tuiSurface]="global.liked() ? 'accent' : 'neutral'"
                  class="cursor-pointer"
                  [routerLink]="['/zone', a.id]"
                >
                  <div class="flex items-center gap-3">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      [src]="global.iconSrc()('zone')"
                      [attr.aria-label]="'labels.zone' | translate"
                    />
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ a.name }}</h2>
                      </header>
                      <section>
                        <div class="text-sm opacity-80">
                          {{ a.country_name }}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              } @empty {
                <tui-loader size="xxl" />
              }
            </div>
          </section>
          @let crags = mapCragItems();
          <h3 tuiHeader id="crags-title" class="justify-center">
            <div class="flex flex-col align-items-center justify-center gap-2">
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
          <section class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto">
            <div class="grid gap-2">
              @for (c of crags; track c.slug) {
                <div
                  tuiCardLarge
                  [tuiSurface]="global.liked() ? 'accent' : 'neutral'"
                  class="cursor-pointer"
                  [routerLink]="['/crag', c.country_slug, c.slug]"
                >
                  <div class="flex items-center gap-3">
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ c.name }}</h2>
                      </header>
                      <section>
                        <div class="text-sm opacity-80">
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
                        </div>
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
              } @empty {
                <tui-loader size="xxl" />
              }
            </div>
          </section>
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

  protected readonly stops = ['6rem'] as const;

  @ViewChild('sheet', { read: ElementRef }) sheetRef?: ElementRef<HTMLElement>;

  private readonly _sheetClientHeight: WritableSignal<number> = signal(0);
  private readonly _sheetScrollTop: WritableSignal<number> = signal(0);

  protected readonly sheetMounted: WritableSignal<boolean> = signal(true);

  protected mapCragItems: Signal<MapCragItem[]> = computed(() =>
    this.global
      .mapItems()
      .filter(
        (item): item is MapCragItem =>
          (item as MapAreaItem).area_type !== 0 &&
          !!(item as MapCragItem).total_ascendables,
      ),
  );

  protected mapAreaItems: Signal<MapAreaItem[]> = computed(() =>
    this.global
      .mapItems()
      .filter(
        (item): item is MapAreaItem => (item as MapAreaItem).area_type === 0,
      ),
  );
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

  protected readonly zoneRoutesByGrade = computed<
    import('../models').AmountByEveryVerticalLifeGrade
  >(() => ({}) as import('../models').AmountByEveryVerticalLifeGrade);

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

  protected remountBottomSheet(): void {
    if (!this.isBrowser()) return;
    if (this.global.selectedMapCragItem()) return;
    this.sheetMounted.set(false);
    this.scheduleNextFrame(() =>
      this.scheduleNextFrame(() => this.sheetMounted.set(true)),
    );
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
