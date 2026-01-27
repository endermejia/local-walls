import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { effect, viewChild, ElementRef } from '@angular/core';

import {
  TuiDataListComponent,
  TuiDataList,
  TuiDropdown,
  TuiFallbackSrcPipe,
  TuiIcon,
  TuiTextfield,
  TuiTitle,
  TuiButton,
} from '@taiga-ui/core';
import {
  TuiSearchHotkey,
  TuiSearchResultsComponent,
} from '@taiga-ui/experimental';
import {
  TuiAvatar,
  TuiDataListDropdownManager,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { TuiCell, TuiInputSearch } from '@taiga-ui/layout';
import { TuiTabBar } from '@taiga-ui/addon-mobile';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  startWith,
  switchMap,
} from 'rxjs';

import { SearchData, SearchItem } from '../models';

import { GlobalData, SupabaseService } from '../services';

@Component({
  selector: 'app-header',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    RouterLink,
    TuiAvatar,
    TuiCell,
    TuiDataListComponent,
    TuiInputSearch,
    TuiSearchHotkey,
    TuiSearchResultsComponent,
    TuiTextfield,
    TuiTitle,
    TranslatePipe,
    TuiDataList,
    TuiDataListDropdownManager,
    TuiDropdown,
    TuiFallbackSrcPipe,
    TuiIcon,
    TuiTabBar,
    TuiButton,
    TuiSkeleton,
  ],
  template: `
    <nav class="flex justify-center" tuiTabBar ngSkipHydration>
      <div class="w-full max-w-2xl flex justify-between">
        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.home"
          routerLink="/home"
          ngSkipHydration
        >
          {{ 'nav.home' | translate }}
        </button>
        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.map"
          routerLink="/explore"
          ngSkipHydration
        >
          {{ 'nav.explore' | translate }}
        </button>
        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.list"
          routerLink="/areas"
          ngSkipHydration
        >
          {{ 'nav.areas' | translate }}
        </button>

        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.search"
          (click)="searchOpen = true"
          ngSkipHydration
        >
          {{ 'labels.search' | translate }}
        </button>

        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          iconStart="@tui.cog"
          [tuiDropdown]="more"
          [(tuiDropdownOpen)]="moreOpen"
          (click)="moreOpen = true"
          ngSkipHydration
        >
          {{ 'labels.more' | translate }}
          <ng-template #more let-close>
            <tui-data-list tuiDataListDropdownManager>
              @if (global.isEquipper()) {
                <button
                  tuiOption
                  type="button"
                  routerLink="/my-crags"
                  (click)="close()"
                >
                  <tui-icon icon="@tui.list" class="mr-2" />
                  {{ 'nav.my-crags' | translate }}
                </button>
              }
              @if (global.isAdmin()) {
                <button
                  tuiOption
                  type="button"
                  routerLink="/admin/users"
                  (click)="close()"
                >
                  <tui-icon icon="@tui.users" class="mr-2" />
                  {{ 'nav.admin-users' | translate }}
                </button>
                <button
                  tuiOption
                  type="button"
                  routerLink="/admin/parkings"
                  (click)="close()"
                >
                  <tui-icon icon="@tui.map-pin" class="mr-2" />
                  {{ 'nav.admin-parkings' | translate }}
                </button>
              }
              @if (global.isAdmin() || global.isEquipper()) {
                <button
                  tuiOption
                  type="button"
                  routerLink="/admin/equippers"
                  (click)="close()"
                >
                  <tui-icon icon="@tui.hammer" class="mr-2" />
                  {{ 'nav.admin-equippers' | translate }}
                </button>
              }
            </tui-data-list>
          </ng-template>
        </button>

        <button
          tuiIconButton
          appearance="action-grayscale"
          type="button"
          routerLink="/profile"
          ngSkipHydration
        >
          <tui-avatar
            [src]="global.userAvatar() || '@tui.user'"
            [tuiSkeleton]="!global.userProfile()"
            size="s"
            type="button"
          />
        </button>
      </div>
    </nav>
    <!-- Hidden search input -->
    <div class="hidden">
      <tui-textfield class="flex-1 !m-0">
        <input
          #input
          tuiSearchHotkey
          autocomplete="off"
          [formControl]="control"
          [(tuiInputSearchOpen)]="searchOpen"
          [tuiInputSearch]="searchResults"
          [placeholder]="'labels.searchPlaceholder' | translate"
          ngSkipHydration
        />
        <ng-template #searchResults>
          <tui-search-results [results]="results$ | async" ngSkipHydration>
            <ng-template let-item>
              <a
                tuiCell
                [routerLink]="item.href"
                (click.zoneless)="searchOpen = false; control.setValue('')"
                ngSkipHydration
              >
                <tui-avatar
                  [src]="item.icon | tuiFallbackSrc: '@tui.file' | async"
                  ngSkipHydration
                />
                <span tuiTitle ngSkipHydration>
                  {{ item.title }}
                  <span tuiSubtitle ngSkipHydration>{{ item.subtitle }}</span>
                </span>
              </a>
            </ng-template>
          </tui-search-results>
        </ng-template>
      </tui-textfield>
    </div>
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

  searchOpen = false;
  moreOpen = false;
  protected readonly control = new FormControl('');
  private readonly searchInput =
    viewChild<ElementRef<HTMLInputElement>>('input');

  constructor() {
    if (this.isBrowser) {
      this.isFullscreen.set(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', this.onFsChange);
    }

    effect(() => {
      if (this.searchOpen) {
        setTimeout(() => this.searchInput()?.nativeElement?.focus(), 100);
      }
    });
  }

  protected readonly activeItemIndex = computed(() => {
    const url = this.global.currentUrl();
    if (url.includes('/home')) return 0;
    if (url.includes('/explore')) return 1;
    if (url.includes('/areas') || url.includes('/area')) return 2;
    if (url.includes('/profile')) {
      return this.global.isAdmin() || this.global.isEquipper() ? 5 : 4;
    }
    // Admin routes
    if (url.includes('/admin') || url.includes('/my-crags')) {
      return 4;
    }
    return -1;
  });

  protected readonly results$ = this.control.valueChanges.pipe(
    map((v) => (v ?? '').trim()),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((query) => {
      if (query.length < 2) return from([null]);
      return from(
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
      );
    }),
    startWith(null),
  );

  ngOnDestroy() {
    if (this.isBrowser) {
      document.removeEventListener('fullscreenchange', this.onFsChange);
    }
  }
}
