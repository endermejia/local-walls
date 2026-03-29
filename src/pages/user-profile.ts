import { AsyncPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
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
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiFallbackSrcPipe,
  TuiLink,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import {
  TUI_COUNTRIES,
  TuiAvatar,
  TuiBadgedContent,
  TuiConfirmData,
  TuiDataListWrapper,
  TuiSelect,
  TuiSkeleton,
  TuiTabs,
  TuiPulse,
} from '@taiga-ui/kit';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { BlockingService } from '../services/blocking.service';
import { FollowsService } from '../services/follows.service';
import { GlobalData } from '../services/global-data';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';
import { TourService } from '../services/tour.service';
import { TourStep } from '../services/tour.service';
import { UserProfilesService } from '../services/user-profiles.service';

import { EmptyStateComponent } from '../components/empty-state';
import { TourHintComponent } from '../components/tour-hint';

import { ChatDialogComponent } from '../dialogs/chat-dialog';
import { PhotoViewerDialogComponent } from '../dialogs/photo-viewer-dialog';
import { UserListDialogComponent } from '../dialogs/user-list-dialog';
import { UserProfileAscentsComponent } from '../components/user-profile/user-profile-ascents.component';
import { UserProfileProjectsComponent } from '../components/user-profile/user-profile-projects.component';
import { UserProfileStatisticsComponent } from '../components/user-profile/user-profile-statistics.component';
import { UserProfileLikesComponent } from '../components/user-profile/user-profile-likes.component';

@Component({
  selector: 'app-user-profile',
  imports: [
    AsyncPipe,
    EmptyStateComponent,
    LowerCasePipe,
    ReactiveFormsModule,
    TourHintComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiButton,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdown,
    TuiFallbackSrcPipe,
    TuiLink,
    TuiScrollbar,
    TuiSelect,
    TuiSkeleton,
    TuiSwipe,
    TuiTabs,
    TuiTextfield,
    TuiPulse,
    UserProfileAscentsComponent,
    UserProfileProjectsComponent,
    UserProfileStatisticsComponent,
    UserProfileLikesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tui-scrollbar class="flex grow">
      <section
        (tuiSwipe)="onSwipe($event)"
        (touchstart.zoneless)="lastTouchTarget = $event.target"
        class="w-full max-w-5xl mx-auto p-4 grid gap-4"
      >
        @let loading = !profile();
        <div class="flex items-center gap-4">
          @if (
            tourService.isActive() && tourService.step() === TourStep.PROFILE
          ) {
            <tui-pulse />
          }
          @let avatar = profileAvatarSrc();
          <tui-avatar
            [src]="avatar | tuiFallbackSrc: '@tui.user' | async"
            [tuiSkeleton]="loading"
            size="xxl"
            class="cursor-pointer transition-transform hover:scale-105 active:scale-95"
            (click)="showEnlargedPhoto()"
          />
          <div class="grow">
            <div class="flex flex-row gap-2 items-center">
              @let name = profile()?.name;
              <div class="text-xl font-semibold wrap-anywhere">
                <span [tuiSkeleton]="loading ? 'name lastName' : false">
                  {{ name }}
                </span>
              </div>
              @if (isOwnProfile()) {
                <button
                  iconStart="@tui.settings"
                  size="m"
                  tuiIconButton
                  type="button"
                  appearance="action-grayscale"
                  (click)="openEditDialog()"
                >
                  {{ 'edit' | translate }}
                </button>
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
                  size="m"
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
                      new
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
                      new
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

            <div class="flex items-center gap-x-2 flex-wrap">
              @let country = profileCountry();
              @let city = profile()?.city;
              <span
                class="flex items-center gap-2"
                [tuiSkeleton]="loading ? 'country, city' : false"
              >
                {{ countriesNames()?.[country] }}{{ city ? ', ' + city : '' }}
              </span>
              @if (profileAge(); as age) {
                |
                <span>
                  {{ age }}
                  {{ 'years' | translate | lowercase }}
                </span>
              }

              @if (profile()?.starting_climbing_year; as year) {
                <span class="opacity-70">
                  (
                  {{ 'startingClimbingYear' | translate | lowercase }}
                  {{ year }}
                  )
                </span>
              }
            </div>
            <div class="opacity-70">
              @let bio = profile()?.bio;
              <span
                class="wrap-anywhere"
                [tuiSkeleton]="
                  loading
                    ? 'This text serves as the content behind the skeleton and adjusts the width.'
                    : false
                "
              >
                {{ bio }}
              </span>
            </div>

            <div class="flex gap-4 mt-2">
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
            </div>
          </div>
        </div>

        @if (!isOwnProfile()) {
          <div class="flex gap-2">
            @let following = isFollowing();
            <button
              tuiButton
              type="button"
              appearance="secondary"
              size="m"
              [iconStart]="following ? '@tui.bell-filled' : '@tui.bell'"
              [tuiSkeleton]="loading || followLoading()"
              (click)="toggleFollow()"
            >
              {{ (following ? 'followingStatus' : 'follow') | translate }}
            </button>

            <button
              tuiButton
              type="button"
              appearance="secondary"
              size="m"
              iconStart="@tui.messages-square"
              [tuiSkeleton]="loading"
              (click)="openChat()"
            >
              {{ 'sendMessage' | translate }}
            </button>
          </div>
        }

        @if (isOwnProfile() || !profile()?.private) {
          <tui-tabs
            [activeItemIndex]="activeTab()"
            (activeItemIndexChange)="activeTab.set($event)"
            class="w-full mt-6"
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
            <button tuiTab class="relative">
              @if (
                tourService.isActive() &&
                tourService.step() === TourStep.PROFILE
              ) {
                <tui-pulse />
              }
              {{ 'ascents' | translate }}
            </button>
            <button tuiTab class="relative">
              @if (
                tourService.isActive() &&
                tourService.step() === TourStep.PROFILE_PROJECTS
              ) {
                <tui-pulse />
              }
              {{ 'projects' | translate }}
            </button>
            <button tuiTab class="relative">
              @if (
                tourService.isActive() &&
                tourService.step() === TourStep.PROFILE_STATISTICS
              ) {
                <tui-pulse />
              }
              {{ 'statistics' | translate }}
            </button>
            @if (isOwnProfile()) {
              <button tuiTab class="relative">
                @if (
                  tourService.isActive() &&
                  tourService.step() === TourStep.PROFILE_LIKES
                ) {
                  <tui-pulse />
                }
                {{ 'likes' | translate }}
              </button>
            }
          </tui-tabs>

          @switch (activeTab()) {
            @case (0) {
              <app-user-profile-ascents
                [userId]="profile()?.id || id() || ''"
                [isOwnProfile]="isOwnProfile()"
                [profile]="profile()"
              />
            }

            @case (1) {
              <app-user-profile-projects
                [userId]="profile()?.id || id() || ''"
                [startingYear]="profile()?.starting_climbing_year"
              />
            }

            @case (2) {
              <app-user-profile-statistics
                [userId]="id() || supabase.authUserId() || ''"
              />
            }
            @case (3) {
              <app-user-profile-likes [userId]="profile()?.id || id() || ''" />
            }
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
  private readonly countriesNames$ = inject(TUI_COUNTRIES);
  protected readonly countriesNames = toSignal(this.countriesNames$);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  protected readonly followsService = inject(FollowsService);
  private readonly blockingService = inject(BlockingService);
  private readonly toast = inject(ToastService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly dialogs = inject(TuiDialogService);

  // Route param (optional)
  id = input<string | undefined>();

  protected dropdownOpen = signal(false);
  protected readonly followLoading = signal(false);
  protected lastTouchTarget: EventTarget | null = null;
  protected readonly activeTab = this.global.profileActiveTab;
  protected readonly followedIds = signal<Set<string>>(new Set());

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
    effect(
      () => {
        const isLoading = this.loading();
        this.global.isNavLoading.set(isLoading);
      },
      { allowSignalWrites: true },
    );

    destroyRef.onDestroy(() => {
      this.global.isNavLoading.set(false);
    });

    // Handle tour steps and tab switches
    effect(() => {
      if (!this.tourService.isActive()) return;

      const step = this.tourService.step();
      if (step === TourStep.PROFILE) {
        this.activeTab.set(0);
      } else if (step === TourStep.PROFILE_PROJECTS) {
        this.activeTab.set(1);
      } else if (step === TourStep.PROFILE_STATISTICS) {
        this.activeTab.set(2);
      } else if (step === TourStep.PROFILE_LIKES) {
        if (this.isOwnProfile()) {
          this.activeTab.set(3);
        } else {
          this.activeTab.set(2); // If not own profile, stay on stats
        }
      }
    });

    // Guard for activeTab index when switching between own profile and others
    effect(() => {
      const isOwn = this.isOwnProfile();
      if (!isOwn && this.activeTab() > 2) {
        this.activeTab.set(0);
      }
    });

    // Track viewed user id for breadcrumbs and global state
    effect(() => {
      const profileId = this.profile()?.id;
      this.id(); // Track the id signal to trigger on param change

      if (profileId && profileId !== this.global.profileUserId()) {
        this.global.resetDataByPage('home');
        this.global.profileUserId.set(profileId);
      }
    });

    // Fetch followed IDs for the current user
    effect(() => {
      this.followsService.followChange();
      if (isPlatformBrowser(this.platformId)) {
        void this.followsService
          .getFollowedIds()
          .then((ids) => this.followedIds.set(new Set(ids)));
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
    const maxIndex = this.isOwnProfile() ? 3 : 2;
    if (direction === 'left' && currentIndex < maxIndex) {
      this.activeTab.set(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      this.activeTab.set(currentIndex - 1);
    }
  }

  protected openEditDialog(): void {
    if (!this.isOwnProfile()) return;
    this.userProfilesService.openUserProfileConfigForm();
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
      } else {
        await this.followsService.follow(followedUserId);
        this.onFollow(followedUserId);
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
