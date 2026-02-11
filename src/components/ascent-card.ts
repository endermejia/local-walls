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

import { TuiAppearance, TuiButton, TuiIcon } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadge,
  TuiConfirmData,
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
import { AvatarAscentTypeComponent } from './avatar-ascent-type';
import { AscentLastCommentComponent } from './ascent-last-comment';

@Component({
  selector: 'app-ascent-card',
  imports: [
    AscentCommentsComponent,
    AscentLastCommentComponent,
    AscentLikesComponent,
    AvatarAscentTypeComponent,
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
    TuiHeader,
    TuiIcon,
    TuiRating,
  ],
  template: `
    @let ascent = data();
    <div
      [tuiAppearance]="ascent.is_duplicate ? 'negative' : 'flat-grayscale'"
      class="flex flex-col gap-4 p-4 rounded-3xl relative no-underline text-inherit hover:no-underline w-full text-left"
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

      @if (ascentPhotoUrl(); as photoUrl) {
        <div class="w-full rounded-2xl overflow-hidden">
          <img
            [src]="photoUrl"
            class="w-full h-auto"
            [alt]="ascent.route?.name || 'Ascent photo'"
            [loading]="priority() ? 'eager' : 'lazy'"
            [attr.fetchpriority]="priority() ? 'high' : null"
            width="600"
            height="800"
          />
        </div>
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
              <div class="flex items-center gap-1">
                <app-avatar-ascent-type [type]="ascentType" size="xs" />
                <span
                  class="px-2 py-0.5 bg-[var(--tui-background-neutral-1)] rounded text-[10px] uppercase font-bold"
                >
                  {{ 'ascentTypes.' + ascentType | translate }}
                </span>
              </div>
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

  protected readonly ascentPhotoResource = resource({
    params: () => this.data().photo_path,
    loader: async ({ params: path }) => {
      if (!path) return null;
      return this.supabase.getAscentSignedUrl(path);
    },
  });
  protected readonly ascentPhotoUrl = computed(() =>
    this.ascentPhotoResource.value(),
  );

  editAscent() {
    this.ascentsService.openAscentForm({ ascentData: this.data() }).subscribe();
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
