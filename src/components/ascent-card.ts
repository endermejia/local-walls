import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TuiAppearance, TuiButton } from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiConfirmData,
  TuiRating,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  GradeLabel,
  RouteAscentWithExtras,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { FollowsService, GlobalData, SupabaseService } from '../services';

import { AscentCommentsComponent } from './ascent-comments';
import { AscentLikesComponent } from './ascent-likes';

@Component({
  selector: 'app-ascent-card',
  imports: [
    AscentLikesComponent,
    AscentCommentsComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiHeader,
    TuiRating,
  ],
  template: `
    @let ascent = data();
    <button
      tuiAppearance="flat-grayscale"
      (click)="
        ascent.route
          ? router.navigate([
              '/area',
              ascent.route.area_slug,
              ascent.route.crag_slug,
              ascent.route.slug,
            ])
          : null
      "
      class="flex flex-col gap-4 p-4 rounded-3xl relative no-underline text-inherit hover:no-underline w-full text-left"
    >
      <header tuiHeader class="flex justify-between items-center">
        @if (showUser()) {
          <div
            role="link"
            tabindex="0"
            (click)="
              $event.stopPropagation();
              $event.preventDefault();
              router.navigate(['/profile', ascent.user_id])
            "
            (keydown.enter)="
              $event.stopPropagation();
              $event.preventDefault();
              router.navigate(['/profile', ascent.user_id])
            "
            class="flex items-center gap-3 no-underline text-inherit cursor-pointer group/user"
          >
            <tui-avatar
              [src]="supabase.buildAvatarUrl(ascent.user?.avatar) || '@tui.user'"
              size="s"
            />
            <div class="flex flex-col">
              <span class="font-bold text-sm group-hover/user:underline">
                {{ ascent.user?.name || 'User' }}
              </span>
              <span class="text-xs text-gray-400">
                {{
                  ascent.date
                    | date: 'longDate' : undefined : global.selectedLanguage()
                }}
              </span>
            </div>
          </div>

          @if (ascent.user_id !== supabase.authUserId()) {
            @if (isFollowed()) {
              <button
                tuiButton
                size="s"
                appearance="secondary-grayscale"
                class="!rounded-full"
                (click)="unfollow(ascent.user_id, ascent.user?.name || 'User'); $event.stopPropagation()"
              >
                {{ 'actions.following' | translate }}
              </button>
            } @else {
              <button
                tuiButton
                size="s"
                appearance="action"
                class="!rounded-full"
                (click)="follow(ascent.user_id); $event.stopPropagation()"
              >
                {{ 'actions.follow' | translate }}
              </button>
            }
          }
        } @else {
          <div class="flex flex-col">
            <span class="text-xs text-gray-400">
              {{
                ascent.date
                  | date: 'longDate' : undefined : global.selectedLanguage()
              }}
            </span>
          </div>
        }
      </header>

      <div class="flex flex-col gap-1">
        @if (ascent.route && showRoute()) {
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold text-lg">
              {{ ascent.route.name }}
            </span>
            @if (ascent.rate) {
              <tui-rating
                [ngModel]="ascent.rate"
                [max]="5"
                [readOnly]="true"
                class="pointer-events-none"
                [style.font-size.rem]="0.5"
              />
            }
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span class="font-semibold text-blue-600">
              {{ gradeLabelByNumber[ascent.grade ?? ascent.route.grade] }}
            </span>
            @if (ascent.type) {
              <span
                class="px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-bold"
              >
                {{ 'ascentTypes.' + ascent.type | translate }}
              </span>
            }
            <span>•</span>
            <span>{{ ascent.route.crag_name }}</span>
          </div>
        } @else {
          <div class="flex items-center gap-2 text-sm text-gray-600">
            @let displayGrade = ascent.grade ?? ascent.route?.grade;
            @if (displayGrade !== null && displayGrade !== undefined) {
              <span class="font-semibold text-blue-600">
                {{ gradeLabelByNumber[displayGrade] }}
              </span>
            }
            @if (ascent.type) {
              <span
                class="px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-bold"
              >
                {{ 'ascentTypes.' + ascent.type | translate }}
              </span>
            }
            @if (ascent.rate) {
              <tui-rating
                [ngModel]="ascent.rate"
                [max]="5"
                [readOnly]="true"
                class="pointer-events-none"
                [style.font-size.rem]="0.5"
              />
            }
          </div>
        }
      </div>

      @if (ascent.comment) {
        <p
          class="text-sm text-gray-700 italic border-l-2 border-gray-200 pl-3 py-1 self-start"
        >
          "{{ ascent.comment }}"
        </p>
      }

      <footer class="flex items-center gap-4 mt-2">
        <app-ascent-likes [ascentId]="ascent.id" />
        <app-ascent-comments [ascentId]="ascent.id" />
      </footer>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCardComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  private readonly followsService = inject(FollowsService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);

  data = input.required<RouteAscentWithExtras>();
  showUser = input(true);
  showRoute = input(true);
  isFollowed = input(false);

  followEvent = output<string>();
  unfollowEvent = output<string>();

  protected readonly gradeLabelByNumber: Partial<Record<number, GradeLabel>> =
    VERTICAL_LIFE_TO_LABEL;

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
