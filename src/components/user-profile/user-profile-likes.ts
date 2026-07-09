import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';

import { TuiAppearance, TuiTitle } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';
import { TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { FavoritesService } from '../../services/favorites.service';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';

import { EmptyStateComponent } from '../ui/empty-state';
import { OutdoorRoutesTableComponent } from '../route/outdoor-routes-table';

import { AreaListItem, CragListItem, RouteWithExtras } from '../../models';

@Component({
  selector: 'app-user-profile-likes',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    OutdoorRoutesTableComponent,
    TranslatePipe,
    TuiAppearance,
    TuiHeader,
    TuiSkeleton,
    TuiTitle,
  ],
  template: `
    <div class="flex flex-col gap-8">
      <!-- Liked Areas -->
      <section class="grid gap-2">
        <header tuiHeader>
          <h3 tuiTitle>{{ 'likedAreas' | translate }}</h3>
        </header>
        <div class="grid gap-6 grid-cols-1 xl:grid-cols-2">
          @if (isLoading() && !likedAreas().length) {
            @for (_ of [1, 2, 3, 4]; track $index) {
              <div
                class="p-6 rounded-3xl flex flex-col gap-4"
                tuiAppearance="outline"
              >
                <div [tuiSkeleton]="true" class="w-2/3 h-6 rounded-3xl"></div>
                <div
                  [tuiSkeleton]="true"
                  class="w-1/3 h-5 rounded-3xl opacity-60"
                ></div>
              </div>
            }
          } @else {
            @for (area of likedAreas(); track area.id) {
              <button
                class="p-6 rounded-3xl text-left"
                [tuiAppearance]="area.liked ? 'outline-destructive' : 'outline'"
                (click.zoneless)="router.navigate(['/area', area.slug])"
              >
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ area.name }}</h2>
                  </header>
                  <section class="flex items-center justify-between gap-2">
                    <div class="text-xl">
                      {{ area.crags_count }}
                      {{
                        (area.crags_count === 1 ? 'crag' : 'crags')
                          | translate
                          | lowercase
                      }}
                    </div>
                  </section>
                </div>
              </button>
            } @empty {
              <div class="col-span-full opacity-50">
                <app-empty-state icon="@tui.heart" />
              </div>
            }
          }
        </div>
      </section>

      <!-- Liked Crags -->
      <section class="grid gap-2">
        <header tuiHeader>
          <h3 tuiTitle>{{ 'likedCrags' | translate }}</h3>
        </header>
        <div class="grid gap-6 grid-cols-1 xl:grid-cols-2">
          @if (isLoading() && !likedCrags().length) {
            @for (_ of [1, 2, 3, 4]; track $index) {
              <div
                class="p-6 rounded-3xl flex flex-col gap-4"
                tuiAppearance="outline"
              >
                <div [tuiSkeleton]="true" class="w-2/3 h-6 rounded-3xl"></div>
                <div
                  [tuiSkeleton]="true"
                  class="w-1/3 h-5 rounded-3xl opacity-60"
                ></div>
              </div>
            }
          } @else {
            @for (crag of likedCrags(); track crag.id) {
              <button
                class="p-6 rounded-3xl text-left"
                [tuiAppearance]="crag.liked ? 'outline-destructive' : 'outline'"
                (click.zoneless)="
                  router.navigate(['/area', crag.area_slug, crag.slug])
                "
              >
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ crag.name }}</h2>
                  </header>
                  <section class="flex items-center justify-between gap-2">
                    <div class="flex flex-col items-start">
                      <div class="text-xl">
                        {{ crag.topos_count }}
                        {{
                          (crag.topos_count === 1 ? 'topo' : 'topos')
                            | translate
                            | lowercase
                        }}
                      </div>
                      <div class="text-sm opacity-70">
                        {{ crag.area_name }}
                      </div>
                    </div>
                  </section>
                </div>
              </button>
            } @empty {
              <div class="col-span-full opacity-50">
                <app-empty-state icon="@tui.heart" />
              </div>
            }
          }
        </div>
      </section>

      <!-- Liked Routes -->
      <section class="grid gap-2">
        <header tuiHeader>
          <h3 tuiTitle>{{ 'likedRoutes' | translate }}</h3>
        </header>
        <div class="min-w-0">
          @if (isLoading() && !likedRoutes().length) {
            <div class="grid gap-6 grid-cols-1 xl:grid-cols-2">
              @for (_ of [1, 2, 3, 4]; track $index) {
                <div
                  class="p-6 rounded-3xl flex flex-col gap-4"
                  tuiAppearance="outline"
                >
                  <div [tuiSkeleton]="true" class="w-1/2 h-6 rounded-3xl"></div>
                  <div
                    [tuiSkeleton]="true"
                    class="w-1/4 h-4 rounded-3xl opacity-60"
                  ></div>
                </div>
              }
            </div>
          } @else if (likedRoutes().length) {
            <app-outdoor-routes-table
              [data]="likedRoutes()"
              [showAdminActions]="false"
              [showLocation]="true"
              [showRowColors]="false"
            />
          } @else {
            <div class="opacity-50">
              <app-empty-state icon="@tui.heart" />
            </div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0',
  },
})
export class UserProfileLikesComponent {
  userId = input.required<string>();

  private readonly favorites = inject(FavoritesService);
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);

  protected readonly isOwnProfile = computed(() => {
    const currentId = this.supabase.authUserId();
    return !!currentId && currentId === this.userId();
  });

  protected readonly likedRoutes = computed<RouteWithExtras[]>(() =>
    this.isOwnProfile()
      ? (this.global.likedRoutes() as RouteWithExtras[])
      : (this.likedRoutesResource.value() ?? []),
  );

  protected readonly likedCrags = computed<CragListItem[]>(() =>
    this.isOwnProfile()
      ? (this.global.likedCrags() as CragListItem[])
      : (this.likedCragsResource.value() ?? []),
  );

  protected readonly likedAreas = computed<AreaListItem[]>(() =>
    this.isOwnProfile()
      ? (this.global.likedAreas() as AreaListItem[])
      : (this.likedAreasResource.value() ?? []),
  );

  protected readonly isLoading = computed(
    () =>
      this.likedRoutesResource.isLoading() ||
      this.likedCragsResource.isLoading() ||
      this.likedAreasResource.isLoading(),
  );

  protected readonly likedRoutesResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      return this.favorites.getLikedRoutes(userId);
    },
  });

  protected readonly likedCragsResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      return this.favorites.getLikedCrags(userId);
    },
  });

  protected readonly likedAreasResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      return this.favorites.getLikedAreas(userId);
    },
  });
}
