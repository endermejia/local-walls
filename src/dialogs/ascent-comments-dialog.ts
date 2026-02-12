import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiButton,
  TuiFallbackSrcPipe,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/experimental';
import { TUI_CONFIRM, TuiAvatar, TuiConfirmData } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  AscentsService,
  SupabaseService,
  UserProfilesService,
} from '../services';
import { EmptyStateComponent } from '../components/empty-state';
import { MentionLinkPipe } from '../pipes/mention-link.pipe';
import { UserProfileDto } from '../models';

export interface AscentCommentsDialogData {
  ascentId: number;
}

@Component({
  selector: 'app-ascent-comments-dialog',
  standalone: true,
  imports: [
    EmptyStateComponent,
    TranslatePipe,
    TuiButton,
    TuiScrollbar,
    TuiTextfield,
    TuiLabel,
    TuiLoader,
    TuiAvatar,
    TuiFallbackSrcPipe,
    AsyncPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    MentionLinkPipe,
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <tui-scrollbar class="grow min-h-0">
        <div class="flex flex-col gap-4 p-4">
          @for (comment of comments(); track comment.id) {
            <div class="flex gap-3">
              <a
                [routerLink]="['/profile', comment.user_id]"
                (click)="context.completeWith()"
                class="block hover:opacity-80 transition-opacity flex-none"
              >
                <tui-avatar
                  [src]="
                    supabase.buildAvatarUrl(comment.user_profiles.avatar)
                      | tuiFallbackSrc: '@tui.user'
                      | async
                  "
                  size="s"
                />
              </a>
              <div class="flex flex-col grow min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <a
                    [routerLink]="['/profile', comment.user_id]"
                    (click)="context.completeWith()"
                    class="font-bold text-sm truncate hover:underline text-[var(--tui-text-primary)] cursor-pointer block min-w-0"
                  >
                    {{ comment.user_profiles.name }}
                  </a>
                  <span class="text-[10px] opacity-50 whitespace-nowrap pt-0.5">
                    {{ comment.created_at | date: 'd/M/yy, HH:mm' }}
                  </span>
                </div>
                <p
                  class="text-sm whitespace-pre-wrap break-words"
                  [innerHTML]="comment.comment | mentionLink"
                ></p>
                @if (comment.user_id === supabase.authUserId()) {
                  <div class="flex justify-end mt-1">
                    <button
                      tuiButton
                      type="button"
                      appearance="secondary-grayscale"
                      size="xs"
                      class="!h-6 !px-2 !text-[10px]"
                      (click)="onDeleteComment(comment.id)"
                    >
                      {{ 'actions.delete' | translate }}
                    </button>
                  </div>
                }
              </div>
            </div>
          } @empty {
            @if (!loading()) {
              <div class="py-12">
                <app-empty-state icon="@tui.message-circle" />
              </div>
            }
          }

          @if (loading()) {
            <div class="py-12 flex justify-center">
              <tui-loader />
            </div>
          }
        </div>
      </tui-scrollbar>

      <div class="p-4 border-t border-[var(--tui-border-normal)] relative">
        <tui-textfield
          class="w-full"
          tuiTextfieldSize="m"
          [tuiTextfieldCleaner]="false"
        >
          <label tuiLabel for="new-comment">
            {{ 'labels.addComment' | translate }}
          </label>
          <input
            tuiTextfield
            id="new-comment"
            autocomplete="off"
            placeholder="..."
            [(ngModel)]="newComment"
            (keyup.enter)="onAddComment()"
            (input)="onInput($event)"
            [disabled]="sending()"
          />
          <button
            tuiButton
            type="button"
            appearance="primary"
            size="s"
            iconStart="@tui.send"
            (click)="onAddComment()"
            [disabled]="!newComment().trim() || sending()"
          >
            <span class="hidden md:block">
              {{ 'actions.send' | translate }}
            </span>
          </button>
        </tui-textfield>

        @if (showMentions() && mentionUsers().length > 0) {
          <div
            class="absolute bottom-full mb-2 w-full max-h-48 overflow-y-auto shadow-lg bg-[var(--tui-base-01)] border border-[var(--tui-border-normal)] rounded-lg z-10 left-0"
          >
            @for (user of mentionUsers(); track user.id) {
              <button
                type="button"
                (click)="selectUser(user)"
                class="flex items-center gap-2 p-2 w-full text-left hover:bg-[var(--tui-base-02)] transition-colors cursor-pointer"
              >
                <tui-avatar
                  [src]="
                    supabase.buildAvatarUrl(user.avatar)
                      | tuiFallbackSrc: '@tui.user'
                      | async
                  "
                  size="xs"
                />
                <span class="text-sm font-medium">{{ user.name }}</span>
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCommentsDialogComponent {
  protected readonly supabase = inject(SupabaseService);
  private readonly ascentsService = inject(AscentsService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly router = inject(Router);
  protected readonly context =
    injectContext<TuiDialogContext<void, AscentCommentsDialogData>>();

  protected readonly ascentId = this.context.data.ascentId;
  protected readonly newComment = signal('');
  protected readonly sending = signal(false);

  // Mention logic
  protected readonly showMentions = signal(false);
  protected readonly mentionQuery = signal('');
  protected readonly mentionUsersResource = resource({
    params: () => this.mentionQuery(),
    loader: async ({ params: query }) => {
      if (!query || query.length < 1) return [];
      return await this.userProfilesService.searchUsers(query);
    },
  });
  protected readonly mentionUsers = computed(
    () => this.mentionUsersResource.value() ?? [],
  );

  protected readonly commentsResource = resource({
    params: () => this.ascentId,
    loader: ({ params: id }) => this.ascentsService.getComments(id),
  });

  protected readonly comments = computed(
    () => this.commentsResource.value() ?? [],
  );
  protected readonly loading = computed(() =>
    this.commentsResource.isLoading(),
  );

  protected async onAddComment() {
    const commentText = this.newComment().trim();
    if (!commentText || this.sending()) return;

    this.sending.set(true);
    try {
      const result = await this.ascentsService.addComment(
        this.ascentId,
        commentText,
      );
      if (result) {
        this.newComment.set('');
        this.commentsResource.reload();
      }
    } finally {
      this.sending.set(false);
    }
  }

  protected onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const cursor = input.selectionStart || 0;

    // Find the word being typed
    const textBeforeCursor = value.slice(0, cursor);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const query = textBeforeCursor.slice(lastAt + 1);
      // Ensure no spaces in the query (simple mention logic)
      if (!query.includes(' ') && query.length > 0) {
        this.mentionQuery.set(query);
        this.showMentions.set(true);
        return;
      }
    }

    this.showMentions.set(false);
  }

  protected selectUser(user: UserProfileDto) {
    const currentComment = this.newComment();
    const query = this.mentionQuery();
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace the last occurrence of @query before cursor (or just last one)
    // For simplicity, we assume the user is typing at the end or we replace the last matching pattern
    // A more robust way would use selectionStart, but newComment signal might not be perfectly synced with DOM selection immediately
    // Let's use a regex replacement for the last occurrence of `@query`
    const regex = new RegExp(`@${escapedQuery}(?=[^@]*$)`);
    const newValue = currentComment.replace(
      regex,
      `@[${user.name}](${user.id}) `,
    );

    this.newComment.set(newValue);
    this.showMentions.set(false);
    this.mentionQuery.set('');

    // Refocus input (optional, might need ElementRef)
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // Check if the clicked element is a mention link
    const link = target.closest('.mention-link');
    if (link) {
      event.preventDefault();
      const id = link.getAttribute('data-id');
      if (id) {
        void this.router.navigate(['/profile', id]);
        this.context.completeWith();
      }
    }
  }

  protected async onDeleteComment(commentId: number) {
    const data: TuiConfirmData = {
      content: this.translate.instant('actions.deleteCommentConfirm'),
      yes: this.translate.instant('actions.delete'),
      no: this.translate.instant('actions.cancel'),
      appearance: 'negative',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('actions.deleteComment'),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (confirmed) {
      const success = await this.ascentsService.deleteComment(
        this.ascentId,
        commentId,
      );
      if (success) {
        this.commentsResource.reload();
      }
    }
  }
}
