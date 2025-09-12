import { AsyncPipe, KeyValuePipe, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, Signal, WritableSignal } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TUI_DEFAULT_MATCHER } from '@taiga-ui/cdk';
import { RouterLink } from '@angular/router';
import {
  TuiButton,
  TuiDataListComponent,
  TuiLink,
  TuiOptGroup,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiOptionNew } from '@taiga-ui/core/components/data-list';
import {
  TuiSearchHistory,
  TuiSearchHotkey,
  TuiSearchResultsComponent,
} from '@taiga-ui/experimental';
import { TuiAvatar, TuiBreadcrumbs } from '@taiga-ui/kit';
import { TuiCell, TuiInputSearch, TuiNavigation } from '@taiga-ui/layout';
import { filter, map, startWith, switchMap, timer } from 'rxjs';
import { GlobalData } from '../services';
import { OptionsItem, SearchData } from '../models';

type RouterCommand = readonly (string | number)[] | string;

interface BreadcrumbItem {
  caption: string;
  routerLink: RouterCommand;
}

@Component({
  selector: 'app-header',
  imports: [
    AsyncPipe,
    KeyValuePipe,
    ReactiveFormsModule,
    RouterLink,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiDataListComponent,
    TuiInputSearch,
    TuiNavigation,
    TuiOptGroup,
    TuiOptionNew,
    TuiSearchHistory,
    TuiSearchHotkey,
    TuiSearchResultsComponent,
    TuiTextfield,
    TuiTitle,
    TuiBreadcrumbs,
    TuiLink,
    TranslatePipe,
  ],
  template: `
    <header
      tuiNavigationHeader
      class="flex items-center justify-between sm:gap-4"
      ngSkipHydration
    >
      <div class="flex items-center gap-2 overflow-hidden" ngSkipHydration>
        <button
          [title]="'common.menu' | translate"
          tuiIconButton
          tuiNavigationDrawer
          type="button"
          [(open)]="open"
          ngSkipHydration
        >
          <tui-data-list ngSkipHydration>
            @for (group of global.drawer() | keyvalue; track group.key) {
              <tui-opt-group [label]="group.key | translate" ngSkipHydration>
                @for (item of group.value; track item.name) {
                  <button
                    tuiOption
                    new
                    type="button"
                    (click.zoneless)="onClick(item); open = false"
                    class="gap-2"
                    ngSkipHydration
                  >
                    <tui-avatar
                      [src]="item.icon || '@tui.file'"
                      ngSkipHydration
                    />
                    {{ item.name | translate }}
                  </button>
                }
              </tui-opt-group>
            }
            @for (group of global.settings() | keyvalue; track group.key) {
              <tui-opt-group [label]="group.key | translate" ngSkipHydration>
                @for (item of group.value; track item.name) {
                  <button
                    tuiOption
                    new
                    type="button"
                    (click.zoneless)="onClick(item)"
                    class="gap-2"
                    ngSkipHydration
                  >
                    <tui-avatar
                      [src]="item.icon || '@tui.file'"
                      ngSkipHydration
                    />
                    {{ item.name | translate }}
                  </button>
                }
              </tui-opt-group>
            }
          </tui-data-list>
        </button>
        @let breadcrumbItems = items();
        @if (breadcrumbItems.length > 0) {
          <!-- Mobile -->
          <div class="sm:hidden overflow-hidden">
            <tui-breadcrumbs
              ngSkipHydration
              [itemsLimit]="breadcrumbItems.length > 1 ? 2 : 0"
            >
              @for (item of breadcrumbItems; track item.caption) {
                <a
                  class="overflow-hidden"
                  *tuiItem
                  tuiLink
                  [routerLink]="item.routerLink"
                >
                  {{ item.caption | translate }}
                </a>
              }
            </tui-breadcrumbs>
          </div>
          <!-- Desktop -->
          <div class="hidden sm:flex overflow-hidden">
            <tui-breadcrumbs ngSkipHydration>
              @for (item of breadcrumbItems; track item.caption) {
                <a
                  class="overflow-hidden"
                  *tuiItem
                  tuiLink
                  [routerLink]="item.routerLink"
                >
                  {{ item.caption | translate }}
                </a>
              }
            </tui-breadcrumbs>
          </div>
        }
      </div>
      <div
        class="flex items-center gap-2 sm:gap-4 whitespace-nowrap"
        ngSkipHydration
      >
        <!-- Desktop: show full search input -->
        <div class="hidden sm:block" ngSkipHydration>
          <tui-textfield ngSkipHydration class="!m-0">
            <input
              #input
              tuiSearchHotkey
              [formControl]="control"
              [tuiInputSearch]="search"
              ngSkipHydration
            />
            <ng-template #search>
              <tui-search-results [results]="results$ | async" ngSkipHydration>
                <tui-search-history
                  [popular]="global.searchPopular()"
                  ngSkipHydration
                />
                <ng-template let-item>
                  <a tuiCell [href]="item.href" ngSkipHydration>
                    <tui-avatar
                      [src]="item.icon || '@tui.file'"
                      ngSkipHydration
                    />
                    <span tuiTitle ngSkipHydration>
                      {{ item.title }}
                      <span tuiSubtitle ngSkipHydration>{{
                        item.subtitle
                      }}</span>
                    </span>
                  </a>
                </ng-template>
              </tui-search-results>
            </ng-template>
          </tui-textfield>
        </div>

        <!-- Mobile: Search and fullscreen buttons -->
        <div class="sm:hidden">
          <button
            tuiIconButton
            type="button"
            [iconStart]="'@tui.search'"
            [title]="'common.search' | translate"
            (click.zoneless)="input.open()"
            ngSkipHydration
          >
            {{ 'common.search' | translate }}
          </button>
          <button
            tuiIconButton
            type="button"
            size="s"
            (click.zoneless)="toggleFullscreen()"
            [iconStart]="isFullscreen() ? '@tui.minimize' : '@tui.fullscreen'"
            [title]="
              (isFullscreen() ? 'common.exit_fullscreen' : 'common.fullscreen')
                | translate
            "
            ngSkipHydration
          >
            {{
              isFullscreen() ? 'common.exit_fullscreen' : 'common.fullscreen'
            }}
          </button>
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnDestroy {
  protected global = inject(GlobalData);

  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly isBrowser =
    isPlatformBrowser(this.platformId) && typeof document !== 'undefined';
  private readonly onFsChange = () => {
    if (this.isBrowser) this.isFullscreen.set(!!document.fullscreenElement);
  };

  isFullscreen: WritableSignal<boolean> = signal(false);

  open = false;
  protected readonly control = new FormControl('');

  constructor() {
    if (this.isBrowser) {
      this.isFullscreen.set(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', this.onFsChange);
    }
  }

  items: Signal<BreadcrumbItem[]> = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [
      { caption: 'nav.home', routerLink: ['/home'] },
    ];

    const area = this.global.area();
    const crag = this.global.crag();

    // If area is loaded, use it. Otherwise, when we only have a crag,
    // synthesize the area breadcrumb from the crag metadata so breadcrumbs
    // are correct on direct navigation to a crag route.
    if (area) {
      items.push({
        caption: area.areaName,
        routerLink: ['/zone', area.countrySlug, area.areaSlug],
      });
    } else if (crag) {
      items.push({
        caption: crag.areaName,
        routerLink: ['/zone', crag.countrySlug, crag.areaSlug],
      });
    }

    if (crag) {
      items.push({
        caption: crag.cragName,
        routerLink: ['/crag', crag.countrySlug, crag.cragSlug],
      });
    }

    // Sector (when viewing a sector page)
    const sector = this.global.sector();
    if (sector && crag) {
      items.push({
        caption: sector.sectorName,
        routerLink: [
          '/sector',
          crag.countrySlug,
          crag.cragSlug,
          sector.sectorSlug,
        ],
      });
    }

    const topo = this.global.topo();
    if (topo && crag) {
      items.push({
        caption: topo.name,
        routerLink: ['/topo', crag.countrySlug, crag.cragSlug, String(topo.id)],
      });
    }

    const route = this.global.route();
    if (route) {
      const country =
        route.countrySlug || crag?.countrySlug || area?.countrySlug;
      const cragSlug = route.cragSlug || crag?.cragSlug;
      const sectorSlug = route.sectorSlug;
      const zlaggableSlug = route.zlaggableSlug;
      if (country && cragSlug && sectorSlug && zlaggableSlug) {
        items.push({
          caption: route.zlaggableName,
          routerLink: [
            '/route',
            country,
            cragSlug,
            'sector',
            sectorSlug,
            String(zlaggableSlug),
          ],
        });
      }
    }

    return items.filter((i) => !!i.caption).slice(0, -1);
  });

  protected readonly results$ = this.control.valueChanges.pipe(
    filter(Boolean),
    switchMap((value: string) =>
      timer(2000).pipe(
        map(() => this.filter(value)),
        startWith(null),
      ),
    ),
  );

  protected onClick(item: OptionsItem) {
    item?.fn?.(item);
  }

  private filter(query: string): SearchData {
    return Object.entries(this.global.searchData()).reduce(
      (result, [key, value]) => ({
        ...result,
        [key]: value.filter(({ title, href, subtitle = '' }) =>
          TUI_DEFAULT_MATCHER(title + href + subtitle, query),
        ),
      }),
      {},
    );
  }

  toggleFullscreen() {
    if (!this.isBrowser) return;
    const docEl = document.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    if (!document.fullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      document.removeEventListener('fullscreenchange', this.onFsChange);
    }
  }
}
