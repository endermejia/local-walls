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
import { RouterLink } from '@angular/router';
import {
  TuiButton,
  TuiDataListComponent,
  TuiFallbackSrcPipe,
  TuiHint,
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
import { TuiAvatar, TuiBreadcrumbs, TuiSkeleton } from '@taiga-ui/kit';
import { TuiCell, TuiInputSearch, TuiNavigation } from '@taiga-ui/layout';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
} from 'rxjs';
import { GlobalData, VerticalLifeApi } from '../services';
import {
  OptionsItem,
  SearchData,
  SearchApiItem,
  MapAreaItem,
  MapCragItem,
} from '../models';

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
    TuiHint,
    TranslatePipe,
    TuiFallbackSrcPipe,
    TuiSkeleton,
  ],
  template: `
    <header
      tuiNavigationHeader
      class="flex items-center justify-between sm:gap-4"
      ngSkipHydration
    >
      <div class="flex items-center gap-2 overflow-hidden" ngSkipHydration>
        <button
          [tuiHint]="global.isMobile() ? null : ('labels.menu' | translate)"
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
                      [src]="item.icon | tuiFallbackSrc: '@tui.file' | async"
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
            [tuiHint]="
              global.isMobile() ? null : ('actions.search' | translate)
            "
            (click.zoneless)="input.open()"
            ngSkipHydration
          >
            {{ 'actions.search' | translate }}
          </button>
          <button
            tuiIconButton
            type="button"
            size="s"
            (click.zoneless)="toggleFullscreen()"
            [iconStart]="isFullscreen() ? '@tui.shrink' : '@tui.expand'"
            [tuiHint]="
              global.isMobile()
                ? null
                : ((isFullscreen()
                    ? 'actions.exitFullscreen'
                    : 'actions.fullscreen'
                  ) | translate)
            "
            ngSkipHydration
          >
            {{
              isFullscreen() ? 'actions.exitFullscreen' : 'actions.fullscreen'
            }}
          </button>
        </div>

        @let user = global.userProfile();
        @if (user) {
          <tui-avatar
            [src]="global.userAvatar() || user.name[0] || '@tui.user'"
            routerLink="/profile"
            style="cursor: pointer;"
          />
        } @else {
          <tui-avatar tuiSkeleton />
        }
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnDestroy {
  protected global = inject(GlobalData);
  private api = inject(VerticalLifeApi);

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
      { caption: 'labels.areas', routerLink: ['/areas'] },
    ];

    const area = this.global.selectedArea();
    const crag = this.global.selectedCrag();
    const route = this.global.routeDetailResource.value();

    if (area) {
      items.push({
        caption: area.name,
        routerLink: ['/area', area.slug],
      });
      if (crag) {
        items.push({
          caption: crag.name,
          routerLink: ['/area', area.slug, crag.slug],
        });
        if (route) {
          items.push({
            caption: route.name,
            routerLink: ['/area', area.slug, crag.slug, route.slug],
          });
        }
      }
    }

    return items.filter((i) => !!i.caption).slice(0, -1);
  });

  protected readonly results$ = this.control.valueChanges.pipe(
    map((v) => (v ?? '').trim()),
    filter((v) => v.length >= 2),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((query: string) =>
      this.api
        .getMapItemsBySearch({ query, pageSize: 10, showOnMap: false })
        .then((items) => this.mapItemsToSearchData(items))
        .catch(() => ({}) as SearchData),
    ),
    startWith(null),
  );

  protected onClick(item: OptionsItem) {
    item?.fn?.(item);
  }

  private mapItemsToSearchData(
    items: readonly (SearchApiItem | MapCragItem | MapAreaItem)[],
  ): SearchData {
    const areas: {
      href: string;
      title: string;
      subtitle?: string;
      icon?: string;
    }[] = [];
    const crags: {
      href: string;
      title: string;
      subtitle?: string;
      icon?: string;
    }[] = [];
    const routes: {
      href: string;
      title: string;
      subtitle?: string;
      icon?: string;
    }[] = [];

    for (const it of items ?? []) {
      // Normalize fields to support both snake_case (map items) and camelCase (search items)
      const type: number | undefined = 'type' in it ? it.type : undefined;

      const countrySlug: string | undefined =
        'countrySlug' in it
          ? it.countrySlug
          : 'country_slug' in it
            ? it.country_slug
            : undefined;

      const countryName: string | undefined =
        'countryName' in it
          ? it.countryName
          : 'country_name' in it
            ? it.country_name
            : undefined;

      // Prefer explicit area fields; check snake_case before generic 'slug/displayName' to avoid TS narrowing to never
      const areaSlug: string | undefined =
        'areaSlug' in it
          ? it.areaSlug
          : 'area_slug' in it
            ? it.area_slug
            : 'slug' in it
              ? it.slug
              : undefined; // area may use slug/displayName

      const areaName: string | undefined =
        'areaName' in it
          ? it.areaName
          : 'area_name' in it
            ? it.area_name
            : 'name' in it
              ? it.name
              : undefined;

      const cragSlug: string | undefined =
        'cragSlug' in it ? it.cragSlug : 'slug' in it ? it.slug : undefined;

      const cragName: string | undefined =
        'cragName' in it ? it.cragName : 'name' in it ? it.name : undefined;

      const sectorSlug: string | undefined =
        'sectorSlug' in it ? it.sectorSlug : undefined;

      const zlaggableSlug: string | undefined =
        'zlaggableSlug' in it ? it.zlaggableSlug : undefined;

      const zlaggableName: string | undefined =
        'zlaggableName' in it ? it.zlaggableName : undefined;

      const difficulty: string | undefined =
        'difficulty' in it ? it.difficulty : undefined;

      // Decide kind
      const isRoute =
        type === 3 || (!!zlaggableSlug && !!sectorSlug && !!cragSlug);
      const isArea =
        type === 0 ||
        (!!areaSlug &&
          !cragSlug &&
          !zlaggableSlug &&
          !!countrySlug &&
          !!areaName);
      const isCrag = !isArea && (type === 1 || !!cragSlug);

      if (isRoute && cragSlug && areaSlug && zlaggableSlug) {
        const href = `/area/${areaSlug}/${cragSlug}/${zlaggableSlug}`;
        const subtitleParts: string[] = [];
        if (cragName) subtitleParts.push(cragName);
        if (areaName) subtitleParts.push(areaName);
        if (difficulty) subtitleParts.push(difficulty);
        routes.push({
          href,
          title: zlaggableName ?? '',
          subtitle: subtitleParts.join(' · '),
          icon: '@tui.route',
        });
        continue;
      }

      if (isCrag && cragSlug) {
        const href = areaSlug ? `/area/${areaSlug}/${cragSlug}` : `/explore`;
        const subtitleParts: string[] = [];
        if (areaName) subtitleParts.push(areaName);
        if (countryName) subtitleParts.push(countryName);
        crags.push({
          href,
          title: cragName ?? '',
          subtitle: subtitleParts.join(' · '),
          icon: '@tui.map-pin',
        });
        continue;
      }

      if (isArea && countrySlug && areaSlug) {
        const href = `/area/${areaSlug}`;
        areas.push({
          href,
          title: areaName ?? '',
          subtitle: countryName,
          icon: '@tui.layers',
        });
      }
    }

    const result: SearchData = {};
    if (areas.length) result['Areas'] = areas;
    if (crags.length) result['Crags'] = crags;
    if (routes.length) result['Routes'] = routes;
    return result;
  }

  toggleFullscreen() {
    if (!this.isBrowser) return;
    const docEl = document.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
    };
    if (!document.fullscreenElement) {
      if (docEl.requestFullscreen) {
        void docEl.requestFullscreen();
      }
    } else if (document.exitFullscreen) {
      void document.exitFullscreen();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      document.removeEventListener('fullscreenchange', this.onFsChange);
    }
  }
}
