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
  from,
  map,
  startWith,
  switchMap,
} from 'rxjs';
import { GlobalData, SupabaseService } from '../services';
import { OptionsItem, SearchData, SearchItem } from '../models';
import { TranslateService } from '@ngx-translate/core';

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
                  <a tuiCell [routerLink]="item.href" ngSkipHydration>
                    <tui-avatar
                      [src]="item.icon | tuiFallbackSrc: '@tui.file' | async"
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
  private readonly supabase = inject(SupabaseService);
  private readonly translate = inject(TranslateService);

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
    const topo = this.global.topoDetailResource.value();
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
        if (topo) {
          items.push({
            caption: topo.name,
            routerLink: ['/area', area.slug, crag.slug, 'topo', topo.id],
          });
        }
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
    switchMap((query) =>
      from(
        (async (): Promise<SearchData> => {
          await this.supabase.whenReady();
          const q = `%${query}%`;

          const [
            { data: areas },
            { data: crags },
            { data: routes },
            { data: users },
          ] = await Promise.all([
            this.supabase.client
              .from('areas')
              .select('id, name, slug')
              .ilike('name', q)
              .limit(5),
            this.supabase.client
              .from('crags')
              .select('id, name, slug, area:areas(name, slug)')
              .ilike('name', q)
              .limit(5),
            this.supabase.client
              .from('routes')
              .select(
                'id, name, slug, crag:crags!routes_crag_id_fkey(name, slug, area:areas!crags_area_id_fkey(name, slug))',
              )
              .ilike('name', q)
              .limit(5),
            this.supabase.client
              .from('user_profiles')
              .select('id, name, avatar')
              .ilike('name', q)
              .limit(5),
          ]);

          const results: SearchData = {};

          if (areas?.length) {
            results[this.translate.instant('labels.areas')] = areas.map(
              (a) =>
                ({
                  title: a.name,
                  href: `/area/${a.slug}`,
                  icon: '@tui.map-pin',
                }) as SearchItem,
            );
          }

          if (crags?.length) {
            results[this.translate.instant('labels.crags')] = crags.map((c) => {
              const area = c.area;
              return {
                title: c.name,
                subtitle: area?.name,
                href: `/area/${area?.slug}/${c.slug}`,
                icon: '@tui.mountain',
              } as SearchItem;
            });
          }

          if (routes?.length) {
            results[this.translate.instant('labels.routes')] = routes.map(
              (r) => {
                const crag = r.crag;
                const area = crag?.area;
                return {
                  title: r.name,
                  subtitle: `${area?.name || ''} > ${crag?.name || ''}`,
                  href: `/area/${area?.slug}/${crag?.slug}/${r.slug}`,
                  icon: '@tui.route',
                } as SearchItem;
              },
            );
          }

          if (users?.length) {
            results[this.translate.instant('labels.users')] = users.map(
              (u) =>
                ({
                  title: u.name,
                  href: `/profile/${u.id}`,
                  icon: this.supabase.buildAvatarUrl(u.avatar) || u.name[0],
                }) as SearchItem,
            );
          }

          return results;
        })(),
      ),
    ),
    startWith(null),
  );

  protected onClick(item: OptionsItem) {
    item?.fn?.(item);
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
