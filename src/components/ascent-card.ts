import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  resource,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { TuiItem } from '@taiga-ui/cdk';
import { TuiAppearance, TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadge,
  TuiCarousel,
  TuiConfirmData,
  TuiPagination,
  TuiRating,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { CLIMBING_ICONS, RouteAscentWithExtras } from '../models';

import {
  AscentsService,
  FollowsService,
  GlobalData,
  SupabaseService,
} from '../services';

import { AscentCommentsComponent } from './ascent-comments';
import { AscentLikesComponent } from './ascent-likes';
import { AvatarGradeComponent } from './avatar-grade';
import { AscentTypeComponent } from './ascent-type';
import { AscentLastCommentComponent } from './ascent-last-comment';
import { getEmbedUrl } from '../utils/video-helpers';
import { PhotoViewerDialogComponent } from '../dialogs/photo-viewer-dialog';

@Component({
  selector: 'app-ascent-card',
  imports: [
    AscentCommentsComponent,
    AscentLastCommentComponent,
    AscentLikesComponent,
    AscentTypeComponent,
    AvatarGradeComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiCarousel,
    TuiHeader,
    TuiIcon,
    TuiItem,
    TuiPagination,
    TuiRating,
  ],
  template: `
    @let ascent = data();
    <div
      [tuiAppearance]="ascent.is_duplicate ? 'negative' : 'flat-grayscale'"
      class="flex flex-col gap-4 p-4 sm:rounded-3xl rounded-none relative no-underline text-inherit hover:no-underline -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full text-left"
    >
      <header tuiHeader class="flex justify-between items-center">
        @if (showUser()) {
          <a
            [routerLink]="['/profile', ascent.user_id]"
            class="flex items-center gap-3 no-underline text-inherit cursor-pointer group/user"
          >
            <tui-avatar
              [src]="
                supabase.buildAvatarUrl(ascent.user?.avatar) || '@tui.user'
              "
              size="s"
            />
            <div class="flex flex-col">
              <span class="font-bold text-sm group-hover/user:underline">
                {{ ascent.user?.name || 'User' }}
              </span>
              <span class="text-xs">
                {{
                  ascent.date
                    | date: 'longDate' : undefined : global.selectedLanguage()
                }}
              </span>
            </div>
          </a>

          @if (ascent.user_id !== supabase.authUserId()) {
            @if (isFollowed()) {
              <button
                tuiButton
                size="s"
                appearance="secondary-grayscale"
                class="!rounded-full"
                (click)="unfollow(ascent.user_id, ascent.user?.name || 'User')"
              >
                {{ 'actions.following' | translate }}
              </button>
            } @else {
              <button
                tuiButton
                size="s"
                appearance="action"
                class="!rounded-full"
                (click)="follow(ascent.user_id)"
              >
                {{ 'actions.follow' | translate }}
              </button>
            }
          } @else {
            <div class="flex flex-col items-end gap-1">
              <button
                tuiButton
                size="s"
                appearance="secondary-grayscale"
                class="!rounded-full"
                (click)="editAscent()"
              >
                {{ 'actions.edit' | translate }}
              </button>
              @if (ascent.private_ascent) {
                <tui-badge appearance="neutral" class="text-xs">
                  {{ 'ascent.private' | translate }}
                </tui-badge>
              }
            </div>
          }
        } @else {
          <div class="flex justify-between items-center w-full">
            <div class="flex flex-col">
              <span class="text-xs text-gray-400">
                {{
                  ascent.date
                    | date: 'longDate' : undefined : global.selectedLanguage()
                }}
              </span>
            </div>
            @if (ascent.user_id === supabase.authUserId()) {
              <div class="flex flex-col items-end gap-1">
                <button
                  tuiButton
                  size="s"
                  appearance="secondary-grayscale"
                  class="!rounded-full"
                  (click)="editAscent()"
                >
                  {{ 'actions.edit' | translate }}
                </button>
                @if (ascent.private_ascent) {
                  <tui-badge appearance="neutral" class="text-xs">
                    {{ 'ascent.private' | translate }}
                  </tui-badge>
                }
              </div>
            }
          </div>
        }
      </header>

      @if (mediaItems(); as items) {
        @if (items.length > 1) {
          <div class="relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full">
            <tui-carousel
              [style.--tui-carousel-height]="'auto'"
              [(index)]="index"
              class="w-full"
            >
              @for (item of items; track $index) {
                <ng-container *tuiItem>
                  <div
                    class="w-full overflow-hidden flex items-center justify-center bg-black rounded-none sm:rounded-2xl relative"
                    [ngClass]="{
                      'aspect-video': item.type === 'video',
                    }"
                  >
                    @if (item.type === 'image') {
                      <img
                        [src]="item.url"
                        class="w-full h-auto object-contain cursor-pointer"
                        [alt]="ascent.route?.name || 'Ascent photo'"
                        [attr.loading]="priority() ? 'eager' : 'lazy'"
                        (click)="showEnlargedPhoto(item.url)"
                        (keydown.enter)="showEnlargedPhoto(item.url)"
                        (keydown.space)="showEnlargedPhoto(item.url)"
                        tabindex="0"
                        role="button"
                      />
                    } @else {
                      <iframe
                        [src]="item.url"
                        class="w-full h-full"
                        frameborder="0"
                        allowfullscreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      ></iframe>
                    }
                  </div>
                </ng-container>
              }
            </tui-carousel>
            <div class="px-4 sm:px-0">
              <tui-pagination
                size="s"
                class="mt-2"
                [length]="items.length"
                [(index)]="index"
              />
            </div>
          </div>
        } @else if (items.length === 1) {
          @let item = items[0];
          <div
            class="overflow-hidden flex items-center justify-center bg-black -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full rounded-none sm:rounded-2xl relative"
            [ngClass]="{
              'aspect-video': item.type === 'video',
            }"
          >
            @if (item.type === 'image') {
              <img
                [src]="item.url"
                class="w-full h-auto object-contain cursor-pointer"
                [alt]="ascent.route?.name || 'Ascent photo'"
                [attr.loading]="priority() ? 'eager' : 'lazy'"
                (click)="showEnlargedPhoto(item.url)"
                (keydown.enter)="showEnlargedPhoto(item.url)"
                (keydown.space)="showEnlargedPhoto(item.url)"
                tabindex="0"
                role="button"
              />
            } @else {
              <iframe
                [src]="item.url"
                class="w-full h-full"
                frameborder="0"
                allowfullscreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              ></iframe>
            }
          </div>
        }
      }

      <div class="flex flex-col gap-1">
        <div class="flex flex-col gap-1">
          @if (ascent.route && showRoute()) {
            <div class="flex flex-wrap items-center gap-2">
              @if (ascent.route.climbing_kind; as kind) {
                <tui-icon [icon]="climbingIcons[kind] || '@tui.mountain'" />
              }
              <a
                class="font-bold text-lg hover:underline cursor-pointer"
                [routerLink]="[
                  '/area',
                  ascent.route.area_slug,
                  ascent.route.crag_slug,
                  ascent.route.slug,
                ]"
              >
                {{ ascent.route.name }}
              </a>
              @if (ascent.route && showRoute()) {
                <span>•</span>
                <a
                  class="hover:underline cursor-pointer flex items-center gap-1"
                  [routerLink]="[
                    '/area',
                    ascent.route.area_slug,
                    ascent.route.crag_slug,
                  ]"
                >
                  <span>{{ ascent.route.crag_name }}</span>
                </a>
              }
            </div>
          }
          <div class="flex items-center gap-2 text-sm">
            @if (ascent.grade; as ascentGrade) {
              <app-avatar-grade [grade]="ascentGrade" size="s" />
            }
            @if (ascent.type; as ascentType) {
              <app-ascent-type [type]="ascentType" size="xs" />
            }
            @if (ascent.rate) {
              <tui-rating
                [ngModel]="ascent.rate"
                [max]="5"
                [readOnly]="true"
                class="pointer-events-none"
                [style.font-size.rem]="0.5"
                [attr.aria-label]="'labels.rating' | translate"
              />
            }
          </div>
        </div>
      </div>

      @if (ascent.comment; as ascentComment) {
        <p
          class="text-sm italic border-l-2 border-[var(--tui-border-normal)] pl-3 py-1 self-start"
        >
          "{{ ascentComment }}"
        </p>
      }

      @if (ascent.is_duplicate) {
        <div
          class="flex items-center gap-2 text-xs font-bold text-[var(--tui-text-negative)] uppercase tracking-wider mt-1"
        >
          <tui-icon icon="@tui.triangle-alert" class="!w-4 !h-4" />
          {{ 'ascent.duplicateWarning' | translate }}
        </div>
      }

      <footer class="flex flex-col gap-2 mt-2">
        <div class="flex items-center gap-4">
          <app-ascent-likes [ascentId]="ascent.id" />
          <app-ascent-comments [ascentId]="ascent.id" />
        </div>
        <app-ascent-last-comment [ascentId]="ascent.id" />
      </footer>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly climbingIcons = CLIMBING_ICONS;
  protected readonly supabase = inject(SupabaseService);
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

  protected index = 0;

  protected readonly ascentPhotoResource = resource({
    params: () => this.data().photo_path,
    loader: async ({ params: path }) => {
      if (!path) return null;
      // Optimize for feed: resize to 600px width (suitable for 360px rendered on retina), quality 60
      return this.supabase.getAscentSignedUrl(path, {
        transform: { width: 600, quality: 60 },
      });
    },
  });
  protected readonly ascentPhotoUrl = computed(() =>
    this.ascentPhotoResource.value(),
  );

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

  editAscent() {
    this.ascentsService.openAscentForm({ ascentData: this.data() }).subscribe();
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

    void this.dialogs
      .open(new PolymorpheusComponent(PhotoViewerDialogComponent), {
        data: { imageUrl: fullUrl },
        size: 'l',
        appearance: 'flat',
      })
      .subscribe();
  }

  async follow(userId: string) {
    const success = await this.followsService.follow(userId);
    if (success) {
      this.followEvent.emit(userId);
    }
  }

  async unfollow(userId: string, name: string) {
    const data: TuiConfirmData = {
      content: this.translate.instant('actions.unfollowConfirm', {
        name,
      }),
      yes: this.translate.instant('actions.unfollow'),
      no: this.translate.instant('actions.cancel'),
      appearance: 'negative',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('actions.unfollow'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      const success = await this.followsService.unfollow(userId);
      if (success) {
        this.unfollowEvent.emit(userId);
      }
    }
  }
}
