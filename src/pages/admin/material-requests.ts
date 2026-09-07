import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiLabel,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiSkeleton } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import type {
  AreaMaterialRequestWithDetails,
  MaterialRequestStatus,
} from '../../models';

import { AvatarUrlPipe } from '../../pipes';

@Component({
  selector: 'app-admin-material-requests',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    CommonModule,
    DatePipe,
    DecimalPipe,
    EmptyStateComponent,
    FormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiIcon,
    TuiLabel,
    TuiSkeleton,
    TuiTextfield,
  ],
  template: `
    <div
      class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8"
    >
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight m-0">
          <a
            routerLink="/admin"
            class="no-underline text-inherit flex items-center gap-2"
          >
            <tui-icon icon="@tui.arrow-left" />
            <div
              class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0"
            >
              <tui-icon icon="@tui.package" />
            </div>
            {{ 'admin.materialRequests.title' | translate }}
          </a>
        </h1>
      </div>

      <!-- Filter chips -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        @for (st of statusFilters; track st) {
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border"
            [class.bg-(--tui-background-accent-1)]="selectedStatus() === st"
            [class.text-(--tui-background-base)]="selectedStatus() === st"
            [class.border-(--tui-border-focus)]="selectedStatus() === st"
            [class.bg-(--tui-background-neutral-1)]="selectedStatus() !== st"
            [class.text-(--tui-text-primary)]="selectedStatus() !== st"
            [class.border-(--tui-border-normal)]="selectedStatus() !== st"
            (click)="selectedStatus.set(st)"
          >
            {{ 'admin.materialRequests.filters.' + st | translate }}
            @if (st === 'pending' && pendingCount() > 0) {
              <span
                class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-(--tui-background-negative-neutral) text-(--tui-status-negative)"
              >
                {{ pendingCount() }}
              </span>
            }
          </button>
        }
      </div>

      <!-- Requests List -->
      <div class="flex flex-col gap-4">
        @if (requestsResource.isLoading()) {
          @for (_ of [1, 2, 3]; track $index) {
            <div [tuiSkeleton]="true" class="h-40 rounded-3xl"></div>
          }
        } @else {
          @for (req of filteredRequests(); track req.id) {
            <div
              class="flex flex-col gap-4 p-6 rounded-3xl bg-(--tui-background-elevated) border border-(--tui-border-normal) shadow-md"
            >
              <!-- Request Header -->
              <div
                class="flex flex-wrap items-center justify-between gap-3 border-b pb-3"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="text-xs font-mono font-black text-(--tui-text-secondary)"
                  >
                    #{{ req.id }}
                  </span>
                  <span class="text-base font-black text-(--tui-text-primary)">
                    {{
                      req.area?.name ||
                        ('admin.materialRequests.areaUnknown' | translate)
                    }}
                  </span>
                  <span class="text-xs text-(--tui-text-secondary)">
                    • {{ req.created_at | date: 'dd/MM/yyyy HH:mm' }}
                  </span>
                </div>

                <div class="flex items-center gap-3">
                  <span
                    tuiBadge
                    size="m"
                    [appearance]="getStatusAppearance(req.status)"
                  >
                    {{ 'materialRequests.status.' + req.status | translate }}
                  </span>
                  <span
                    class="text-lg font-black text-(--tui-text-accent) tabular-nums"
                  >
                    {{ req.total_amount | number: '1.2-2' }}€
                  </span>
                </div>
              </div>

              <!-- Requester & Items Grid -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Items list -->
                <div class="md:col-span-2 flex flex-col gap-2">
                  <span
                    class="text-xs font-black uppercase text-(--tui-text-secondary) tracking-wider"
                  >
                    {{ 'admin.materialRequests.requestedItems' | translate }}
                  </span>

                  <div class="flex flex-col gap-2">
                    @for (item of req.items; track item.id) {
                      <div
                        class="flex items-center justify-between p-3 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) text-xs"
                      >
                        <div class="flex items-center gap-3">
                          @if (item.material.image_url) {
                            <img
                              [src]="item.material.image_url"
                              [alt]="item.material.name"
                              class="w-8 h-8 rounded-lg object-cover"
                            />
                          } @else {
                            <div
                              class="w-8 h-8 rounded-lg bg-(--tui-background-neutral-2) flex items-center justify-center"
                            >
                              <tui-icon
                                icon="@tui.hammer"
                                class="w-4 h-4 text-(--tui-text-secondary)"
                              />
                            </div>
                          }
                          <div>
                            <span
                              class="font-bold text-(--tui-text-primary) block"
                            >
                              {{ item.material.name }}
                            </span>
                            <span
                              class="text-[11px] text-(--tui-text-secondary)"
                            >
                              {{ item.quantity }}x
                              {{ item.unit_price | number: '1.2-2' }}€
                            </span>
                          </div>
                        </div>

                        <span class="font-black tabular-nums text-sm">
                          {{
                            item.quantity * item.unit_price | number: '1.2-2'
                          }}€
                        </span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Requester details & notes -->
                <div
                  class="flex flex-col gap-3 p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) text-xs"
                >
                  <span
                    class="text-xs font-black uppercase text-(--tui-text-secondary) tracking-wider"
                  >
                    {{ 'admin.materialRequests.requesterNotes' | translate }}
                  </span>

                  <div class="flex items-center gap-2">
                    <span tuiAvatar size="s">
                      @if (req.user.avatar; as avatar) {
                        <img [src]="avatar | avatarUrl" alt="avatar" />
                      } @else {
                        <tui-icon icon="@tui.user" />
                      }
                    </span>
                    <span class="font-bold">{{
                      req.user.name || ('anonymous' | translate)
                    }}</span>
                  </div>

                  @if (req.notes) {
                    <div
                      class="p-2.5 rounded-xl bg-(--tui-background-base) border text-xs text-(--tui-text-primary)"
                    >
                      <span class="font-bold block mb-1">Notas / Envío:</span>
                      <p class="m-0 whitespace-pre-wrap">{{ req.notes }}</p>
                    </div>
                  } @else {
                    <span class="text-xs text-(--tui-text-secondary) italic">
                      {{ 'admin.materialRequests.noNotes' | translate }}
                    </span>
                  }

                  @if (req.rejection_reason) {
                    <div
                      class="p-2.5 rounded-xl bg-(--tui-background-negative-neutral) border border-(--tui-status-negative) text-xs text-(--tui-status-negative)"
                    >
                      <span class="font-bold block mb-1"
                        >{{
                          'materialRequests.rejectionReason' | translate
                        }}:</span
                      >
                      <p class="m-0">{{ req.rejection_reason }}</p>
                    </div>
                  }
                </div>
              </div>

              <!-- Actions -->
              <div
                class="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-(--tui-border-normal)"
              >
                @if (req.status === 'pending') {
                  <button
                    tuiButton
                    appearance="negative"
                    size="s"
                    type="button"
                    class="rounded-xl!"
                    (click)="openRejectModal(req)"
                  >
                    <tui-icon icon="@tui.x" class="w-4 h-4" />
                    <span>{{
                      'admin.materialRequests.reject' | translate
                    }}</span>
                  </button>

                  <button
                    tuiButton
                    appearance="accent"
                    size="s"
                    type="button"
                    class="rounded-xl!"
                    (click)="updateStatus(req.id, 'approved')"
                  >
                    <tui-icon icon="@tui.check" class="w-4 h-4" />
                    <span>{{
                      'admin.materialRequests.approve' | translate
                    }}</span>
                  </button>
                }

                @if (req.status === 'approved') {
                  <button
                    tuiButton
                    appearance="accent"
                    size="s"
                    type="button"
                    class="rounded-xl!"
                    (click)="updateStatus(req.id, 'disposed')"
                  >
                    <tui-icon icon="@tui.check-check" class="w-4 h-4" />
                    <span>{{
                      'admin.materialRequests.markDelivered' | translate
                    }}</span>
                  </button>
                }
              </div>
            </div>
          } @empty {
            <app-empty-state
              icon="@tui.package-open"
              message="admin.materialRequests.empty"
            />
          }
        }
      </div>

      <!-- Reject Modal -->
      @if (rejectModalOpen()) {
        <div
          class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            class="w-full max-w-md bg-(--tui-background-elevated) rounded-3xl border border-(--tui-border-normal) shadow-2xl p-6 flex flex-col gap-4"
          >
            <div class="flex items-center justify-between border-b pb-3">
              <h3 class="text-lg font-black m-0 text-(--tui-status-negative)">
                {{ 'admin.materialRequests.rejectTitle' | translate }}
              </h3>
              <button
                tuiButton
                appearance="flat"
                size="xs"
                type="button"
                (click)="rejectModalOpen.set(false)"
              >
                <tui-icon icon="@tui.x" />
              </button>
            </div>

            <p class="text-xs text-(--tui-text-secondary) m-0">
              {{ 'admin.materialRequests.rejectHelp' | translate }}
            </p>

            <tui-textfield>
              <label tuiLabel for="rejection-reason-textarea"
                >{{
                  'admin.materialRequests.rejectionReasonLabel' | translate
                }}
                *</label
              >
              <textarea
                id="rejection-reason-textarea"
                tuiTextfield
                rows="3"
                [(ngModel)]="rejectionReason"
                [placeholder]="
                  'admin.materialRequests.rejectionReasonPlaceholder'
                    | translate
                "
              ></textarea>
            </tui-textfield>

            <div class="flex justify-end gap-3 pt-2">
              <button
                tuiButton
                appearance="flat"
                type="button"
                (click)="rejectModalOpen.set(false)"
              >
                {{ 'cancel' | translate }}
              </button>

              <button
                tuiButton
                appearance="negative"
                type="button"
                [disabled]="!rejectionReason().trim()"
                (click)="confirmReject()"
              >
                {{ 'admin.materialRequests.confirmReject' | translate }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMaterialRequestsComponent {
  private readonly requestsService = inject(AreaMaterialRequestsService);

  readonly statusFilters = [
    'all',
    'pending',
    'approved',
    'disposed',
    'rejected',
    'cancelled',
  ];

  selectedStatus = signal<string>('pending');
  rejectModalOpen = signal<boolean>(false);
  rejectingRequestId = signal<number | null>(null);
  rejectionReason = signal<string>('');

  readonly pendingCount = this.requestsService.pendingCount;

  readonly requestsResource = resource<
    AreaMaterialRequestWithDetails[],
    { change: number }
  >({
    params: () => ({ change: this.requestsService.requestsChange() }),
    loader: () => this.requestsService.getAllRequests(),
  });

  readonly allRequests = computed(() => this.requestsResource.value() ?? []);

  readonly filteredRequests = computed(() => {
    const list = this.allRequests();
    const st = this.selectedStatus();
    if (st === 'all') return list;
    return list.filter((r) => r.status === st);
  });

  getStatusAppearance(status: MaterialRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'accent';
      case 'disposed':
        return 'positive';
      case 'cancelled':
        return 'neutral';
      case 'rejected':
        return 'negative';
      default:
        return 'neutral';
    }
  }

  async updateStatus(
    requestId: number,
    status: MaterialRequestStatus,
  ): Promise<void> {
    const ok = await this.requestsService.updateRequestStatus(
      requestId,
      status,
    );
    if (ok) {
      void this.requestsResource.reload();
    }
  }

  openRejectModal(req: AreaMaterialRequestWithDetails): void {
    this.rejectingRequestId.set(req.id);
    this.rejectionReason.set('');
    this.rejectModalOpen.set(true);
  }

  async confirmReject(): Promise<void> {
    const id = this.rejectingRequestId();
    const reason = this.rejectionReason().trim();
    if (!id || !reason) return;

    const ok = await this.requestsService.updateRequestStatus(
      id,
      'rejected',
      reason,
    );
    if (ok) {
      this.rejectModalOpen.set(false);
      this.rejectingRequestId.set(null);
      void this.requestsResource.reload();
    }
  }
}
