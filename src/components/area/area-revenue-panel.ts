import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  TemplateRef,
  viewChild,
} from '@angular/core';

import {
  TuiAppearance,
  TuiButton,
  TuiDialogContext,
  TuiDialogService,
  TuiHint,
  TuiIcon,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiAvatar, TuiBadge, TuiProgress, TuiSkeleton } from '@taiga-ui/kit';
import { TuiCard, TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AreaDonationsService } from '../../services/area-donations.service';
import { AreaMaterialRequestsService } from '../../services/area-material-requests.service';
import { AreaRevenueService } from '../../services/area-revenue.service';
import { AuthStateService } from '../../services/auth-state.service';

import { EmptyStateComponent } from '../ui/empty-state';

import type { AreaBalanceSummary, AreaPublicTimeline } from '../../models';

@Component({
  selector: 'app-area-revenue-panel',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    EmptyStateComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiButton,
    TuiCard,
    TuiHeader,
    TuiHint,
    TuiIcon,
    TuiProgress,
    TuiScrollbar,
    TuiSkeleton,
  ],
  styles: `
    :host {
      display: block;
      margin-bottom: 1.5rem;
    }

    .label-wrapper {
      inline-size: 100%;
      text-shadow: 0 0 0.25rem #000;
      color: var(--tui-text-primary-on-accent-1);
    }
  `,
  template: `
    <section
      tuiCardLarge="compact"
      appearance="outline"
      class="select-none transition-shadow hover:shadow-xs"
    >
      <!-- Cabecera principal -->
      <header
        tuiHeader="body-m"
        class="flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pb-1"
      >
        <div class="w-full sm:w-auto sm:flex-1">
          <h2
            class="flex items-center gap-2 m-0 text-base sm:text-lg font-bold"
          >
            <tui-icon icon="@tui.coins" class="text-amber-500 shrink-0" />
            <span class="break-words">{{
              'areaRevenue.title' | translate
            }}</span>
          </h2>
          <p
            tuiSubtitle
            class="m-0 text-xs text-(--tui-text-secondary) break-words mt-0.5"
          >
            {{ 'areaRevenue.subtitle' | translate }}
          </p>
        </div>

        <!-- Acciones para administradores en la cabecera (debajo en pantallas pequeñas, a la derecha en sm+) -->
        @if (canManageArea()) {
          <aside
            tuiAccessories
            class="w-full sm:w-auto flex items-center justify-start sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0"
          >
            <button
              appearance="secondary"
              size="s"
              tuiButton
              type="button"
              iconStart="@tui.hammer"
              [disabled]="(balance()?.availableBalance ?? 0) <= 0"
              (click)="openMaterialRequestDialog()"
            >
              {{ 'areaRevenue.request' | translate }}
            </button>
            <button
              appearance="action"
              size="s"
              tuiButton
              type="button"
              iconStart="@tui.history"
              (click)="openHistoryDialog()"
            >
              {{ 'areaRevenue.history' | translate }}
            </button>
          </aside>
        }
      </header>

      <div class="flex flex-col gap-4 sm:gap-5 pt-3">
        <!-- 1. Bloque superior asimétrico -->
        <div
          class="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-stretch w-full"
        >
          <!-- Tarjeta destacada Saldo Actual (Izquierda) -->
          <div
            class="md:col-span-7 lg:col-span-8 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 gap-4"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div
                  class="flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 text-2xl sm:text-3xl"
                >
                  <tui-icon icon="@tui.coins" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-xs sm:text-sm font-semibold text-(--tui-text-secondary)"
                  >
                    {{ 'areaRevenue.currentPotBalance' | translate }}
                  </span>
                  @if (balanceResource.isLoading()) {
                    <span
                      [tuiSkeleton]="true"
                      class="w-32 h-8 sm:h-10 rounded mt-1"
                    ></span>
                  } @else {
                    <span
                      class="text-2xl sm:text-4xl font-black text-(--tui-text-primary) tabular-nums tracking-tight"
                    >
                      {{ balance()?.availableBalance || 0 | number: '1.2-2' }} €
                    </span>
                  }
                </div>
              </div>
            </div>

            <!-- Botón de contribución integrado directamente bajo el saldo principal (responsive) -->
            <button
              tuiButton
              type="button"
              class="w-full rounded-xl !whitespace-normal !h-auto min-h-11 py-2.5 px-3 text-xs sm:text-sm md:text-base font-bold text-white shadow-sm transition-transform active:scale-[0.99] flex items-center justify-center text-center leading-snug cursor-pointer"
              style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);"
              (click)="openDonationDialog()"
            >
              {{ 'areaRevenue.contributeButton' | translate }}
            </button>
          </div>

          <!-- Columna derecha: tarjetas métricas apiladas -->
          <div
            class="md:col-span-5 lg:col-span-4 flex flex-col justify-between gap-2.5 sm:gap-3"
          >
            <!-- 1. Total recaudado -->
            <div
              class="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 active:scale-[0.99]"
              (click)="openDonationsHistoryDialog()"
              (keydown.enter)="openDonationsHistoryDialog()"
              tabindex="0"
              role="button"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0"
                >
                  <tui-icon icon="@tui.heart" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-[11px] sm:text-xs font-medium text-(--tui-text-secondary) truncate"
                  >
                    {{ 'areaRevenue.totalRaised' | translate }}
                  </span>
                  @if (balanceResource.isLoading()) {
                    <span
                      [tuiSkeleton]="true"
                      class="w-16 h-5 rounded mt-0.5"
                    ></span>
                  } @else {
                    <span
                      class="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300 tabular-nums"
                    >
                      +{{ totalRaised() | number: '1.2-2' }} €
                    </span>
                  }
                </div>
              </div>

              <button
                appearance="action"
                size="xs"
                tuiIconButton
                type="button"
                iconStart="@tui.history"
                [attr.aria-label]="'areaRevenue.recentDonations' | translate"
                (click)="$event.stopPropagation(); openDonationsHistoryDialog()"
              >
                {{ 'areaRevenue.history' | translate }}
              </button>
            </div>

            <!-- 2. Material suministrado -->
            <div
              class="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 active:scale-[0.99]"
              (click)="openMaterialHistoryDialog()"
              (keydown.enter)="openMaterialHistoryDialog()"
              tabindex="0"
              role="button"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0"
                >
                  <tui-icon icon="@tui.hammer" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span
                    class="text-[11px] sm:text-xs font-medium text-(--tui-text-secondary) truncate"
                  >
                    {{ 'areaRevenue.material' | translate }}
                  </span>
                  @if (balanceResource.isLoading()) {
                    <span
                      [tuiSkeleton]="true"
                      class="w-16 h-5 rounded mt-0.5"
                    ></span>
                  } @else {
                    <span
                      class="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300 tabular-nums"
                    >
                      -
                      {{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }} €
                    </span>
                  }
                </div>
              </div>

              <button
                appearance="action"
                size="xs"
                tuiIconButton
                type="button"
                iconStart="@tui.history"
                [attr.aria-label]="'areaRevenue.deliveredEquipment' | translate"
                (click)="$event.stopPropagation(); openMaterialHistoryDialog()"
              >
                {{ 'areaRevenue.history' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- 2. Barra de progreso de meta -->
        <div class="flex flex-col gap-2 pt-1 select-none">
          <div
            class="flex items-center justify-between text-xs sm:text-sm font-medium gap-2"
          >
            <div class="flex items-center gap-1.5 flex-wrap min-w-0">
              <span class="text-(--tui-text-primary) font-semibold truncate">
                {{
                  'areaRevenue.nextGoal' | translate: { target: goal().target }
                }}
              </span>
              <tui-icon
                tuiAppearance="action-grayscale"
                icon="@tui.info"
                [tuiHint]="'areaRevenue.goalSupplyInfo' | translate"
              />
            </div>
            <span
              class="text-(--tui-text-primary) font-bold tabular-nums shrink-0"
            >
              {{ goal().current | number: '1.0-0' }} € /
              {{ goal().target | number: '1.0-0' }} €
            </span>
          </div>

          <label tuiProgressLabel class="label-wrapper">
            {{ goal().percentage }}%
            <progress
              color="var(--tui-status-positive)"
              [max]="goal().target"
              size="l"
              tuiProgressBar
              [value]="goal().current"
            ></progress>
          </label>
        </div>
      </div>
    </section>

    <!-- Dialog: Historial de donaciones -->
    <ng-template #donationsDialog let-observer>
      <div class="flex flex-col gap-3 max-h-[75vh]">
        <div
          class="flex items-center justify-between pb-2 border-b border-(--tui-border-normal)"
        >
          <div class="flex items-center gap-2">
            <tui-icon icon="@tui.heart" class="text-emerald-500 shrink-0" />
            <span class="font-bold text-sm text-(--tui-text-primary)">
              {{ 'areaRevenue.totalRaised' | translate }}
            </span>
          </div>
          <span appearance="positive" size="s" tuiBadge>
            +{{ totalRaised() | number: '1.2-2' }} €
          </span>
        </div>

        <tui-scrollbar class="max-h-[60vh] pr-1">
          <div class="flex flex-col gap-2">
            @if (timelineResource.isLoading()) {
              @for (_ of [1, 2, 3]; track $index) {
                <div [tuiSkeleton]="true" class="h-16 rounded-xl"></div>
              }
            } @else {
              @for (d of donationsList(); track d.id) {
                <div
                  class="flex items-start justify-between gap-3 p-3 rounded-lg bg-(--tui-background-base) border border-(--tui-border-normal)"
                >
                  <div class="flex items-start gap-2.5 min-w-0">
                    <span
                      tuiAvatar
                      size="s"
                      [appearance]="d.anonymous ? 'neutral' : 'accent'"
                      class="shrink-0 mt-0.5"
                    >
                      <tui-icon
                        [icon]="d.anonymous ? '@tui.user' : '@tui.heart'"
                      />
                    </span>
                    <div class="flex flex-col min-w-0">
                      <span
                        class="text-xs font-bold truncate text-(--tui-text-primary)"
                      >
                        {{
                          d.anonymous
                            ? ('donations.anonymous' | translate)
                            : d.userName || ('donations.anonymous' | translate)
                        }}
                      </span>
                      @if (d.message) {
                        <span
                          class="text-xs text-(--tui-text-secondary) italic line-clamp-2 mt-0.5"
                        >
                          "{{ d.message }}"
                        </span>
                      }
                      <span
                        class="text-[10px] text-(--tui-text-secondary) mt-1"
                      >
                        {{ d.createdAt | date: 'dd/MM/yyyy' }}
                      </span>
                    </div>
                  </div>

                  <span
                    appearance="positive"
                    size="s"
                    tuiBadge
                    class="shrink-0 font-bold tabular-nums"
                  >
                    +{{ d.amount | number: '1.2-2' }} €
                  </span>
                </div>
              } @empty {
                <app-empty-state
                  icon="@tui.heart"
                  message="areaRevenue.noDonationsYet"
                  class="py-4"
                />
              }
            }
          </div>
        </tui-scrollbar>
      </div>
    </ng-template>

    <!-- Dialog: Historial de material suministrado -->
    <ng-template #materialDialog let-observer>
      <div class="flex flex-col gap-3 max-h-[75vh]">
        <div
          class="flex items-center justify-between pb-2 border-b border-(--tui-border-normal)"
        >
          <div class="flex items-center gap-2">
            <tui-icon icon="@tui.hammer" class="text-blue-500 shrink-0" />
            <span class="font-bold text-sm text-(--tui-text-primary)">
              {{ 'areaRevenue.material' | translate }}
            </span>
          </div>
          <span
            appearance="secondary"
            size="s"
            tuiBadge
            class="font-bold tabular-nums !text-blue-600 dark:!text-blue-400"
          >
            -{{ balance()?.totalWithdrawn || 0 | number: '1.2-2' }} €
          </span>
        </div>

        <tui-scrollbar class="max-h-[60vh] pr-1">
          <div class="flex flex-col gap-2">
            @if (timelineResource.isLoading()) {
              @for (_ of [1, 2, 3]; track $index) {
                <div [tuiSkeleton]="true" class="h-16 rounded-xl"></div>
              }
            } @else {
              @for (m of withdrawalsList(); track m.id) {
                <div
                  class="flex flex-col gap-2 p-3 rounded-lg bg-(--tui-background-base) border border-(--tui-border-normal)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-2.5 min-w-0">
                      <span
                        tuiAvatar
                        size="s"
                        appearance="neutral"
                        class="shrink-0 mt-0.5"
                      >
                        <tui-icon icon="@tui.package" />
                      </span>
                      <div class="flex flex-col min-w-0">
                        <span
                          class="text-xs font-bold text-(--tui-text-primary) truncate"
                        >
                          @if (m.items.length === 1) {
                            {{ m.items[0].quantity }}x
                            {{ m.items[0].materialName }}
                          } @else {
                            {{
                              m.items[0]?.materialName ||
                                ('areaRevenue.materialBatch' | translate)
                            }}
                          }
                        </span>
                        @if (m.items.length > 1) {
                          <span class="text-[11px] text-(--tui-text-secondary)">
                            +{{ m.items.length - 1 }}
                            {{ 'areaRevenue.moreItems' | translate }}
                          </span>
                        }
                        <span
                          class="text-[10px] text-(--tui-text-secondary) mt-1"
                        >
                          {{ m.reviewedAt || m.createdAt | date: 'dd/MM/yyyy' }}
                        </span>
                      </div>
                    </div>

                    <span
                      appearance="secondary"
                      size="s"
                      tuiBadge
                      class="shrink-0 font-bold tabular-nums !text-blue-600 dark:!text-blue-400"
                    >
                      -{{ m.totalAmount | number: '1.2-2' }} €
                    </span>
                  </div>

                  @if (m.items.length > 1) {
                    <div
                      class="flex flex-col gap-1 pl-9 pt-1.5 border-t border-(--tui-border-normal)/60 text-xs text-(--tui-text-secondary)"
                    >
                      @for (item of m.items; track $index) {
                        <div class="flex items-center justify-between">
                          <span
                            >{{ item.quantity }}x {{ item.materialName }}</span
                          >
                          <span class="tabular-nums font-medium"
                            >{{
                              item.unitPrice * item.quantity | number: '1.2-2'
                            }}
                            €</span
                          >
                        </div>
                      }
                    </div>
                  }
                </div>
              } @empty {
                <app-empty-state
                  icon="@tui.hammer"
                  message="areaRevenue.noMaterialDeliveredYet"
                  class="py-4"
                />
              }
            }
          </div>
        </tui-scrollbar>
      </div>
    </ng-template>
  `,
  host: { class: 'block mb-6' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaRevenuePanelComponent {
  readonly areaId = input.required<number>();
  readonly areaName = input<string>('');
  readonly isPaywalled = input<boolean>(false);
  readonly areaPrice = input<number>(0);
  readonly isPurchased = input<boolean>(false);
  readonly toposCount = input<number>(0);

  private readonly donationsDialog =
    viewChild<TemplateRef<TuiDialogContext<void>>>('donationsDialog');
  private readonly materialDialog =
    viewChild<TemplateRef<TuiDialogContext<void>>>('materialDialog');

  private readonly revenueService = inject(AreaRevenueService);
  private readonly donationsService = inject(AreaDonationsService);
  private readonly requestsService = inject(AreaMaterialRequestsService);
  private readonly authState = inject(AuthStateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly canManageArea = computed(() => {
    const id = this.areaId();
    return (
      this.authState.canEditAsAdmin() ||
      !!this.authState.areaAdminPermissions()[id]
    );
  });

  readonly balanceResource = resource<
    AreaBalanceSummary | null,
    { areaId: number; change: number }
  >({
    params: () => ({
      areaId: this.areaId(),
      change: this.requestsService.requestsChange(),
    }),
    loader: ({ params }) => this.revenueService.getAreaBalance(params.areaId),
  });

  readonly timelineResource = resource<
    AreaPublicTimeline | null,
    { areaId: number; change: number }
  >({
    params: () => ({
      areaId: this.areaId(),
      change: this.requestsService.requestsChange(),
    }),
    loader: ({ params }) =>
      this.revenueService.getAreaPublicTimeline(params.areaId),
  });

  readonly balance = computed(() => this.balanceResource.value());
  readonly totalRaised = computed(
    () =>
      (this.balance()?.totalPurchasesNet || 0) +
      (this.balance()?.totalDonationsNet || 0),
  );
  readonly timeline = computed(() => this.timelineResource.value());

  readonly donationsList = computed(() => this.timeline()?.donations ?? []);
  readonly withdrawalsList = computed(() => this.timeline()?.withdrawals ?? []);

  readonly goal = computed(() => {
    const current = this.balance()?.availableBalance ?? 0;
    const step = 300;
    const target = Math.max(
      step,
      Math.ceil((current > 0 ? current : 1) / step) * step,
    );
    const percentage = Math.min(
      100,
      Math.max(0, Math.round((current / target) * 100)),
    );
    return {
      current,
      target,
      percentage,
    };
  });

  openDonationDialog(): void {
    this.donationsService.openDonationDialog(this.areaId(), this.areaName(), {
      areaPrice: this.areaPrice(),
      isPurchased: this.isPurchased(),
      isPaywalled: this.isPaywalled(),
      toposCount: this.toposCount(),
    });
  }

  openDonationsHistoryDialog(): void {
    const template = this.donationsDialog();
    if (!template) return;
    void firstValueFrom(
      this.dialogs.open(template, {
        label: this.translate.instant('areaRevenue.recentDonations'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  openMaterialHistoryDialog(): void {
    const template = this.materialDialog();
    if (!template) return;
    void firstValueFrom(
      this.dialogs.open(template, {
        label: this.translate.instant('areaRevenue.deliveredEquipment'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  async openMaterialRequestDialog(): Promise<void> {
    const available = this.balance()?.availableBalance ?? 0;
    const ok = await this.requestsService.openMaterialRequestDialog(
      this.areaId(),
      this.areaName(),
      available,
    );
    if (ok) {
      void this.balanceResource.reload();
      void this.timelineResource.reload();
    }
  }

  openHistoryDialog(): void {
    this.requestsService.openHistoryDialog(this.areaId(), this.areaName());
  }
}
