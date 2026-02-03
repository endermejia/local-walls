import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
  ElementRef,
  ViewChild,
  effect,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiDataList,
  TuiFallbackSrcPipe,
  TuiIcon,
  TuiLabel,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogContext } from '@taiga-ui/experimental';
import {
  TuiAvatar,
  TuiBadgeNotification,
  TuiDataListWrapper,
} from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, switchMap, of, from } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  MessagingService,
  SupabaseService,
  UserProfilesService,
} from '../services';
import {
  ChatMessageDto,
  ChatRoomWithParticipant,
  UserProfileDto,
} from '../models';
import { EmptyStateComponent } from './empty-state';

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
    TuiDataListWrapper,
    TuiDataList,
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
            select room
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
        </div>

        <tui-scrollbar
          #scrollbar
          class="grow min-h-0"
          (scroll)="onScroll($event)"
        >
          <div class="flex flex-col gap-4 p-4">
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
                  class="max-w-[85%] p-3 rounded-2xl text-sm"
                  [class.bg-[var(--tui-background-accent)]]="isMe"
                  [class.text-[var(--tui-text-on-accent)]]="isMe"
                  [class.bg-[var(--tui-background-neutral-1)]]="!isMe"
                >
                  <p class="whitespace-pre-wrap break-words leading-tight">
                    {{ msg.text }}
                  </p>
                  <div
                    class="text-[10px] opacity-60 text-right mt-1 flex items-center justify-end gap-1"
                  >
                    {{ msg.created_at | date: 'HH:mm' }}
                    @if (isMe) {
                      @if (msg.read_at) {
                        <tui-icon
                          icon="@tui.check-check"
                          class="!w-3 !h-3 text-blue-400"
                        />
                      } @else {
                        <tui-icon icon="@tui.check" class="!w-3 !h-3" />
                      }
                    }
                  </div>
                </div>
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
            <label tuiLabel for="new-message">{{
              'labels.typeMessage' | translate
            }}</label>
            <input
              tuiTextfield
              id="new-message"
              autocomplete="off"
              placeholder="..."
              [(ngModel)]="newMessage"
              (keyup.enter)="onSendMessage()"
              [disabled]="sending()"
            />
            <button
              tuiButton
              type="button"
              appearance="primary"
              size="s"
              iconStart="@tui.send"
              (click)="onSendMessage()"
              [disabled]="!newMessage().trim() || sending()"
            >
              {{ 'actions.send' | translate }}
            </button>
          </tui-textfield>
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
                  <button tuiOption type="button" (click)="onSelectUser(user)">
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
                    <p class="text-sm opacity-70 truncate min-w-0 flex-1">
                      {{ room.last_message?.text || '...' }}
                    </p>
                    @if (room.unread_count > 0) {
                      <tui-badge-notification size="s" appearance="accent">
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
export class ChatDialogComponent {
  protected readonly supabase = inject(SupabaseService);
  protected readonly messagingService = inject(MessagingService);
  protected readonly userProfilesService = inject(UserProfilesService);
  protected readonly context =
    injectContext<TuiDialogContext<void, ChatDialogData>>();

  @ViewChild('scrollbar', { read: ElementRef })
  private scrollbar?: ElementRef<HTMLElement>;

  protected readonly selectedRoom = signal<ChatRoomWithParticipant | null>(
    null,
  );
  protected readonly newMessage = signal('');
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
  }

  private async openChatWithUser(userId: string) {
    const roomId = await this.messagingService.getOrCreateRoom(userId);
    if (roomId) {
      await this.roomsResource.reload();
      const room = this.rooms().find((r) => r.id === roomId);
      if (room) {
        this.onSelectRoom(room);
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
  }

  protected onSelectUser(user: UserProfileDto) {
    void this.openChatWithUser(user.id);
    this.userSearchControl.setValue('', { emitEvent: false });
    this.searchResults.set([]);
  }

  protected async onSendMessage() {
    const room = this.selectedRoom();
    const text = this.newMessage().trim();
    if (!room || !text || this.sending()) return;

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
    }
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
      if (this.scrollbar) {
        this.scrollbar.nativeElement.scrollTop =
          this.scrollbar.nativeElement.scrollHeight;
      }
    }, 100);
  }
}

export default ChatDialogComponent;
