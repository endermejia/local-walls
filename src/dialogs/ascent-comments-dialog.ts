import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

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

import { AscentsService, SupabaseService } from '../services';
import { EmptyStateComponent } from '../components/empty-state';

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
  ],
  template: `
    <div class="flex flex-col h-[60dvh] min-h-[400px] -m-4">
      <tui-scrollbar class="grow min-h-0">
        <div class="flex flex-col gap-4 p-4">
          @for (comment of comments(); track comment.id) {
            <div class="flex gap-3">
              <tui-avatar
                [src]="
                  supabase.buildAvatarUrl(comment.user_profiles.avatar)
                    | tuiFallbackSrc: '@tui.user'
                    | async
                "
                size="s"
              />
              <div class="flex flex-col grow min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <span class="font-bold text-sm truncate">{{
                    comment.user_profiles.name
                  }}</span>
                  <span class="text-[10px] opacity-50 whitespace-nowrap pt-0.5">
                    {{ comment.created_at | date: 'd/M/yy, HH:mm' }}
                  </span>
                </div>
                <p class="text-sm whitespace-pre-wrap break-words">
                  {{ comment.comment }}
                </p>
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

      <div class="p-4 border-t border-[var(--tui-border-normal)]">
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
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AscentCommentsDialogComponent {
  protected readonly supabase = inject(SupabaseService);
  private readonly ascentsService = inject(AscentsService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly context =
    injectContext<TuiDialogContext<void, AscentCommentsDialogData>>();

  protected readonly ascentId = this.context.data.ascentId;
  protected readonly newComment = signal('');
  protected readonly sending = signal(false);

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
