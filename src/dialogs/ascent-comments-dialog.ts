import { AsyncPipe, DatePipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  resource,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiButton,
  TuiFallbackSrcPipe,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/experimental';
import { TuiAvatar, TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { AscentsService } from '../services/ascents.service';
import { SupabaseService } from '../services/supabase.service';
import { UserProfilesService } from '../services/user-profiles.service';

import { EmptyStateComponent } from '../components/empty-state';
import { CommentLikesComponent } from '../components/comment-likes';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { UserProfileBasicDto } from '../models';

import { MentionLinkPipe } from '../pipes/mention-link.pipe';

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
    TuiLoader,
    TuiAvatar,
    TuiFallbackSrcPipe,
    AsyncPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    MentionLinkPipe,
    CommentLikesComponent,
    CommonModule,
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
                <div class="flex items-center justify-end mt-1">
                  <button
                    tuiButton
                    type="button"
                    appearance="action-destructive"
                    size="xs"
                    (click)="onReply(comment.user_profiles)"
                  >
                    {{ 'reply' | translate }}
                  </button>
                  @if (comment.user_id === supabase.authUserId()) {
                    <button
                      tuiButton
                      type="button"
                      appearance="action"
                      size="xs"
                      class="ml-2"
                      (click)="onDeleteComment(comment.id)"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                </div>
              </div>

              <div class="flex flex-col items-center self-start pt-1">
                <app-comment-likes
                  [commentId]="comment.id"
                  [(likesCount)]="comment.likes_count"
                  [(userLiked)]="comment.user_liked"
                />
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

      <div
        #container
        class="p-4 border-t border-[var(--tui-border-normal)] relative"
      >
        <span class="text-[13px] font-bold opacity-70 mb-2 block">
          {{ 'addComment' | translate }}
        </span>

        <div
          class="relative bg-[var(--tui-background-base)] border border-[var(--tui-border-normal)] rounded-xl flex items-end p-2 gap-2 focus-within:ring-2 focus-within:ring-[var(--tui-text-action)] transition-shadow"
        >
          <div
            #editor
            contenteditable="true"
            class="outline-none grow max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-sm py-2 px-1"
            (input)="onEditorInput()"
            (click)="onEditorInput()"
            (keyup)="onEditorInput()"
            (keydown)="onEditorKeydown($event)"
            role="textbox"
            aria-multiline="true"
          ></div>

          @if (isEditorEmpty()) {
            <span
              class="absolute top-4 left-3 pointer-events-none text-[var(--tui-text-tertiary)] text-sm"
              >...</span
            >
          }

          <button
            tuiButton
            type="button"
            appearance="primary"
            size="s"
            iconStart="@tui.send"
            class="flex-none mb-0.5"
            (click)="onAddComment()"
            [disabled]="isEditorEmpty() || sending()"
          >
            <span class="hidden md:block">
              {{ 'send' | translate }}
            </span>
          </button>
        </div>

        @if (showMentions() && mentionUsers().length > 0) {
          <div
            class="absolute bottom-full mb-2 w-64 max-w-full shadow-lg bg-[var(--tui-background-base)] border border-[var(--tui-border-normal)] rounded-lg z-10 overflow-hidden"
            [style.left.px]="mentionPopupLeft()"
          >
            <tui-scrollbar class="max-h-48">
              <div #mentionList class="flex flex-col">
                @for (user of mentionUsers(); track user.id; let i = $index) {
                  <button
                    type="button"
                    (mousedown)="$event.preventDefault(); selectUser(user)"
                    class="flex items-center gap-2 p-2 w-full text-left transition-colors cursor-pointer"
                    [class]="{
                      'bg-[var(--tui-background-neutral-1)]':
                        i === selectedMentionIndex(),
                      'hover:bg-[var(--tui-background-neutral-1)]':
                        i !== selectedMentionIndex(),
                    }"
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
            </tui-scrollbar>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host ::ng-deep .mention-pill {
        color: var(--tui-text-primary-on-accent-1);
        background-color: var(--tui-text-action);
        border-radius: 12px;
        padding: 0 6px;
        margin: 0 1px;
        display: inline-block;
        font-weight: bold;
        font-size: 0.9em;
        line-height: 1.4;
        user-select: none;
        vertical-align: baseline;
      }
    `,
  ],
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

  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('mentionList') mentionListRef?: ElementRef<HTMLDivElement>;

  protected readonly ascentId = this.context.data.ascentId;
  protected readonly sending = signal(false);
  protected readonly isEditorEmpty = signal(true);

  // Mention logic
  protected readonly showMentions = signal(false);
  protected readonly mentionQuery = signal('');
  protected readonly selectedMentionIndex = signal(0);
  protected readonly mentionPopupLeft = signal(0); // Offset in pixels

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

  constructor() {
    // Reset selection when users change
    effect(() => {
      this.mentionUsers();
      this.selectedMentionIndex.set(0);
      // Ensure we scroll to top when list updates
      setTimeout(() => {
        if (this.mentionListRef?.nativeElement) {
          const first =
            this.mentionListRef.nativeElement.querySelector('button');
          first?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
    });
  }

  protected onEditorInput() {
    this.checkEmpty();
    this.checkForMentions();
  }

  protected onEditorKeydown(event: KeyboardEvent) {
    if (this.showMentions() && this.mentionUsers().length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedMentionIndex.update(
          (i) => (i + 1) % this.mentionUsers().length,
        );
        this.scrollToSelectedMention();
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedMentionIndex.update(
          (i) =>
            (i - 1 + this.mentionUsers().length) % this.mentionUsers().length,
        );
        this.scrollToSelectedMention();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const users = this.mentionUsers();
        if (users[this.selectedMentionIndex()]) {
          this.selectUser(users[this.selectedMentionIndex()]);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.showMentions.set(false);
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onAddComment();
    }
  }

  private scrollToSelectedMention() {
    // Use setTimeout to allow DOM to update class styles first, though not strictly necessary if manual calc
    setTimeout(() => {
      if (!this.mentionListRef) return;
      const container = this.mentionListRef.nativeElement;
      const buttons = container.querySelectorAll('button');
      const selectedButton = buttons[
        this.selectedMentionIndex()
      ] as HTMLElement;

      if (selectedButton) {
        selectedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  private checkEmpty() {
    if (!this.editorRef) return;
    const text = this.editorRef.nativeElement.textContent?.trim();
    this.isEditorEmpty.set(!text);
  }

  private checkForMentions() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.showMentions.set(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const textBeforeCursor = node.textContent.substring(0, range.startOffset);
      const lastAt = textBeforeCursor.lastIndexOf('@');

      if (lastAt !== -1) {
        const query = textBeforeCursor.substring(lastAt + 1);
        // Only allow simple names without spaces (or minimal spaces) to avoid false positives
        if (query.length >= 0 && query.length < 20) {
          this.mentionQuery.set(query);
          this.showMentions.set(true);

          try {
            // Calculate Position
            const rect = range.getBoundingClientRect();
            const containerRect =
              this.containerRef.nativeElement.getBoundingClientRect();

            // Position relative to the container
            let relativeLeft = rect.left - containerRect.left;

            // Clamp so it doesn't go off screen (horizontally)
            const dropdownWidth = 256; // w-64
            const containerWidth = containerRect.width;

            if (relativeLeft + dropdownWidth > containerWidth) {
              relativeLeft = containerWidth - dropdownWidth;
            }
            if (relativeLeft < 0) {
              relativeLeft = 0;
            }

            this.mentionPopupLeft.set(relativeLeft);
          } catch (e) {
            console.error('Error calculating caret position', e);
          }
          return;
        }
      }
    }

    this.showMentions.set(false);
  }

  protected onReply(user: UserProfileBasicDto) {
    if (!this.editorRef) return;
    const editor = this.editorRef.nativeElement;
    editor.focus();

    // Move cursor to end before inserting
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      // If not empty and doesn't end with space/newline, add space
      const text = editor.innerText || '';
      if (text.length > 0 && !/[\s\xA0]$/.test(text)) {
        const space = document.createTextNode('\u00A0');
        editor.appendChild(space);
        range.setStartAfter(space);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }

      this.insertMention(user, selection.getRangeAt(0));
    } else {
      this.insertMention(user);
    }
  }

  protected selectUser(user: UserProfileBasicDto) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const textBeforeCursor = node.textContent.substring(0, range.startOffset);
      const lastAt = textBeforeCursor.lastIndexOf('@');

      if (lastAt !== -1) {
        const mentionRange = document.createRange();
        mentionRange.setStart(node, lastAt);
        mentionRange.setEnd(node, range.startOffset);
        this.insertMention(user, mentionRange);
      }
    }
  }

  private insertMention(user: UserProfileBasicDto, replaceRange?: Range) {
    const pill = document.createElement('span');
    pill.className = 'mention-pill';
    pill.contentEditable = 'false';
    pill.setAttribute('data-id', user.id);
    pill.innerText = `@${user.name}`;

    const space = document.createTextNode('\u00A0');

    if (replaceRange) {
      replaceRange.deleteContents();
      replaceRange.insertNode(pill);
      replaceRange.setStartAfter(pill);
      replaceRange.insertNode(space);
    } else {
      const editor = this.editorRef.nativeElement;
      editor.appendChild(pill);
      editor.appendChild(space);
    }

    // Move cursor after space
    const range = document.createRange();
    const selection = window.getSelection();
    if (selection) {
      range.setStartAfter(space);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.showMentions.set(false);
    this.mentionQuery.set('');
    this.checkEmpty();
  }

  private getCommentContent(): string {
    if (!this.editorRef) return '';
    const clone = this.editorRef.nativeElement.cloneNode(true) as HTMLElement;

    // Convert pills to markdown syntax
    const pills = clone.querySelectorAll('.mention-pill');
    pills.forEach((pill) => {
      const id = pill.getAttribute('data-id');
      const name = pill.textContent?.replace('@', '').trim();
      if (id && name) {
        const textNode = document.createTextNode(`@[${name}](${id})`);
        pill.replaceWith(textNode);
      }
    });

    // Handle breaks and paragraphs if any
    const text = clone.innerText || clone.textContent || '';

    // Clean up
    return text.trim();
  }

  protected async onAddComment() {
    const commentText = this.getCommentContent();
    if (!commentText || this.sending()) return;

    this.sending.set(true);
    try {
      const result = await this.ascentsService.addComment(
        this.ascentId,
        commentText,
      );
      if (result) {
        if (this.editorRef) {
          this.editorRef.nativeElement.innerHTML = '';
          this.checkEmpty();
        }
        this.commentsResource.reload();
      }
    } finally {
      this.sending.set(false);
    }
  }

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
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
      content: this.translate.instant('deleteCommentConfirm'),
      yes: this.translate.instant('delete'),
      no: this.translate.instant('cancel'),
      appearance: 'negative',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('deleteComment'),
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
