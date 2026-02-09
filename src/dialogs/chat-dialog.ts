import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
  ElementRef,
  effect,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiFallbackSrcPipe,
  TuiIcon,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/experimental';
import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiConfirmData,
  TuiMessage,
  TUI_CONFIRM,
  TuiTextarea,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { RealtimeChannel } from '@supabase/supabase-js';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
  from,
  firstValueFrom,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  BlockingService,
  MessagingService,
  SupabaseService,
  ToastService,
  UserProfilesService,
} from '../services';
import {
  ChatMessageDto,
  ChatRoomWithParticipant,
  UserProfileDto,
} from '../models';
import { EmptyStateComponent } from '../components/empty-state';

export interface ChatDialogData {
  userId?: string;
}

@Component({
  selector: 'app-chat-dialog',
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
    CommonModule,
    TuiBadgeNotification,
    TuiIcon,
    ReactiveFormsModule,
    TuiDataList,
    TuiAppearance,
    TuiMessage,
    TuiTextarea,
  ],
  template: `
    <div class="flex flex-col h-[70dvh] min-h-[500px] -m-4">
      @if (selectedRoom(); as room) {
        <!-- Messages View -->
        <div
          class="flex items-center p-2 border-b border-[var(--tui-border-normal)] gap-2"
        >
          <button
            tuiIconButton
            type="button"
            appearance="flat-grayscale"
            size="s"
            iconStart="@tui.chevron-left"
            (click)="selectedRoom.set(null)"
          >
            {{ 'actions.back' | translate }}
          </button>
          <tui-avatar
            [src]="
              supabase.buildAvatarUrl(room.participant.avatar)
                | tuiFallbackSrc: '@tui.user'
                | async
            "
            size="s"
          />
          <span class="font-bold truncate text-sm">{{
            room.participant.name
          }}</span>
          <button
            tuiIconButton
            type="button"
            [appearance]="
              isBlockedByMe() ? 'primary-destructive' : 'flat-grayscale'
            "
            size="s"
            [iconStart]="isBlockedByMe() ? '@tui.lock' : '@tui.lock-open'"
            (click)="toggleBlock(room.participant.id)"
            class="ml-auto"
          >
            {{
              (isBlockedByMe() ? 'actions.unblock' : 'actions.block')
                | translate
            }}
          </button>
        </div>

        <tui-scrollbar
          #scrollbar
          class="grow min-h-0"
          (scroll)="onScroll($event)"
        >
          <div class="flex flex-col gap-2 p-4">
            @if (hasMore() && !loadingMessages()) {
              <div class="flex justify-center">
                <button
                  tuiButton
                  appearance="flat-grayscale"
                  size="xs"
                  (click)="loadMoreMessages()"
                >
                  {{ 'actions.loadMore' | translate }}
                </button>
              </div>
            }

            @if (loadingMessages() && accumulatedMessages().length === 0) {
              <div class="py-12 flex justify-center">
                <tui-loader />
              </div>
            }

            @for (msg of messages(); track msg.id) {
              @let isMe = msg.sender_id === supabase.authUserId();
              <div class="flex" [class.justify-end]="isMe">
                <div
                  [appearance]="isMe ? 'accent' : 'secondary-grayscale'"
                  tuiMessage
                  class="max-w-[85%]"
                >
                  <p class="whitespace-pre-wrap wrap-anywhere leading-tight">
                    {{ msg.text }}
                  </p>
                  <div
                    class="text-[10px] opacity-60 text-right mt-1 flex items-center justify-end gap-1"
                  >
                    {{ msg.created_at | date: 'HH:mm' }}
                    @if (isMe) {
                      <tui-icon
                        [icon]="msg.read_at ? '@tui.check-check' : '@tui.check'"
                        class="!w-3 !h-3"
                      />
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </tui-scrollbar>

        <div class="p-4 border-t border-[var(--tui-border-normal)]">
          @if (isBlockedByMe()) {
            <div
              class="flex flex-col items-center justify-center p-4 gap-2 opacity-70"
            >
              <span class="text-sm">{{
                'messages.userBlocked' | translate
              }}</span>
              <button
                tuiButton
                type="button"
                appearance="flat"
                size="s"
                (click)="toggleBlock(room.participant.id)"
              >
                {{ 'actions.unblock' | translate }}
              </button>
            </div>
          } @else {
            <tui-textfield
              class="w-full"
              tuiTextfieldSize="m"
              [tuiTextfieldCleaner]="false"
            >
              <label tuiLabel for="new-message">{{
                isRequestPending()
                  ? ('messages.pendingRequest' | translate)
                  : ('labels.typeMessage' | translate)
              }}</label>
              <textarea
                #messageTextarea
                tuiTextarea
                id="new-message"
                autocomplete="off"
                [placeholder]="
                  isRequestPending()
                    ? ('messages.pendingPlaceholder' | translate)
                    : '...'
                "
                [(ngModel)]="newMessage"
                (keydown.enter)="onEnter($event)"
                [disabled]="sending() || isRequestPending()"
                maxlength="250"
              ></textarea>
              <button
                tuiButton
                type="button"
                appearance="primary"
                size="s"
                iconStart="@tui.send"
                (click)="onSendMessage()"
                [disabled]="
                  !newMessage().trim() || sending() || isRequestPending()
                "
                class="mt-auto mb-1"
              >
                <span class="hidden md:block">
                  {{ 'actions.send' | translate }}
                </span>
              </button>
            </tui-textfield>
            <div class="text-right text-xs opacity-50 mt-1">
              {{ newMessage().length }}/250
            </div>
          }
        </div>
      } @else {
        <!-- Rooms View -->
        <div
          class="p-4 border-b border-[var(--tui-border-normal)] relative z-50"
        >
          <tui-textfield class="w-full" tuiTextfieldSize="m">
            <label tuiLabel for="user-search">{{
              'labels.searchUser' | translate
            }}</label>
            <input
              tuiTextfield
              id="user-search"
              autocomplete="off"
              [formControl]="userSearchControl"
            />
            <tui-icon icon="@tui.search" />
          </tui-textfield>

          @if (searchResults().length > 0) {
            <div
              class="absolute left-4 right-4 mt-1 shadow-2xl rounded-xl overflow-hidden border border-[var(--tui-border-normal)] bg-[var(--tui-background-base)] z-[100]"
            >
              <tui-data-list>
                @for (user of searchResults(); track user.id) {
                  <button
                    tuiOption
                    new
                    type="button"
                    (click)="onSelectUser(user)"
                  >
                    <tui-avatar
                      [src]="
                        supabase.buildAvatarUrl(user.avatar)
                          | tuiFallbackSrc: '@tui.user'
                          | async
                      "
                      size="xs"
                      class="mr-2"
                    />
                    {{ user.name }}
                  </button>
                }
              </tui-data-list>
            </div>
          }
        </div>

        <tui-scrollbar class="grow min-h-0">
          <div class="flex flex-col">
            @for (room of rooms(); track room.id) {
              <button
                class="flex items-center gap-4 p-4 text-left hover:bg-[var(--tui-background-neutral-1)] transition-colors border-b border-[var(--tui-border-normal)] last:border-0 w-full"
                (click)="onSelectRoom(room)"
              >
                <tui-avatar
                  [src]="
                    supabase.buildAvatarUrl(room.participant.avatar)
                      | tuiFallbackSrc: '@tui.user'
                      | async
                  "
                  size="m"
                />
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-center gap-2">
                    <span class="font-bold truncate">{{
                      room.participant.name
                    }}</span>
                    @if (room.last_message) {
                      <span class="text-[10px] opacity-50 whitespace-nowrap">
                        {{ room.last_message.created_at | date: 'd/M/yy' }}
                      </span>
                    }
                  </div>
                  <div class="flex justify-between items-center gap-2">
                    <p
                      class="text-sm opacity-70 line-clamp-1 min-w-0 flex-1 wrap-anywhere"
                    >
                      {{ room.last_message?.text || '...' }}
                    </p>
                    @if (room.unread_count > 0) {
                      <tui-badge-notification tuiAppearance="accent" size="s">
                        {{ room.unread_count }}
                      </tui-badge-notification>
                    }
                  </div>
                </div>
              </button>
            } @empty {
              @if (!loadingRooms()) {
                <div class="py-20">
                  <app-empty-state icon="@tui.messages-square" />
                </div>
              }
            }

            @if (loadingRooms()) {
              <div class="py-12 flex justify-center">
                <tui-loader />
              </div>
            }
          </div>
        </tui-scrollbar>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatDialogComponent implements OnDestroy {
  protected readonly supabase = inject(SupabaseService);
  protected readonly messagingService = inject(MessagingService);
  protected readonly userProfilesService = inject(UserProfilesService);
  protected readonly blockingService = inject(BlockingService);
  protected readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly context =
    injectContext<TuiDialogContext<void, ChatDialogData>>();

  @ViewChild('scrollbar', { read: ElementRef })
  private scrollbar?: ElementRef<HTMLElement>;

  @ViewChild('messageTextarea', { read: ElementRef })
  private messageTextarea?: ElementRef<HTMLTextAreaElement>;

  private roomSubscription?: RealtimeChannel | null;
  private roomsSubscription?: RealtimeChannel | null;

  protected readonly selectedRoom = signal<ChatRoomWithParticipant | null>(
    null,
  );
  protected newMessage = signal('');
  protected readonly isBlockedByMe = signal(false);
  protected readonly sending = signal(false);
  protected readonly messagesOffset = signal(0);
  protected readonly limit = 20;

  protected readonly userSearchControl = new FormControl('');
  protected readonly searchResults = signal<UserProfileDto[]>([]);

  protected readonly roomsResource = resource({
    loader: () => this.messagingService.getRooms(),
  });

  protected readonly rooms = computed(() => this.roomsResource.value() ?? []);
  protected readonly loadingRooms = computed(() =>
    this.roomsResource.isLoading(),
  );

  protected readonly messagesResource = resource({
    params: () => ({
      roomId: this.selectedRoom()?.id,
      offset: this.messagesOffset(),
    }),
    loader: ({ params }) => {
      if (!params.roomId) return Promise.resolve([] as ChatMessageDto[]);
      return this.messagingService.getMessages(
        params.roomId,
        this.limit,
        params.offset,
      );
    },
  });

  protected readonly accumulatedMessages = signal<ChatMessageDto[]>([]);
  protected readonly messages = computed(() =>
    [...this.accumulatedMessages()].reverse(),
  );
  protected readonly loadingMessages = computed(() =>
    this.messagesResource.isLoading(),
  );
  protected readonly hasMore = signal(true);

  protected readonly isRequestPending = computed(() => {
    if (this.hasMore()) return false;

    const msgs = this.messages();
    if (msgs.length === 0) return false;

    const myId = this.supabase.authUserId();
    const hasOtherUserMessages = msgs.some((m) => m.sender_id !== myId);

    if (hasOtherUserMessages) return false;

    return true;
  });

  constructor() {
    const initialUserId = this.context.data?.userId;
    if (initialUserId) {
      void this.openChatWithUser(initialUserId);
    }

    this.userSearchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((val) => {
          if (!val || val.length < 2) return of([]);
          return from(this.userProfilesService.searchUsers(val));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((users) => {
        this.searchResults.set(users);
      });

    effect(() => {
      const res = this.messagesResource.value();
      if (res) {
        if (this.messagesOffset() === 0) {
          this.accumulatedMessages.set(res);
          this.scrollToBottom();
        } else {
          this.accumulatedMessages.update((prev) => [...prev, ...res]);
        }
        if (res.length < this.limit) {
          this.hasMore.set(false);
        }
      }
    });

    this.roomsSubscription = this.messagingService.watchUnreadCount(() => {
      void this.roomsResource.reload();
      void this.messagingService.refreshUnreadCount();
    });
  }

  private async openChatWithUser(userId: string) {
    const roomId = await this.messagingService.getOrCreateRoom(userId);
    if (roomId) {
      await this.roomsResource.reload();
      // Wait for rooms to be loaded if they are not yet
      let room = this.rooms().find((r) => r.id === roomId);

      if (!room) {
        // If not found, it might be a brand new room, we can try to construct a minimal one
        // or just wait for the resource to finish loading.
        // Since getRooms() returns ChatRoomWithParticipant[], we need the participant info.
        // Let's try to find it one more time after a short delay if it's still loading
        if (this.loadingRooms()) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          room = this.rooms().find((r) => r.id === roomId);
        }
      }

      if (room) {
        this.onSelectRoom(room);
      } else {
        // Fallback: if we still don't have the room object, we might need to fetch the participant
        const user = await this.userProfilesService.getUserProfile(userId);
        if (user) {
          this.onSelectRoom({
            id: roomId,
            participant: user,
            unread_count: 0,
            last_message: undefined,
            created_at: new Date().toISOString(),
            last_message_at: null,
          });
        }
      }
    }
  }

  protected onSelectRoom(room: ChatRoomWithParticipant) {
    this.selectedRoom.set(room);
    this.messagesOffset.set(0);
    this.accumulatedMessages.set([]);
    this.hasMore.set(true);
    this.userSearchControl.setValue('', { emitEvent: false });
    this.searchResults.set([]);
    void this.messagingService.markAsRead(room.id);

    this.roomSubscription?.unsubscribe();
    this.roomSubscription = this.messagingService.watchMessages(
      room.id,
      (msg) => {
        if (msg.sender_id !== this.supabase.authUserId()) {
          this.accumulatedMessages.update((prev) => [msg, ...prev]);
          void this.messagingService.markAsRead(room.id);
          this.scrollToBottom();
        }
      },
    );
    this.scrollToBottom();
    this.focusTextarea();

    this.checkBlockStatus(room.participant.id);
  }

  private async checkBlockStatus(userId: string) {
    const { blockMessages } = await this.blockingService.getBlockState(userId);
    this.isBlockedByMe.set(blockMessages);
  }

  protected async toggleBlock(userId: string) {
    const room = this.selectedRoom();
    const isBlocking = !this.isBlockedByMe();

    const data: TuiConfirmData = {
      content: this.translate.instant(
        isBlocking
          ? 'actions.blockMessagesConfirm'
          : 'actions.unblockMessagesConfirm',
        { name: room?.participant.name || 'User' },
      ),
      yes: this.translate.instant(
        isBlocking ? 'actions.block' : 'actions.unblock',
      ),
      no: this.translate.instant('actions.cancel'),
      appearance: isBlocking ? 'negative' : 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(
          isBlocking ? 'actions.blockMessages' : 'actions.unblockMessages',
        ),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    // We assume ascents are not blocked here for simplicity as we only toggle messages from chat
    // If we wanted to persist ascent blocking state, we'd need to fetch it first or pass it around
    // For now let's just use what getBlockState returns
    const { blockAscents } = await this.blockingService.getBlockState(userId);

    const success = isBlocking
      ? await this.blockingService.toggleBlockMessages(userId, blockAscents)
      : await this.blockingService.toggleUnblockMessages(userId, blockAscents);

    if (success) {
      this.isBlockedByMe.set(isBlocking);
      this.toast.success(
        isBlocking
          ? 'messages.toasts.messagesBlocked'
          : 'messages.toasts.messagesUnblocked',
      );
    }
  }

  protected onSelectUser(user: UserProfileDto) {
    void this.openChatWithUser(user.id);
    this.userSearchControl.setValue('', { emitEvent: false });
    this.searchResults.set([]);
  }

  protected onEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      event.preventDefault();
      void this.onSendMessage();
    }
  }

  protected async onSendMessage() {
    const room = this.selectedRoom();
    const text = this.newMessage().trim();
    if (
      !room ||
      !text ||
      text.length > 250 ||
      this.sending() ||
      this.isRequestPending()
    )
      return;

    this.sending.set(true);
    try {
      const msg = await this.messagingService.sendMessage(room.id, text);
      if (msg) {
        this.newMessage.set('');
        this.accumulatedMessages.update((prev) => [msg, ...prev]);
        this.scrollToBottom();
      }
    } finally {
      this.sending.set(false);
      this.focusTextarea();
    }
  }

  private focusTextarea() {
    setTimeout(() => {
      this.messageTextarea?.nativeElement.focus();
    }, 200);
  }

  protected loadMoreMessages() {
    if (!this.loadingMessages() && this.hasMore()) {
      this.messagesOffset.update((o) => o + this.limit);
    }
  }

  protected onScroll(event: Event) {
    const target = event.target as HTMLElement;
    if (target.scrollTop === 0 && this.hasMore() && !this.loadingMessages()) {
      this.loadMoreMessages();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = this.scrollbar?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }

  ngOnDestroy() {
    this.roomSubscription?.unsubscribe();
    this.roomsSubscription?.unsubscribe();
  }
}

export default ChatDialogComponent;
