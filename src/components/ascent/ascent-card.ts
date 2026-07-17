import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  resource,
  signal,
} from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadge,
  TuiConfirmData,
  TuiRating,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { TuiAppearance, TuiButton, TuiHint, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { FollowsService } from '../../services/follows.service';
import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';

import { AscentCommentsComponent } from './ascent-comments';
import { AscentLastCommentComponent } from './ascent-last-comment';
import { AscentLikesComponent } from './ascent-likes';
import { AscentTypeComponent } from './ascent-type';
import { CustomCarouselComponent } from '../ui/custom-carousel';
import { GradeComponent } from '../ui/avatar-grade';
import { PhotoViewerDialogComponent } from '../dialogs/photo-viewer-dialog';

import {
  CLIMBING_ICONS,
  ClimbingKind,
  RouteAscentWithExtras,
} from '../../models';

import { AscentDatePipe, AvatarUrlPipe } from '../../pipes';
import { getEmbedUrl } from '../../utils';

@Component({
  selector: 'app-ascent-card',
  imports: [
    AscentCommentsComponent,
    AscentLastCommentComponent,
    AscentLikesComponent,
    AscentTypeComponent,
    AscentDatePipe,
    AvatarUrlPipe,
    CommonModule,
    CustomCarouselComponent,
    FormsModule,
    GradeComponent,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiHeader,
    TuiHint,
    TuiIcon,
    TuiRating,
    TuiSkeleton,
  ],
  template: `
    @let ascent = data();
    <div
      [tuiAppearance]="ascent.is_duplicate ? 'negative' : 'flat-grayscale'"
      class="flex flex-col gap-1 p-4 sm:rounded-3xl rounded-none relative no-underline text-inherit hover:no-underline -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left"
    >
      <header
        tuiHeader
        class="flex flex-wrap justify-between items-center gap-x-2 gap-y-0"
      >
        @if (showUser()) {
          <a
            [routerLink]="['/profile', ascent.user_id]"
            class="flex items-center gap-3 no-underline text-inherit cursor-pointer group/user"
          >
            <span tuiAvatar size="s">
              @if (ascent.user?.avatar; as avatar) {
                <img
                  [src]="avatar | avatarUrl"
                  [alt]="ascent.user.name || ''"
                />
              } @else {
                <tui-icon icon="@tui.user" />
              }
            </span>
            <div class="flex flex-col">
              <span class="font-bold text-sm group-hover/user:underline">
                {{ ascent.user?.name || 'User' }}
              </span>
              <span class="text-xs">
                {{ ascent.date | ascentDate }}
              </span>
            </div>
          </a>

          @if (ascent.user_id !== supabase.authUserId()) {
            @if (isFollowed()) {
              <button
                tuiButton
                size="s"
                appearance="secondary-grayscale"
                class="rounded-full!"
                [disabled]="loading()"
                [iconStart]="loading() ? '@tui.loader' : ''"
                (click)="unfollow(ascent.user_id, ascent.user?.name || 'User')"
              >
                {{ 'followingStatus' | translate }}
              </button>
            } @else {
              <button
                tuiButton
                size="s"
                appearance="action"
                class="rounded-full!"
                [disabled]="loading()"
                [iconStart]="loading() ? '@tui.loader' : ''"
                (click)="follow(ascent.user_id)"
              >
                {{ 'follow' | translate }}
              </button>
            }
          } @else {
            <div class="flex flex-col items-end gap-1">
              <button
                tuiButton
                size="s"
                appearance="secondary-grayscale"
                class="rounded-full!"
                (click)="editAscent()"
              >
                {{ 'edit' | translate }}
              </button>
              @if (ascent.private_ascent) {
                <span tuiBadge appearance="accent" class="text-xs">
                  {{ 'private' | translate }}
                </span>
              }
            </div>
          }
        } @else {
          <div class="flex justify-between items-center w-full">
            <div class="flex flex-col">
              <span class="text-xs text-gray-400">
                {{ ascent.date | ascentDate }}
              </span>
            </div>
            @if (ascent.user_id === supabase.authUserId()) {
              <div class="flex flex-col items-end gap-1">
                <button
                  tuiButton
                  size="s"
                  appearance="secondary-grayscale"
                  class="rounded-full!"
                  (click)="editAscent()"
                >
                  {{ 'edit' | translate }}
                </button>
                @if (ascent.private_ascent) {
                  <span tuiBadge appearance="accent" class="text-xs">
                    {{ 'private' | translate }}
                  </span>
                }
              </div>
            }
          </div>
        }
      </header>

      @if (mediaItems(); as items) {
        @if (items.length > 0) {
          <div
            class="relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full bg-(--tui-background-neutral-1) overflow-hidden sm:rounded-2xl"
          >
            <app-custom-carousel
              [items]="items"
              [(index)]="index"
              [clickable]="true"
              [priority]="priority()"
              [loading]="priority() ? 'eager' : 'lazy'"
              (imageClick)="showEnlargedPhoto($event)"
            />
          </div>
        } @else if (ascentPhotoResource.isLoading()) {
          <div
            class="aspect-4/3 bg-(--tui-background-neutral-1) -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full rounded-none sm:rounded-2xl"
            tuiSkeleton
          ></div>
        }
      }

      <div class="flex flex-col gap-1">
        <div class="flex flex-col gap-1">
          @if (ascent.route && showRoute()) {
            <div class="text-lg leading-tight wrap-break-word">
              @if (ascent.route.climbing_kind; as kind) {
                <tui-icon
                  [icon]="climbingIcons[kind] || '@tui.mountain'"
                  [tuiHint]="'climbingKinds.' + kind | translate"
                  class="align-text-bottom mr-1"
                />
              }
              @if (isIndoor()) {
                <a
                  class="font-bold hover:underline cursor-pointer"
                  [routerLink]="[
                    '/indoor',
                    ascent.route.center_slug,
                    'route',
                    ascent.route.slug,
                  ]"
                >
                  {{ ascent.route.name }}
                </a>
                <span class="mx-1.5 opacity-70 text-sm">&bull;</span>
                <span class="text-sm opacity-70">
                  <a
                    class="hover:underline cursor-pointer"
                    [routerLink]="['/indoor', ascent.route.center_slug]"
                  >
                    {{ ascent.route.center_name }}
                  </a>
                </span>
              } @else {
                <a
                  class="font-bold hover:underline cursor-pointer"
                  [routerLink]="[
                    '/area',
                    ascent.route.area_slug,
                    ascent.route.crag_slug,
                    ascent.route.slug,
                  ]"
                >
                  {{ ascent.route.name }}
                </a>
                <span class="mx-1.5 opacity-70 text-sm">•</span>
                <span class="text-sm opacity-70">
                  <a
                    class="hover:underline cursor-pointer"
                    [routerLink]="[
                      '/area',
                      ascent.route.area_slug,
                      ascent.route.crag_slug,
                    ]"
                  >
                    {{ ascent.route.crag_name }}
                  </a>
                  <a
                    class="hover:underline cursor-pointer ml-1"
                    [routerLink]="['/area', ascent.route.area_slug]"
                  >
                    ({{ ascent.route.area_name }})
                  </a>
                </span>
              }
            </div>
          }
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            @if (ascent.grade) {
              <app-grade
                [grade]="ascent.grade"
                [kind]="ascent.route?.climbing_kind"
              />
            }
            @if (ascent.soft) {
              <span tuiBadge size="s" appearance="neutral">
                {{ 'ascent.soft' | translate }}
              </span>
            }
            @if (ascent.hard) {
              <span tuiBadge size="s" appearance="neutral">
                {{ 'ascent.hard' | translate }}
              </span>
            }
            @if (ascent.type; as ascentType) {
              <app-ascent-type
                [type]="ascentType"
                [attempts]="ascent.attempts"
              />
            }
            @if (ascent.rate) {
              <div [tuiHint]="ascent.rate">
                <tui-rating
                  [ngModel]="ascent.rate"
                  [max]="5"
                  [readOnly]="true"
                  class="pointer-events-none"
                  [style.font-size.rem]="1"
                  [attr.aria-label]="'rating' | translate"
                />
              </div>
            }
            @if (ascent.recommended) {
              <tui-icon
                icon="@tui.thumbs-up"
                class="w-4! h-4! text-(--tui-text-action)"
                [tuiHint]="'ascent.recommend' | translate"
              />
            }
          </div>
        </div>
      </div>

      @if (ascent.comment; as ascentComment) {
        <p
          class="text-sm italic border-l-2 border-(--tui-border-normal) pl-3 py-1 self-start"
        >
          "{{ ascentComment }}"
        </p>
      }

      @if (moreInfoBadges().length > 0) {
        <div class="flex flex-wrap gap-x-1 gap-y-1">
          @for (badge of moreInfoBadges(); track badge.key) {
            <span tuiBadge size="s" appearance="neutral">
              {{ badge.label | translate }}
            </span>
          }
        </div>
      }

      @if (ascent.is_duplicate) {
        <div
          class="flex items-center gap-2 text-xs font-bold text-(--tui-text-negative) uppercase tracking-wider mt-1"
        >
          <tui-icon icon="@tui.triangle-alert" class="w-4! h-4!" />
          {{ 'ascent.duplicateWarning' | translate }}
        </div>
      }

      @if (!isIndoor()) {
        <footer class="flex flex-col gap-1 mt-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <app-ascent-likes
              [ascentId]="ascent.id"
              [isPrivate]="!!ascent.private_ascent"
            />
            <app-ascent-comments
              [ascentId]="ascent.id"
              [isPrivate]="!!ascent.private_ascent"
            />
          </div>
          <app-ascent-last-comment [ascentId]="ascent.id" />
        </footer>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly climbingIcons = CLIMBING_ICONS;
  protected readonly supabase = inject(SupabaseService);

  protected readonly isIndoor = computed(() => {
    const r = this.data().route;
    return !!(
      r &&
      'center_slug' in r &&
      (r as { center_slug?: string }).center_slug
    );
  });
  protected readonly router = inject(Router);
  protected readonly sanitizer = inject(DomSanitizer);
  private readonly ascentsService = inject(AscentsService);
  private readonly followsService = inject(FollowsService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  data = input.required<RouteAscentWithExtras>();
  showUser = input(true);
  showRoute = input(true);
  isFollowed = input(false);
  priority = input(false);

  followEvent = output<string>();
  unfollowEvent = output<string>();

  protected readonly loading = signal(false);

  protected onNext(): void {
    this.index.update((i) => (i + 1) % this.mediaItems().length);
  }

  protected onPrev(): void {
    this.index.update(
      (i) => (i - 1 + this.mediaItems().length) % this.mediaItems().length,
    );
  }

  protected readonly index = signal(0);

  protected readonly ascentPhotoResource = resource({
    params: () => this.data().photo_path,
    loader: async ({ params: path }) => {
      if (!path) return null;
      await this.supabase.whenReady();
      // Use same transform as topos for stability, resize to 1200px (retina friendly), quality 70
      return this.supabase.getAscentSignedUrl(path);
    },
  });
  protected readonly ascentPhotoUrl = computed(() =>
    this.ascentPhotoResource.value(),
  );

  private static readonly MORE_INFO_FIELDS: {
    key: keyof RouteAscentWithExtras;
    label: string;
  }[] = [
    { key: 'cruxy', label: 'ascent.climbing.cruxy' },
    { key: 'athletic', label: 'ascent.climbing.athletic' },
    { key: 'sloper', label: 'ascent.climbing.sloper' },
    { key: 'endurance', label: 'ascent.climbing.endurance' },
    { key: 'technical', label: 'ascent.climbing.technical' },
    { key: 'crimpy', label: 'ascent.climbing.crimpy' },
    { key: 'slab', label: 'ascent.steepness.slab' },
    { key: 'vertical', label: 'ascent.steepness.vertical' },
    { key: 'overhang', label: 'ascent.steepness.overhang' },
    { key: 'roof', label: 'ascent.steepness.roof' },
    { key: 'bad_anchor', label: 'ascent.safety.bad_anchor' },
    { key: 'bad_bolts', label: 'ascent.safety.bad_bolts' },
    { key: 'high_first_bolt', label: 'ascent.safety.high_first_bolt' },
    { key: 'lose_rock', label: 'ascent.safety.lose_rock' },
    {
      key: 'bad_clipping_position',
      label: 'ascent.safety.bad_clipping_position',
    },
    { key: 'chipped', label: 'ascent.other.chipped' },
    { key: 'with_kneepad', label: 'ascent.other.with_kneepad' },
    { key: 'first_ascent', label: 'ascent.other.first_ascent' },
    { key: 'traditional', label: 'ascent.other.traditional' },
    { key: 'sit_start', label: 'ascent.boulder.sit_start' },
    { key: 'top_out', label: 'ascent.boulder.top_out' },
    { key: 'highball', label: 'ascent.boulder.highball' },
  ];

  protected readonly activeMedia = computed(() => {
    const items = this.mediaItems();
    const idx = this.index();
    return items.length > 0 ? items[idx] : null;
  });

  protected readonly moreInfoBadges = computed(() => {
    const a = this.data();
    return AscentCardComponent.MORE_INFO_FIELDS.filter((f) => !!a[f.key]);
  });

  protected readonly mediaItems = computed(() => {
    const items: {
      type: 'image' | 'video';
      url: string | SafeResourceUrl;
    }[] = [];
    const photo = this.ascentPhotoUrl();
    if (photo) {
      items.push({ type: 'image', url: photo });
    }
    const video = this.data().video_url;
    if (video) {
      const embed = getEmbedUrl(video);
      if (embed) {
        items.push({
          type: 'video',
          url: this.sanitizer.bypassSecurityTrustResourceUrl(embed),
        });
      }
    }
    return items;
  });

  async editAscent() {
    await firstValueFrom(
      this.ascentsService.openAscentForm({
        ascentData: this.data(),
        isIndoor: this.isIndoor(),
        routeId: this.data().route_id as number | string,
        routeName: this.data().route?.name,
        climbingKind: this.data().route?.climbing_kind as ClimbingKind,
        grade: this.data().route?.grade || undefined,
      }),
      { defaultValue: false },
    );
  }

  async showEnlargedPhoto(url: string | SafeResourceUrl): Promise<void> {
    if (typeof url !== 'string') return;

    let fullUrl = url;
    const path = this.data().photo_path;

    // effective URL for viewing might be different (full res)
    if (path) {
      // Fetch full resolution URL
      const signed = await this.supabase.getAscentSignedUrl(path);
      if (signed) {
        fullUrl = signed;
      }
    }

    await firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(PhotoViewerDialogComponent), {
        data: { imageUrl: fullUrl },
        size: 'l',
        appearance: 'flat',
      }),
      { defaultValue: undefined },
    );
  }

  async follow(userId: string) {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      const success = await this.followsService.follow(userId);
      if (success) {
        this.followEvent.emit(userId);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async unfollow(userId: string, name: string) {
    if (this.loading()) return;
    const data: TuiConfirmData = {
      content: this.translate.instant('unfollowConfirm', {
        name,
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

    if (confirmed) {
      this.loading.set(true);
      try {
        const success = await this.followsService.unfollow(userId);
        if (success) {
          this.unfollowEvent.emit(userId);
        }
      } finally {
        this.loading.set(false);
      }
    }
  }
}
