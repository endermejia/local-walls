import { CommonModule, isPlatformBrowser, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  PLATFORM_ID,
  resource,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiAppearance } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';
import { TuiTitle } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { SupabaseService } from '../services/supabase.service';
import { AscentCardSkeletonComponent } from './ascent-card-skeleton';
import { EmptyStateComponent } from './empty-state';
import { RoutesTableComponent } from './routes-table';
import { RouteWithExtras } from '../models';

@Component({
  selector: 'app-user-likes',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    LowerCasePipe,
    TuiAppearance,
    TuiHeader,
    TuiTitle,
    AscentCardSkeletonComponent,
    EmptyStateComponent,
    RoutesTableComponent,
  ],
  template: `
    <div class="flex flex-col gap-8">
      <!-- Liked Areas -->
      <section class="grid gap-2">
        <header tuiHeader>
          <h3 tuiTitle>{{ 'likedAreas' | translate }}</h3>
        </header>
        <div class="grid gap-6 grid-cols-1 xl:grid-cols-2">
          @if (likedAreasResource.isLoading()) {
            @for (_ of [1, 2, 3, 4]; track $index) {
              <app-ascent-card-skeleton
                [showUser]="false"
                [showRoute]="false"
              />
            }
          } @else {
            @for (area of likedAreas(); track area.id) {
              <button
                class="p-6 rounded-3xl text-left"
                [tuiAppearance]="
                  area.liked ? 'outline-destructive' : 'outline'
                "
                (click.zoneless)="router.navigate(['/area', area.slug])"
              >
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ area.name }}</h2>
                  </header>
                  <section
                    class="flex items-center justify-between gap-2"
                  >
                    <div class="text-xl">
                      {{ area.crags_count }}
                      {{
                        'labels.' +
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
          @if (likedCragsResource.isLoading()) {
            @for (_ of [1, 2, 3, 4]; track $index) {
              <app-ascent-card-skeleton
                [showUser]="false"
                [showRoute]="false"
              />
            }
          } @else {
            @for (crag of likedCrags(); track crag.id) {
              <button
                class="p-6 rounded-3xl text-left"
                [tuiAppearance]="
                  crag.liked ? 'outline-destructive' : 'outline'
                "
                (click.zoneless)="
                  router.navigate(['/area', crag.area_slug, crag.slug])
                "
              >
                <div class="flex flex-col min-w-0 grow">
                  <header tuiHeader>
                    <h2 tuiTitle>{{ crag.name }}</h2>
                  </header>
                  <section
                    class="flex items-center justify-between gap-2"
                  >
                    <div class="flex flex-col items-start">
                      <div class="text-xl">
                        {{ crag.topos_count }}
                        {{
                          'labels.' +
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
          @if (likedRoutesResource.isLoading()) {
            <div class="grid gap-6 grid-cols-1 xl:grid-cols-2">
              @for (_ of [1, 2, 3, 4]; track $index) {
                <app-ascent-card-skeleton [showUser]="false" />
              }
            </div>
          } @else if (likedRoutes().length) {
            <app-routes-table
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
})
export class UserLikesComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  userId = input<string | undefined>();

  protected readonly likedRoutesResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];

      const { data: routeLikes } = await this.supabase.client
        .from('route_likes')
        .select('route_id')
        .eq('user_id', userId);

      const routeIds = routeLikes?.map((r) => r.route_id) || [];
      if (!routeIds.length) return [];

      const currentUserId = this.supabase.authUserId();
      let query = this.supabase.client
        .from('routes')
        .select(
          `
        *,
        liked:route_likes(id),
        project:route_projects(id),
        ascents:route_ascents(rate),
        own_ascent:route_ascents(*),
        crag:crags(
          slug,
          name,
          area:areas(slug, name)
        )
      `,
        )
        .in('id', routeIds);

      if (currentUserId) {
        query = query
          .eq('own_ascent.user_id', currentUserId)
          .eq('project.user_id', currentUserId)
          .eq('liked.user_id', currentUserId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[UserLikes] liked routes error', error);
        return [];
      }

      return (
        data.map((r) =>
          (() => {
            const rates =
              r.ascents?.map((a) => a.rate).filter((rate) => rate != null) ??
              [];
            const rating =
              rates.length > 0
                ? rates.reduce((a, b) => a + b, 0) / rates.length
                : 0;

            return {
              ...r,
              liked: (r.liked?.length ?? 0) > 0,
              project: (r.project?.length ?? 0) > 0,
              crag_slug: r.crag?.slug,
              crag_name: r.crag?.name,
              area_slug: r.crag?.area?.slug,
              area_name: r.crag?.area?.name,
              rating,
              ascent_count: r.ascents?.length ?? 0,
              climbed: (r.own_ascent?.length ?? 0) > 0,
              own_ascent: r.own_ascent?.[0],
            } as RouteWithExtras;
          })(),
        ) ?? []
      );
    },
  });

  protected readonly likedCragsResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];

      const { data: cragLikes } = await this.supabase.client
        .from('crag_likes')
        .select('crag_id')
        .eq('user_id', userId);

      const cragIds = cragLikes?.map((c) => c.crag_id) || [];
      if (!cragIds.length) return [];

      const { data: likedCrags, error } = await this.supabase.client
        .from('crags')
        .select(
          `
          id,
          name,
          slug,
          area_id,
          topos_count:topos(count),
          area:areas(name, slug)
        `,
        )
        .in('id', cragIds);

      if (error) {
        console.error('[UserLikes] liked crags error', error);
        return [];
      }

      return likedCrags.map((c) => ({
        ...c,
        topos_count: c.topos_count?.[0]?.count ?? 0,
        area_name: c.area?.name,
        area_slug: c.area?.slug,
        liked: true,
      }));
    },
  });

  protected readonly likedAreasResource = resource({
    params: () => this.userId(),
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];

      const { data: areaLikes } = await this.supabase.client
        .from('area_likes')
        .select('area_id')
        .eq('user_id', userId);

      const areaIds = areaLikes?.map((a) => a.area_id) || [];
      if (!areaIds.length) return [];

      const { data: likedAreas, error } = await this.supabase.client
        .from('areas')
        .select(
          `
          id,
          name,
          slug,
          crags_count:crags(count)
        `,
        )
        .in('id', areaIds);

      if (error) {
        console.error('[UserLikes] liked areas error', error);
        return [];
      }

      return likedAreas.map((a) => ({
        ...a,
        crags_count: a.crags_count?.[0]?.count ?? 0,
        liked: true,
      }));
    },
  });

  protected readonly likedRoutes = computed(
    () => this.likedRoutesResource.value() ?? [],
  );
  protected readonly likedCrags = computed(
    () => this.likedCragsResource.value() ?? [],
  );
  protected readonly likedAreas = computed(
    () => this.likedAreasResource.value() ?? [],
  );
}
