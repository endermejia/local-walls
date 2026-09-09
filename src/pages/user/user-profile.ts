import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { TuiConfirmData, TuiSkeleton, TUI_CONFIRM } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { BlockingService } from '../../services/blocking.service';
import { FollowRequestsService } from '../../services/follow-requests.service';
import { FollowsService } from '../../services/follows.service';
import { LayoutService } from '../../services/layout.service';
import { MessagingService } from '../../services/messaging.service';
import { OutdoorDataService } from '../../services/outdoor-data.service';
import { ProfileDataService } from '../../services/profile-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { UserListDialogComponent } from '../../components/dialogs/user-list-dialog';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { MenuOptionsButtonComponent } from '../../components/ui/menu-options-button';
import { UserInfoComponent } from '../../components/ui/user-info';
import { UserProfileAscentsComponent } from '../../components/user-profile/user-profile-ascents';
import { UserProfileStatisticsComponent } from '../../components/user-profile/user-profile-statistics';

import { openPhotoViewer, safeResourceValue } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    EmptyStateComponent,
    LowerCasePipe,
    MenuOptionsButtonComponent,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiLink,
    TuiScrollbar,
    TuiSkeleton,
    UserInfoComponent,
    UserProfileAscentsComponent,
    UserProfileStatisticsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @media (min-width: 1024px) {
      :host > tui-scrollbar {
        overflow: hidden !important;
      }
      :host > tui-scrollbar ::ng-deep > .t-content {
        block-size: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      :host > tui-scrollbar ::ng-deep > tui-scroll-controls {
        display: none !important;
      }
    }
  `,
  template: `
    <tui-scrollbar class="w-full h-full min-h-0 min-w-0">
      <section
        class="w-full max-w-[1600px] mx-auto py-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-6 lg:h-full lg:min-h-0 lg:overflow-hidden pb-6 lg:pb-2"
      >
        <!-- Left Column: User Info + Statistics -->
        <div
          class="flex flex-col gap-6 w-full px-4 lg:px-0 lg:flex-1 min-w-0 lg:h-full lg:overflow-hidden"
        >
          @let loading = !profile();
          <app-user-info
            [loading]="loading"
            [avatar]="profile()?.avatar"
            [name]="profile()?.name"
            [city]="profile()?.city"
            [country]="profileCountry()"
            [age]="profileAge()"
            [startingClimbingYear]="profile()?.starting_climbing_year"
            [bio]="profile()?.bio"
            [avatarClickable]="true"
            [hasActions]="true"
            (avatarClick)="showEnlargedPhoto()"
            class="shrink-0"
          >
            <div nameActions class="inline-flex items-center">
              @if (isOwnProfile()) {
                <app-menu-options-button
                  appearance="action-grayscale"
                  direction="bottom"
                  size="s"
                  [iconOnly]="true"
                />
              } @else {
                @let blockMessages = blockState().blockMessages;
                @let blockAscents = blockState().blockAscents;
                <button
                  [appearance]="
                    blockMessages || blockAscents
                      ? 'negative'
                      : 'action-grayscale'
                  "
                  iconStart="@tui.ellipsis-vertical"
                  size="s"
                  tuiIconButton
                  type="button"
                  [tuiSkeleton]="loading"
                  [tuiDropdown]="dropdownContent"
                  [(tuiDropdownOpen)]="dropdownOpen"
                >
                  {{ 'options' | translate }}
                </button>
                <ng-template #dropdownContent>
                  <tui-data-list>
                    <button
                      tuiOption
                      [tuiAppearance]="blockMessages ? 'negative' : 'neutral'"
                      iconStart="@tui.message-circle-off"
                      (click)="toggleBlockMessages(); dropdownOpen.set(false)"
                    >
                      {{
                        (blockMessages ? 'messagesBlocked' : 'blockMessages')
                          | translate
                      }}
                    </button>
                    <button
                      tuiOption
                      [tuiAppearance]="blockAscents ? 'negative' : 'neutral'"
                      iconStart="@tui.bell-off"
                      (click)="toggleHideAscents(); dropdownOpen.set(false)"
                    >
                      {{
                        (blockAscents ? 'ascentsHidden' : 'hideAscents')
                          | translate
                      }}
                    </button>
                  </tui-data-list>
                </ng-template>
              }
            </div>

            <div class="flex flex-wrap gap-x-4 gap-y-2 mt-2" extraInfo>
              <button
                tuiLink
                type="button"
                [tuiSkeleton]="loading"
                (click)="openFollowsDialog('followers')"
              >
                <strong>{{ followersCount() }}</strong>
                {{ 'followers' | translate | lowercase }}
              </button>
              <button
                tuiLink
                type="button"
                [tuiSkeleton]="loading"
                (click)="openFollowsDialog('following')"
              >
                <strong>{{ followingCount() }}</strong>
                {{ 'following' | translate | lowercase }}
              </button>
              @if (equipperResource.value(); as equipper) {
                <a
                  tuiLink
                  [tuiSkeleton]="loading"
                  [routerLink]="['/equipper', equipper.id]"
                >
                  <strong>{{ equipper.routesCount }}</strong>
                  {{ 'equippedRoutes' | translate | lowercase }}
                </a>
              }
            </div>

            <div class="flex flex-wrap gap-2 min-w-0 max-w-full" actions>
              @if (hasProjects()) {
                <button
                  tuiButton
                  type="button"
                  appearance="secondary"
                  size="s"
                  iconStart="@tui.target"
                  [tuiSkeleton]="loading"
                  (click)="openProjectsDialog()"
                >
                  {{ 'projects' | translate }}
                </button>
              }

              @if (isOwnProfile()) {
                <button
                  tuiButton
                  type="button"
                  appearance="secondary"
                  size="s"
                  iconStart="@tui.heart"
                  [tuiSkeleton]="loading"
                  (click)="openFavoritesDialog()"
                >
                  {{ 'likes' | translate }}
                </button>
              }

              @if (!isOwnProfile()) {
                @let following = isFollowing();
                @let requested = isRequested();
                @let hasIncomingRequest = hasIncomingFollowRequest();
                @let isPrivate = profile()?.private;

                @if (hasIncomingRequest) {
                  <button
                    tuiButton
                    type="button"
                    appearance="primary"
                    size="s"
                    [iconStart]="'@tui.check'"
                    [tuiSkeleton]="loading || followLoading()"
                    (click)="acceptFollowRequest()"
                  >
                    {{ 'allowFollow' | translate }}
                  </button>
                }

                <button
                  tuiButton
                  type="button"
                  [appearance]="
                    following || requested ? 'secondary' : 'primary'
                  "
                  size="s"
                  [iconStart]="
                    following
                      ? '@tui.bell-filled'
                      : requested
                        ? '@tui.clock'
                        : '@tui.bell'
                  "
                  [tuiSkeleton]="loading || followLoading()"
                  (click)="toggleFollow()"
                >
                  {{
                    (following
                      ? 'followingStatus'
                      : requested
                        ? 'requestedStatus'
                        : isPrivate
                          ? 'requestFollow'
                          : 'follow'
                    ) | translate
                  }}
                </button>

                @if (following || !isPrivate) {
                  <button
                    tuiButton
                    type="button"
                    appearance="secondary"
                    size="s"
                    iconStart="@tui.send"
                    [tuiSkeleton]="loading"
                    (click)="openChat()"
                  >
                    {{ 'sendMessage' | translate }}
                  </button>
                }
              }

              @if (hasAscents()) {
                <button
                  tuiButton
                  type="button"
                  appearance="secondary"
                  size="s"
                  iconStart="@tui.calendar"
                  [tuiSkeleton]="loading"
                  (click)="openAscentCalendarDialog()"
                >
                  {{ 'ascentCalendar' | translate }}
                </button>
              }
            </div>
          </app-user-info>

          @if (isOwnProfile() || !profile()?.private || isFollowing()) {
            <!-- Statistics: fills remaining height in left column on desktop -->
            <div
              class="w-full flex-1 min-w-0 min-h-0 flex flex-col lg:overflow-hidden"
            >
              <app-user-profile-statistics
                [userId]="profile()?.id || id() || supabase.authUserId() || ''"
                class="w-full lg:flex-1 min-w-0 lg:min-h-0"
              />
            </div>
          } @else {
            <div class="mt-8">
              <app-empty-state icon="@tui.lock" message="privateProfile" />
            </div>
          }
        </div>

        <!-- Right Column: Ascents (Takes full height from the top in desktop) -->
        @if (isOwnProfile() || !profile()?.private || isFollowing()) {
          <div
            class="w-full lg:w-[420px] xl:w-[460px] 2xl:w-[500px] shrink-0 min-w-0 lg:h-full flex flex-col lg:overflow-hidden"
          >
            <app-user-profile-ascents
              [userId]="profile()?.id || id() || ''"
              [isOwnProfile]="isOwnProfile()"
              [profile]="profile()"
              class="w-full lg:flex-1 min-w-0 lg:min-h-0"
            />
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex flex-col w-full h-full min-h-0' },
})
export class UserProfileComponent {
  protected readonly messagingService = inject(MessagingService);
  protected readonly profileData = inject(ProfileDataService);
  protected readonly outdoorData = inject(OutdoorDataService);
  protected readonly layout = inject(LayoutService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly userProfilesService = inject(UserProfilesService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly translate = inject(TranslateService);
  protected readonly followRequestsService = inject(FollowRequestsService);
  protected readonly followsService = inject(FollowsService);
  private readonly blockingService = inject(BlockingService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);

  // Route param (optional)
  id = input<string | undefined>();

  protected dropdownOpen = signal(false);
  protected readonly followLoading = signal(false);

  protected readonly followedIds = signal<Set<string>>(new Set());
  protected readonly requestedIds = signal<Set<string>>(new Set());
  protected readonly incomingRequestIds = signal<Set<string>>(new Set());

  readonly isRequested = computed(() => {
    const profileId = this.profile()?.id;
    return !!profileId && this.requestedIds().has(profileId);
  });

  readonly hasIncomingFollowRequest = computed(() => {
    const profileId = this.profile()?.id;
    return !!profileId && this.incomingRequestIds().has(profileId);
  });

  // Currently viewed profile (if by id)
  private readonly externalProfileResource = resource({
    params: () => this.id(),
    loader: async ({ params: paramId }) => {
      if (!paramId || !this.isBrowser) return null;

      try {
        await this.supabase.whenReady();
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
      } catch (err) {
        console.error('[UserProfile] fetch by id exception', err);
        return null;
      }
    },
  });

  readonly equipperResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !this.isBrowser) return null;
      try {
        await this.supabase.whenReady();
        const { data: equipper, error } = await this.supabase.client
          .from('equippers')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (error || !equipper) {
          if (error) {
            console.error('[UserProfile] equipperResource error', error);
          }
          return null;
        }

        // Query count of routes from route_equippers
        const { count, error: countError } = await this.supabase.client
          .from('route_equippers')
          .select('*', { count: 'exact', head: true })
          .eq('equipper_id', equipper.id);

        if (countError) {
          console.error(
            '[UserProfile] equipper routes count error',
            countError,
          );
          return { id: equipper.id, routesCount: 0 };
        }

        return { id: equipper.id, routesCount: count ?? 0 };
      } catch (err) {
        console.error('[UserProfile] equipperResource exception', err);
        return null;
      }
    },
  });

  readonly profile = computed(() => {
    const paramId = this.id();
    const ownProfile = this.supabase.userProfile();
    const currentId = this.supabase.authUserId();

    if (!paramId || (currentId && paramId === currentId)) {
      return ownProfile ?? null;
    }

    return safeResourceValue(this.externalProfileResource, null);
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

  readonly isFollowing = computed(() => {
    const profileId = this.profile()?.id;
    return !!profileId && this.followedIds().has(profileId);
  });

  readonly blockStateResource = resource({
    params: () => ({
      userId: this.profile()?.id,
      change: this.blockingService.blockChange(),
    }),
    loader: async ({ params }) => {
      if (!params.userId || !this.isBrowser)
        return { blockMessages: false, blockAscents: false };
      try {
        return await this.blockingService.getBlockState(params.userId);
      } catch {
        return { blockMessages: false, blockAscents: false };
      }
    },
  });

  readonly blockState = computed(() =>
    safeResourceValue(this.blockStateResource, {
      blockMessages: false,
      blockAscents: false,
    }),
  );

  readonly hasProjectsDataResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !this.isBrowser) return false;
      try {
        await this.supabase.whenReady();

        const { count: pyramidCount } = await this.supabase.client
          .from('user_pyramid_slots')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .limit(1);

        if (pyramidCount && pyramidCount > 0) return true;

        const { count: projectCount } = await this.supabase.client
          .from('route_projects')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .limit(1);

        return (projectCount && projectCount > 0) || false;
      } catch {
        return false;
      }
    },
  });

  readonly hasProjects = computed(() => {
    if (this.isOwnProfile()) return true;
    const value = safeResourceValue(this.hasProjectsDataResource, undefined);
    return value === undefined || value !== false;
  });

  readonly hasAscents = computed(() => {
    if (this.isOwnProfile()) return true;
    const count = safeResourceValue(
      this.profileData.userTotalAscentsCountResource,
      undefined,
    );
    return count === undefined || count !== 0;
  });

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

  protected readonly followersCountResource = resource({
    params: () => ({
      userId: this.profile()?.id,
      change: this.followsService.followChange(),
    }),
    loader: async ({ params }) => {
      const userId = params.userId;
      if (!userId || !this.isBrowser) return 0;
      try {
        return await this.followsService.getFollowersCount(userId);
      } catch {
        return 0;
      }
    },
  });

  protected readonly followingCountResource = resource({
    params: () => ({
      userId: this.profile()?.id,
      change: this.followsService.followChange(),
    }),
    loader: async ({ params }) => {
      const userId = params.userId;
      if (!userId || !this.isBrowser) return 0;
      try {
        return await this.followsService.getFollowingCount(userId);
      } catch {
        return 0;
      }
    },
  });

  protected readonly followersCount = computed(() =>
    safeResourceValue(this.followersCountResource, 0),
  );
  protected readonly followingCount = computed(() =>
    safeResourceValue(this.followingCountResource, 0),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Update global loading state
    effect(() => {
      const isLoading = this.loading();
      this.layout.isNavLoading.set(isLoading);
    });

    effect(() => {
      if (!this.isBrowser) return;
      const paramId = this.id();
      if (!paramId) return;
      const loading = this.loading();
      if (loading) return;
      const profile = this.profile();
      if (!profile) {
        this.router.navigateByUrl('/page-not-found');
      }
    });

    destroyRef.onDestroy(() => {
      this.layout.isNavLoading.set(false);
    });

    // Track viewed user id for breadcrumbs and global state
    effect(() => {
      const profileId = this.profile()?.id;
      this.id(); // Track the id signal to trigger on param change

      if (profileId) {
        this.profileData.profileUserId.set(profileId);
        this.profileData.resetPagination();
        this.outdoorData.clearSelection();
      }
    });

    // Fetch followed IDs for the current user
    effect(() => {
      this.followsService.followChange();
      this.followRequestsService.requestsChange();
      if (this.isBrowser) {
        void this.followsService
          .getFollowedIds()
          .then((ids) => this.followedIds.set(new Set(ids)));
        void this.followRequestsService
          .getPendingOutgoingRequestIds()
          .then((ids) => this.requestedIds.set(new Set(ids)));
        void this.followRequestsService
          .getPendingIncomingRequestIds()
          .then((ids) => this.incomingRequestIds.set(new Set(ids)));
      }
    });
  }

  protected openProjectsDialog(): void {
    const userId =
      this.profile()?.id || this.id() || this.supabase.authUserId();
    const startingYear = this.profile()?.starting_climbing_year;
    this.userProfilesService.openProjectsDialog(
      userId || undefined,
      startingYear,
    );
  }

  protected openFavoritesDialog(): void {
    const userId =
      this.profile()?.id || this.id() || this.supabase.authUserId();
    this.userProfilesService.openFavoritesDialog(userId || undefined);
  }

  protected openAscentCalendarDialog(): void {
    const userId =
      this.profile()?.id || this.id() || this.supabase.authUserId();
    this.userProfilesService.openAscentCalendarDialog(
      userId || undefined,
      this.profile(),
    );
  }

  protected async toggleFollow(): Promise<void> {
    const profile = this.profile();
    const followedUserId = profile?.id;
    if (!followedUserId || this.isOwnProfile() || this.followLoading()) return;

    this.followLoading.set(true);

    try {
      if (this.isFollowing()) {
        const data: TuiConfirmData = {
          content: this.translate.instant('unfollowConfirm', {
            name: profile.name,
          }),
          yes: this.translate.instant('unfollow'),
          no: this.translate.instant('cancel'),
          appearance: 'negative',
        };
        const confirmed = await firstValueFrom(
          this.dialogs.open<boolean>(TUI_CONFIRM, {
            label: this.translate.instant('unfollow'),
            size: 's',
            data,
          }),
          { defaultValue: false },
        );
        if (!confirmed) return;
        await this.followsService.unfollow(followedUserId);
        this.onUnfollow(followedUserId);
      } else if (this.isRequested()) {
        await this.followRequestsService.cancelRequest(followedUserId);
        this.onCancelRequest(followedUserId);
      } else if (profile.private) {
        await this.followRequestsService.requestFollow(followedUserId);
        this.onRequestFollow(followedUserId);
      } else {
        await this.followsService.follow(followedUserId);
        this.onFollow(followedUserId);
      }
    } finally {
      this.followLoading.set(false);
    }
  }

  protected onCancelRequest(userId: string): void {
    this.requestedIds.update((s) => {
      const next = new Set(s);
      next.delete(userId);
      return next;
    });
  }

  protected onRequestFollow(userId: string): void {
    this.requestedIds.update((s) => {
      const next = new Set(s);
      next.add(userId);
      return next;
    });
  }

  protected async acceptFollowRequest(): Promise<void> {
    const profile = this.profile();
    const followerId = profile?.id;
    if (!followerId || this.followLoading()) return;

    this.followLoading.set(true);
    try {
      const success =
        await this.followRequestsService.acceptRequestByFollower(followerId);
      if (success) {
        this.incomingRequestIds.update((s) => {
          const next = new Set(s);
          next.delete(followerId);
          return next;
        });
      }
    } finally {
      this.followLoading.set(false);
    }
  }

  protected onFollow(userId: string): void {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.add(userId);
      return next;
    });
  }

  protected onUnfollow(userId: string): void {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.delete(userId);
      return next;
    });
  }

  protected async toggleBlockMessages(): Promise<void> {
    const profile = this.profile();
    const userId = profile?.id;
    if (!userId || this.isOwnProfile()) return;

    const current = this.blockState();
    const isBlocking = !current.blockMessages;

    const data: TuiConfirmData = {
      content: this.translate.instant(
        isBlocking ? 'blockMessagesConfirm' : 'unblockMessagesConfirm',
        { name: profile.name },
      ),
      yes: this.translate.instant(isBlocking ? 'block' : 'unblock'),
      no: this.translate.instant('cancel'),
      appearance: isBlocking ? 'negative' : 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(
          isBlocking ? 'blockMessages' : 'unblockMessages',
        ),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = isBlocking
      ? await this.blockingService.toggleBlockMessages(
          userId,
          current.blockAscents,
        )
      : await this.blockingService.toggleUnblockMessages(
          userId,
          current.blockAscents,
        );

    if (success) {
      this.toast.success(
        isBlocking
          ? 'messages.toasts.messagesBlocked'
          : 'messages.toasts.messagesUnblocked',
      );
    }
  }

  protected async toggleHideAscents(): Promise<void> {
    const profile = this.profile();
    const userId = profile?.id;
    if (!userId || this.isOwnProfile()) return;

    const current = this.blockState();
    const isHiding = !current.blockAscents;

    const data: TuiConfirmData = {
      content: this.translate.instant(
        isHiding ? 'hideAscentsConfirm' : 'showAscentsConfirm',
        { name: profile.name },
      ),
      yes: this.translate.instant(isHiding ? 'hide' : 'showAscents'),
      no: this.translate.instant('cancel'),
      appearance: isHiding ? 'negative' : 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(isHiding ? 'hideAscents' : 'showAscents'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = isHiding
      ? await this.blockingService.toggleBlockAscents(
          userId,
          current.blockMessages,
        )
      : await this.blockingService.toggleUnblockAscents(
          userId,
          current.blockMessages,
        );

    if (success) {
      this.toast.success(
        isHiding
          ? 'messages.toasts.ascentsHidden'
          : 'messages.toasts.ascentsShown',
      );

      // If hiding ascents, we might want to unfollow as well?
      if (isHiding && this.isFollowing()) {
        await this.followsService.unfollow(userId);
        this.onUnfollow(userId);
      }
    }
  }

  protected openFollowsDialog(type: 'followers' | 'following'): void {
    const userId = this.profile()?.id;
    if (!userId) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(UserListDialogComponent),
        {
          data: { userId, type },
          label: this.translate.instant(type),
          size: 'm',
        },
      ),
      { defaultValue: false },
    );
  }

  protected openChat(): void {
    const userId = this.profile()?.id;
    if (!userId) return;

    this.messagingService.openChatDialog({ userId });
  }

  protected showEnlargedPhoto(): void {
    const avatar = this.profileAvatarSrc();
    if (!avatar) return;

    openPhotoViewer(this.dialogs, avatar);
  }
}

export default UserProfileComponent;
