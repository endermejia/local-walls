import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  PLATFORM_ID,
  resource,
  signal,
  untracked,
} from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import { TuiDialogService } from '@taiga-ui/core';
import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import { TuiConfirmData, TuiTabs, TuiPulse, TuiSkeleton } from '@taiga-ui/kit';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { BlockingService } from '../../services/blocking.service';
import { FollowRequestsService } from '../../services/follow-requests.service';
import { FollowsService } from '../../services/follows.service';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { TourService } from '../../services/tour.service';
import { TourStep } from '../../services/tour.service';

import { ChatDialogComponent } from '../../components/dialogs/chat-dialog';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { MenuOptionsButtonComponent } from '../../components/ui/menu-options-button';
import { PhotoViewerDialogComponent } from '../../components/dialogs/photo-viewer-dialog';
import { TourHintComponent } from '../../components/ui/tour-hint';
import { UserListDialogComponent } from '../../components/dialogs/user-list-dialog';
import { UserProfileAscentsComponent } from '../../components/user-profile/user-profile-ascents';
import { UserProfileLikesComponent } from '../../components/user-profile/user-profile-likes';
import { UserProfileProjectsComponent } from '../../components/user-profile/user-profile-projects';
import { UserProfileStatisticsComponent } from '../../components/user-profile/user-profile-statistics';
import { UserInfoComponent } from '../../components/ui/user-info';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    EmptyStateComponent,
    LowerCasePipe,
    MenuOptionsButtonComponent,
    ReactiveFormsModule,
    RouterLink,
    TourHintComponent,
    TranslatePipe,
    TuiAppearance,
    TuiButton,
    TuiDataList,
    TuiDropdown,
    TuiLink,
    TuiPulse,
    TuiScrollbar,
    TuiScrollbar,
    TuiSkeleton,
    TuiSwipe,
    TuiTabs,
    UserProfileAscentsComponent,
    UserProfileLikesComponent,
    UserProfileProjectsComponent,
    UserProfileStatisticsComponent,
    UserInfoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tui-scrollbar class="flex grow">
      <section
        (tuiSwipe)="onSwipe($event)"
        (touchstart.zoneless)="lastTouchTarget = $event.target"
        class="w-full max-w-7xl mx-auto p-4 grid gap-4"
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
          [hasActions]="!isOwnProfile()"
          (avatarClick)="showEnlargedPhoto()"
        >
          @if (
            tourService.isActive() && tourService.step() === TourStep.PROFILE
          ) {
            <tui-pulse badge />
          }

          @if (isOwnProfile()) {
            <app-menu-options-button
              appearance="action-grayscale"
              direction="bottom"
              size="s"
              [iconOnly]="true"
              nameActions
            />
          } @else {
            @let blockMessages = blockState().blockMessages;
            @let blockAscents = blockState().blockAscents;
            <ng-container>
              <ng-container nameActions>
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
              </ng-container>
            </ng-container>
          }

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

          <div class="flex gap-2" actions>
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
                appearance="secondary"
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
          </div>
        </app-user-info>

        @if (isOwnProfile() || !profile()?.private || isFollowing()) {
          @if (visibleTabs().length > 0) {
            <tui-tabs
              [activeItemIndex]="activeTab()"
              (activeItemIndexChange)="activeTab.set($event)"
              class="w-full"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() &&
                (tourService.step() === TourStep.PROFILE ||
                  tourService.step() === TourStep.PROFILE_PROJECTS ||
                  tourService.step() === TourStep.PROFILE_STATISTICS ||
                  tourService.step() === TourStep.PROFILE_LIKES)
              "
              tuiDropdownDirection="top"
            >
              @for (tab of visibleTabs(); track tab) {
                <button tuiTab class="relative">
                  @if (tabPulseStates()[tab]) {
                    <tui-pulse />
                  }
                  {{ tab | translate }}
                </button>
              }
            </tui-tabs>

            @switch (visibleTabs()[activeTab()]) {
              @case ('ascents') {
                <app-user-profile-ascents
                  [userId]="profile()?.id || id() || ''"
                  [isOwnProfile]="isOwnProfile()"
                  [profile]="profile()"
                />
              }

              @case ('projects') {
                <app-user-profile-projects
                  [userId]="profile()?.id || id() || ''"
                  [startingYear]="profile()?.starting_climbing_year"
                />
              }

              @case ('statistics') {
                <app-user-profile-statistics
                  [userId]="id() || supabase.authUserId() || ''"
                />
              }
              @case ('likes') {
                <app-user-profile-likes
                  [userId]="profile()?.id || id() || ''"
                />
              }
            }
          } @else {
            <div class="mt-8 flex flex-col items-center gap-3">
              <app-empty-state icon="@tui.list" />
            </div>
          }
        } @else {
          <div class="mt-8">
            <app-empty-state icon="@tui.lock" message="privateProfile" />
          </div>
        }
      </section>
    </tui-scrollbar>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="
          (tourService.step() === TourStep.PROFILE
            ? 'tour.profile.ascentsDescription'
            : tourService.step() === TourStep.PROFILE_PROJECTS
              ? 'tour.profile.projectsDescription'
              : tourService.step() === TourStep.PROFILE_STATISTICS
                ? 'tour.profile.statisticsDescription'
                : 'tour.profile.likesDescription'
          ) | translate
        "
        [isLast]="tourService.step() === TourStep.PROFILE_LIKES"
        (next)="tourService.next()"
        (skip)="tourService.finish()"
      />
    </ng-template>
  `,
  host: { class: 'flex grow min-h-0' },
})
export class UserProfileComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  private readonly platformId = inject(PLATFORM_ID);
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
  protected lastTouchTarget: EventTarget | null = null;
  protected readonly activeTab = this.global.profileActiveTab;
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

  readonly equipperResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return null;
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
        console.error('[UserProfile] equipper routes count error', countError);
        return { id: equipper.id, routesCount: 0 };
      }

      return { id: equipper.id, routesCount: count ?? 0 };
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
      if (!params.userId || !isPlatformBrowser(this.platformId))
        return { blockMessages: false, blockAscents: false };
      return this.blockingService.getBlockState(params.userId);
    },
  });

  readonly blockState = computed(
    () =>
      this.blockStateResource.value() ?? {
        blockMessages: false,
        blockAscents: false,
      },
  );

  readonly hasProjectsDataResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return false;
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
    },
  });

  readonly hasProjects = computed(() => {
    if (this.isOwnProfile()) return true;
    const value = this.hasProjectsDataResource.value();
    return value === undefined || value !== false;
  });

  readonly hasAscents = computed(() => {
    if (this.isOwnProfile()) return true;
    const count = this.global.userTotalAscentsCountResource.value();
    return count === undefined || count !== 0;
  });

  readonly visibleTabs = computed(() => {
    const tabs = [];
    if (this.hasAscents()) {
      tabs.push('ascents');
    }
    if (this.hasProjects()) {
      tabs.push('projects');
    }
    if (this.hasAscents()) {
      tabs.push('statistics');
    }
    if (this.isOwnProfile()) {
      tabs.push('likes');
    }
    return tabs;
  });

  readonly tabPulseStates = computed(() => {
    const step = this.tourService.step();
    const isActive = this.tourService.isActive();
    return {
      ascents: isActive && step === TourStep.PROFILE,
      projects: isActive && step === TourStep.PROFILE_PROJECTS,
      statistics: isActive && step === TourStep.PROFILE_STATISTICS,
      likes: isActive && step === TourStep.PROFILE_LIKES,
    } as Record<string, boolean>;
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
      if (!userId || !isPlatformBrowser(this.platformId)) return 0;
      return await this.followsService.getFollowersCount(userId);
    },
  });

  protected readonly followingCountResource = resource({
    params: () => ({
      userId: this.profile()?.id,
      change: this.followsService.followChange(),
    }),
    loader: async ({ params }) => {
      const userId = params.userId;
      if (!userId || !isPlatformBrowser(this.platformId)) return 0;
      return await this.followsService.getFollowingCount(userId);
    },
  });

  protected readonly followersCount = computed(
    () => this.followersCountResource.value() ?? 0,
  );
  protected readonly followingCount = computed(
    () => this.followingCountResource.value() ?? 0,
  );

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Update global loading state
    effect(() => {
      const isLoading = this.loading();
      this.global.isNavLoading.set(isLoading);
    });

    destroyRef.onDestroy(() => {
      this.global.isNavLoading.set(false);
    });

    // Handle tour steps and tab switches
    effect(() => {
      if (!this.tourService.isActive()) return;

      const step = this.tourService.step();
      const tabs = untracked(() => this.visibleTabs());
      let targetIndex = -1;
      if (step === TourStep.PROFILE) {
        targetIndex = tabs.indexOf('ascents');
      } else if (step === TourStep.PROFILE_PROJECTS) {
        targetIndex = tabs.indexOf('projects');
      } else if (step === TourStep.PROFILE_STATISTICS) {
        targetIndex = tabs.indexOf('statistics');
      } else if (step === TourStep.PROFILE_LIKES) {
        targetIndex = tabs.indexOf('likes');
      }
      if (targetIndex !== -1) {
        untracked(() => this.activeTab.set(targetIndex));
      }
    });

    // Guard for activeTab index when visibleTabs change
    effect(() => {
      const tabs = this.visibleTabs();
      const currentTab = untracked(() => this.activeTab());
      if (currentTab >= tabs.length) {
        untracked(() => this.activeTab.set(0));
      }
    });

    // Track viewed user id for breadcrumbs and global state
    effect(() => {
      const profileId = this.profile()?.id;
      this.id(); // Track the id signal to trigger on param change

      if (profileId && profileId !== this.global.profileUserId()) {
        this.global.resetDataByPage('profile');
        this.global.profileUserId.set(profileId);
      }
    });

    // Fetch followed IDs for the current user
    effect(() => {
      this.followsService.followChange();
      this.followRequestsService.requestsChange();
      if (isPlatformBrowser(this.platformId)) {
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

  protected onSwipe(event: TuiSwipeEvent): void {
    if (
      this.lastTouchTarget instanceof HTMLElement &&
      (this.lastTouchTarget.closest('app-pyramid') ||
        this.lastTouchTarget.closest('app-routes-table'))
    ) {
      return;
    }

    const direction = event.direction;
    const currentIndex = this.activeTab();
    const maxIndex = this.visibleTabs().length - 1;
    if (direction === 'left' && currentIndex < maxIndex) {
      this.activeTab.set(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      this.activeTab.set(currentIndex - 1);
    }
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

    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        data: { userId },
        label: this.translate.instant('messages'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  protected showEnlargedPhoto(): void {
    const avatar = this.profileAvatarSrc();
    if (!avatar) return;

    void this.dialogs
      .open(new PolymorpheusComponent(PhotoViewerDialogComponent), {
        data: { imageUrl: avatar },
        size: 'l',
        appearance: 'flat',
      })
      .subscribe();
  }
}

export default UserProfileComponent;
