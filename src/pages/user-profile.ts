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
import { TranslatePipe } from '@ngx-translate/core';
import { TUI_COUNTRIES, TuiAvatar, TuiSkeleton } from '@taiga-ui/kit';
import { TuiButton, TuiFallbackSrcPipe, TuiHint } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';

import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import {
  SupabaseService,
  GlobalData,
  FollowsService,
  UserProfilesService,
} from '../services';
import {
  RoutesTableComponent,
  RouteItem,
  AscentsTableComponent,
} from '../components';

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
          <div class="flex flex-row gap-2 items-center justify-between">
            @let name = profile()?.name;
            <div class="text-xl font-semibold break-all">
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
                [tuiHint]="
                  global.isMobile() ? null : ('actions.edit' | translate)
                "
                (click)="openEditDialog()"
              >
                {{ 'actions.edit' | translate }}
              </button>
            } @else if (supabase.authUserId()) {
              @let following = isFollowing();
              <button
                [iconStart]="following ? '@tui.user-minus' : '@tui.user-plus'"
                size="m"
                tuiIconButton
                type="button"
                [appearance]="following ? 'secondary' : 'primary'"
                [tuiHint]="
                  global.isMobile()
                    ? null
                    : ((following ? 'actions.unfollow' : 'actions.follow')
                      | translate)
                "
                (click)="toggleFollow()"
              >
                {{
                  (following ? 'actions.unfollow' : 'actions.follow')
                    | translate
                }}
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
  protected readonly supabase = inject(SupabaseService);
  private readonly followsService = inject(FollowsService);
  private readonly userProfilesService = inject(UserProfilesService);
  protected readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly countriesNames$ = inject(TUI_COUNTRIES);

  // Route param (optional)
  id = input<string | undefined>();

  constructor() {
    effect(() => {
      // Reset breadcrumbs when navigating to the profile page
      const profileId = this.profile()?.id;
      this.id(); // Track the id signal
      this.global.resetDataByPage('home');
      this.global.profileUserId.set(profileId ?? null);
    });
  }

  // Currently viewed profile (if by id)
  private readonly externalProfileResource = resource({
    params: () => this.id(),
    loader: async ({ params: paramId }) => {
      if (!paramId || !isPlatformBrowser(this.platformId)) return null;

      // If param is the same as the current user id, we use our own profile (computed below)
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

  readonly isFollowingResource = resource({
    params: () => ({
      userId: this.supabase.authUserId(),
      followedUserId: this.profile()?.id,
    }),
    loader: async ({ params }) => {
      if (
        !params.userId ||
        !params.followedUserId ||
        params.userId === params.followedUserId ||
        !isPlatformBrowser(this.platformId)
      ) {
        return false;
      }
      return this.followsService.isFollowing(params.followedUserId);
    },
  });

  readonly isFollowing = computed(() => !!this.isFollowingResource.value());
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

  readonly projectsResource = this.global.userProjectsResource;

  readonly ascentsResource = this.global.userAscentsResource;

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
    // If its own profile, and we are toggling off a project, remove from a list
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
    this.projectsResource.reload();
  }

  openEditDialog(): void {
    if (!this.isOwnProfile()) return;
    this.userProfilesService.openUserProfileConfigForm();
  }

  async toggleFollow(): Promise<void> {
    const followedUserId = this.profile()?.id;
    if (!followedUserId || this.isOwnProfile()) return;

    if (this.isFollowing()) {
      const success = await this.followsService.unfollow(followedUserId);
      if (success) {
        this.isFollowingResource.update(() => false);
      }
    } else {
      const success = await this.followsService.follow(followedUserId);
      if (success) {
        this.isFollowingResource.update(() => true);
      }
    }
  }
}

export default UserProfileComponent;
