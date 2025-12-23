import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  resource,
} from '@angular/core';
import { AsyncPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TUI_COUNTRIES, TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import { TuiButton, TuiFallbackSrcPipe, TuiHint } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { SupabaseService, GlobalData } from '../services';
import {
  RoutesTableComponent,
  RouteItem,
  AscentsTableComponent,
} from '../components';
import {
  RouteWithExtras,
  RouteAscentDto,
  RouteAscentWithExtras,
  RouteDto,
} from '../models';
import AscentFormComponent from './ascent-form';
import { UserProfileConfigComponent } from './user-profile-config';

interface ProjectResponse {
  route:
    | (RouteDto & {
        liked: { id: number }[];
        project: { id: number }[];
        crag: {
          slug: string;
          name: string;
          area: { slug: string; name: string } | null;
        } | null;
        ascents: { rate: number }[];
      })
    | null;
}

interface AscentResponse extends RouteAscentDto {
  route:
    | (RouteDto & {
        liked: { id: number }[];
        project: { id: number }[];
        crag: {
          slug: string;
          name: string;
          area: { slug: string; name: string } | null;
        } | null;
      })
    | null;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiAvatar,
    TuiFallbackSrcPipe,
    TuiButton,
    TuiHint,
    AsyncPipe,
    TuiSkeleton,
    LowerCasePipe,
    RoutesTableComponent,
    AscentsTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="w-full max-w-5xl mx-auto p-4 grid gap-4">
      @let loading = !profile();
      <div class="flex items-center gap-4">
        @let avatar = profileAvatarSrc();
        <tui-avatar
          [src]="avatar | tuiFallbackSrc: '@tui.user' | async"
          [tuiSkeleton]="loading"
          size="xxl"
        />
        <div class="grow">
          <div class="flex flex-row items-center justify-between">
            @let name = profile()?.name;
            <div class="text-xl font-semibold">
              <span
                [tuiSkeleton]="loading ? 'name lastName secondLastName' : false"
              >
                {{ name }}
              </span>
            </div>
            @if (canEdit()) {
              <button
                iconStart="@tui.bolt"
                size="m"
                tuiIconButton
                type="button"
                appearance="action-grayscale"
                [tuiHint]="'actions.edit' | translate"
                (click)="openEditDialog()"
              >
                {{ 'actions.edit' | translate }}
              </button>
            }
          </div>

          <div class="flex items-center gap-x-2 flex-wrap">
            @let country = profileCountry();
            @let city = profile()?.city;
            <span
              class="flex items-center gap-2"
              [tuiSkeleton]="loading ? 'country, city' : false"
            >
              {{ (countriesNames$ | async)?.[country]
              }}{{ city ? ', ' + city : '' }}
            </span>
            @if (profileAge(); as age) {
              |
              <span>
                {{ age }}
                {{ 'labels.years' | translate | lowercase }}
              </span>
            }

            @if (profile()?.starting_climbing_year; as year) {
              <span class="opacity-70">
                (
                {{ 'labels.startingClimbingYear' | translate | lowercase }}
                {{ year }}
                )
              </span>
            }
          </div>
          <div class="opacity-70">
            @let bio = profile()?.bio;
            <span
              [tuiSkeleton]="
                loading
                  ? 'This text serves as the content behind the skeleton and adjusts the width.'
                  : false
              "
            >
              {{ bio }}
            </span>
          </div>
        </div>
      </div>

      @if (projects().length > 0) {
        <div class="mt-8 min-w-0">
          <h3 class="text-xl font-semibold mb-4 capitalize">
            {{ 'labels.projects' | translate }}
          </h3>
          <app-routes-table
            [data]="projects()"
            [showAdminActions]="false"
            [showLocation]="true"
            (toggleLike)="onToggleLike($event)"
            (toggleProject)="onToggleProject($event)"
            (logAscent)="onLogAscent($event)"
            (editAscent)="onEditAscent($event)"
          />
        </div>
      }

      @if (ascents().length > 0) {
        <div class="mt-8 min-w-0">
          <h3 class="text-xl font-semibold mb-4 capitalize">
            {{ 'labels.ascents' | translate }}
          </h3>
          <app-ascents-table
            [data]="ascents()"
            [showUser]="false"
            (updated)="ascentsResource.reload()"
            (deleted)="onAscentDeleted($event)"
          />
        </div>
      }
    </section>
  `,
  host: { class: 'overflow-auto' },
})
export class UserProfileComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly countriesNames$ = inject(TUI_COUNTRIES);
  private readonly translate = inject(TranslateService);

  // Route param (optional)
  id = input<string | undefined>();

  constructor() {
    effect(() => {
      // Reset breadcrumbs when navigating to profile page
      this.id(); // Track the id signal
      this.global.resetDataByPage('user');
    });
  }

  // Currently viewed profile (if by id)
  private readonly externalProfileResource = resource({
    params: () => this.id(),
    loader: async ({ params: paramId }) => {
      if (!paramId || !isPlatformBrowser(this.platformId)) return null;

      // If param is the same as current user id, we use own profile (computed below)
      const currentId = this.supabase.authUserId();
      if (currentId && paramId === currentId) return null;

      const { data, error } = await this.supabase.client
        .from('user_profiles')
        .select('*')
        .eq('id', paramId)
        .maybeSingle();

      if (error) {
        console.error('[UserProfile] fetch by id error', error);
        return null;
      }
      return data;
    },
  });

  readonly profile = computed(() => {
    const paramId = this.id();
    const ownProfile = this.supabase.userProfile();
    const currentId = this.supabase.authUserId();

    if (!paramId || (currentId && paramId === currentId)) {
      return ownProfile ?? null;
    }

    return this.externalProfileResource.value() ?? null;
  });

  readonly loading = computed(
    () =>
      this.supabase.userProfileResource.isLoading() ||
      this.externalProfileResource.isLoading(),
  );

  readonly profileCountry = computed(
    () => this.profile()?.country as TuiCountryIsoCode,
  );

  readonly isOwnProfile = computed(() => {
    const currentId = this.supabase.authUserId();
    const viewedId = this.profile()?.id ?? null;
    return !!currentId && !!viewedId && currentId === viewedId;
  });
  readonly canEdit = computed(() => this.isOwnProfile());

  readonly profileAvatarSrc = computed(() =>
    this.supabase.buildAvatarUrl(this.profile()?.avatar),
  );

  readonly profileAge = computed(() => {
    const bd = this.profile()?.birth_date as string | null | undefined;
    if (!bd) return null;
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years;
  });

  readonly projectsResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        // Fetch routes that are projects for this specific user
        const { data, error } = await this.supabase.client
          .from('route_projects')
          .select(
            `
            route:routes (
              *,
              liked:route_likes(id),
              project:route_projects(id),
              crag:crags(
                slug,
                name,
                area:areas(slug, name)
              ),
              ascents:route_ascents(rate)
            )
          `,
          )
          .eq('user_id', userId);

        if (error) {
          console.error('[UserProfile] projectsResource error', error);
          return [];
        }

        return (data as ProjectResponse[])
          .map((item) => {
            const r = item.route;
            if (!r) return null;
            const rates =
              r.ascents?.map((a) => a.rate).filter((rate) => rate != null) ??
              [];
            const rating =
              rates.length > 0
                ? rates.reduce((a, b) => a + b, 0) / rates.length
                : 0;

            const { crag, ascents, liked, project, ...rest } = r;
            return {
              ...rest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.area?.slug,
              area_name: crag?.area?.name,
              rating,
              ascent_count: ascents?.length ?? 0,
            } as RouteItem;
          })
          .filter((r): r is RouteItem => !!r);
      } catch (e) {
        console.error('[UserProfile] projectsResource exception', e);
        return [];
      }
    },
  });

  readonly ascentsResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }): Promise<RouteAscentWithExtras[]> => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];
      try {
        await this.supabase.whenReady();
        const { data, error } = await this.supabase.client
          .from('route_ascents')
          .select(
            `
            *,
            route:routes (
              *,
              liked:route_likes(id),
              project:route_projects(id),
              crag:crags(
                slug,
                name,
                area:areas(slug, name)
              )
            )
          `,
          )
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (error) {
          console.error('[UserProfile] ascentsResource error', error);
          return [];
        }

        return (data as AscentResponse[]).map((a) => {
          const { route, ...ascentRest } = a;
          let mappedRoute: RouteWithExtras | undefined = undefined;

          if (route) {
            const { crag, liked, project, ...routeRest } = route;
            mappedRoute = {
              ...routeRest,
              liked: (liked?.length ?? 0) > 0,
              project: (project?.length ?? 0) > 0,
              crag_slug: crag?.slug,
              crag_name: crag?.name,
              area_slug: crag?.area?.slug,
              area_name: crag?.area?.name,
            } as RouteWithExtras;
          }

          return {
            ...ascentRest,
            route: mappedRoute,
          } as RouteAscentWithExtras;
        });
      } catch (e) {
        console.error('[UserProfile] ascentsResource exception', e);
        return [];
      }
    },
  });

  readonly ascents = computed(() => this.ascentsResource.value() ?? []);

  readonly projects = computed(() => this.projectsResource.value() ?? []);

  onToggleLike(route: RouteItem): void {
    this.projectsResource.update((current) =>
      (current ?? []).map((item) =>
        item.id === route.id ? { ...item, liked: !item.liked } : item,
      ),
    );
  }

  onToggleProject(route: RouteItem): void {
    // If it's own profile and we are toggling off project, remove from list
    if (this.isOwnProfile()) {
      this.projectsResource.update((current) =>
        (current ?? []).filter((item) => item.id !== route.id),
      );
    } else {
      // If someone else's profile, just toggle the icon
      this.projectsResource.update((current) =>
        (current ?? []).map((item) =>
          item.id === route.id ? { ...item, project: !item.project } : item,
        ),
      );
    }
  }

  onAscentDeleted(id: number): void {
    this.ascentsResource.update((curr) =>
      (curr ?? []).filter((a) => a.id !== id),
    );
  }

  onLogAscent(route: RouteWithExtras): void {
    this.dialogs
      .open(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant('ascent.new'),
        data: { routeId: route.id, grade: route.grade },
        size: 'm',
      })
      .subscribe();
  }

  onEditAscent(ascent: RouteAscentDto): void {
    this.dialogs
      .open(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant('ascent.edit'),
        data: { routeId: ascent.route_id, ascentData: ascent },
        size: 'm',
      })
      .subscribe();
  }

  openEditDialog(): void {
    if (!this.isOwnProfile()) return;
    this.dialogs
      .open(new PolymorpheusComponent(UserProfileConfigComponent), {
        appearance: 'fullscreen',
        closable: false,
      })
      .subscribe();
  }
}

export default UserProfileComponent;
