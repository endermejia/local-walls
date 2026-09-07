import { DatePipe, UpperCasePipe } from '@angular/common';
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

import { TuiTable } from '@taiga-ui/addon-table';
import {
  TuiAppearance,
  TuiButton,
  TuiDialogService,
  TuiIcon,
  TuiInput,
  TuiLink,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadge,
  TuiBadgeNotification,
  TuiBadgedContentComponent,
  TuiBadgedContentDirective,
  TuiCopy,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import {
  AppErrorLog,
  ErrorLogService,
  ErrorSeverity,
} from '../../services/error-log.service';
import { ToastService } from '../../services/toast.service';

import { EmptyStateComponent } from '../../components/ui/empty-state';

import { AvatarUrlPipe } from '../../pipes';
import { matchesQuery } from '../../utils';

@Component({
  selector: 'app-admin-error-logs',
  standalone: true,
  imports: [
    AvatarUrlPipe,
    DatePipe,
    EmptyStateComponent,
    FormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadge,
    TuiBadgedContentComponent,
    TuiBadgedContentDirective,
    TuiBadgeNotification,
    TuiButton,
    TuiCopy,
    TuiHeader,
    TuiIcon,
    TuiInput,
    TuiLink,
    TuiLoader,
    TuiScrollbar,
    TuiTable,
    TuiTextfield,
    TuiTitle,
    UpperCasePipe,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <div class="p-4 flex flex-col gap-4 max-w-5xl mx-auto w-full">
        <header
          tuiHeader
          class="flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 tuiTitle>
              <a
                routerLink="/admin"
                class="no-underline text-inherit flex items-center gap-2"
              >
                <tui-icon icon="@tui.arrow-left" />
                <tui-badged-content [style.--tui-radius.%]="50">
                  @if (totalCount(); as logsCount) {
                    <ng-container tuiSlot="top">
                      <tui-badge-notification tuiAppearance="accent" size="s">
                        {{ logsCount }}
                      </tui-badge-notification>
                    </ng-container>
                  }
                  <div
                    class="w-11 h-11 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0"
                  >
                    <tui-icon icon="@tui.triangle-alert" />
                  </div>
                </tui-badged-content>

                {{ 'admin.errorLogs.title' | translate }}
              </a>
            </h1>
            <p class="text-sm text-(--tui-text-secondary) mt-1">
              {{ 'admin.errorLogs.description' | translate }}
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <button
              tuiButton
              appearance="flat"
              size="s"
              iconStart="@tui.copy"
              type="button"
              [disabled]="!filteredLogs().length"
              (click)="copyAllLogs()"
            >
              {{ 'admin.errorLogs.copyAll' | translate }}
            </button>

            <button
              tuiButton
              appearance="flat"
              size="s"
              iconStart="@tui.refresh-cw"
              type="button"
              (click)="reloadLogs()"
            >
              {{ 'admin.errorLogs.refresh' | translate }}
            </button>

            <button
              tuiButton
              appearance="destructive"
              size="s"
              iconStart="@tui.trash-2"
              type="button"
              [disabled]="!logs().length"
              (click)="confirmClearLogs()"
            >
              {{ 'admin.errorLogs.clearAll' | translate }}
            </button>
          </div>
        </header>

        <!-- Controls & Filters -->
        <div
          class="flex flex-wrap items-center justify-between gap-4 bg-(--tui-background-base) p-4 rounded-2xl border border-(--tui-border-normal)"
        >
          <div class="flex-1 min-w-[240px]">
            <tui-textfield appearance="floating" tuiTextfieldSize="m">
              <label tuiLabel for="search-errors">{{
                'search' | translate
              }}</label>
              <input
                tuiInput
                id="search-errors"
                type="text"
                [(ngModel)]="searchQuery"
              />
            </tui-textfield>
          </div>

          <!-- Severity Filter Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- All -->
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer font-medium"
              [class.bg-slate-900]="selectedSeverity() === 'all'"
              [class.border-slate-900]="selectedSeverity() === 'all'"
              [class.text-white]="selectedSeverity() === 'all'"
              [class.dark:bg-slate-100]="selectedSeverity() === 'all'"
              [class.dark:border-slate-100]="selectedSeverity() === 'all'"
              [class.dark:text-slate-900]="selectedSeverity() === 'all'"
              [class.bg-(--tui-background-neutral-1)]="
                selectedSeverity() !== 'all'
              "
              [class.border-(--tui-border-normal)]="
                selectedSeverity() !== 'all'
              "
              [class.text-(--tui-text-secondary)]="selectedSeverity() !== 'all'"
              (click)="selectedSeverity.set('all')"
            >
              <span>{{ 'admin.errorLogs.severities.all' | translate }}</span>
              <span
                class="px-1.5 py-0.5 text-[10px] rounded-full"
                [class.bg-slate-700]="selectedSeverity() === 'all'"
                [class.text-white]="selectedSeverity() === 'all'"
                [class.dark:bg-slate-300]="selectedSeverity() === 'all'"
                [class.dark:text-slate-900]="selectedSeverity() === 'all'"
                [class.bg-(--tui-background-base)]="
                  selectedSeverity() !== 'all'
                "
              >
                {{ totalCount() }}
              </span>
            </button>

            <!-- Critical -->
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer font-medium"
              [class.bg-red-600]="selectedSeverity() === 'critical'"
              [class.border-red-600]="selectedSeverity() === 'critical'"
              [class.text-white]="selectedSeverity() === 'critical'"
              [class.shadow-xs]="selectedSeverity() === 'critical'"
              [class.bg-red-500/10]="selectedSeverity() !== 'critical'"
              [class.border-red-500/20]="selectedSeverity() !== 'critical'"
              [class.text-red-600]="selectedSeverity() !== 'critical'"
              [class.dark:text-red-400]="selectedSeverity() !== 'critical'"
              (click)="selectedSeverity.set('critical')"
            >
              <span>{{
                'admin.errorLogs.severities.critical' | translate
              }}</span>
              <span
                class="px-1.5 py-0.5 text-[10px] rounded-full"
                [class.bg-red-700]="selectedSeverity() === 'critical'"
                [class.text-white]="selectedSeverity() === 'critical'"
                [class.bg-red-500/20]="selectedSeverity() !== 'critical'"
              >
                {{ criticalCount() }}
              </span>
            </button>

            <!-- Error -->
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer font-medium"
              [class.bg-amber-500]="selectedSeverity() === 'error'"
              [class.border-amber-500]="selectedSeverity() === 'error'"
              [class.text-white]="selectedSeverity() === 'error'"
              [class.shadow-xs]="selectedSeverity() === 'error'"
              [class.bg-amber-500/10]="selectedSeverity() !== 'error'"
              [class.border-amber-500/20]="selectedSeverity() !== 'error'"
              [class.text-amber-600]="selectedSeverity() !== 'error'"
              [class.dark:text-amber-400]="selectedSeverity() !== 'error'"
              (click)="selectedSeverity.set('error')"
            >
              <span>{{ 'admin.errorLogs.severities.error' | translate }}</span>
              <span
                class="px-1.5 py-0.5 text-[10px] rounded-full"
                [class.bg-amber-600]="selectedSeverity() === 'error'"
                [class.text-white]="selectedSeverity() === 'error'"
                [class.bg-amber-500/20]="selectedSeverity() !== 'error'"
              >
                {{ errorCount() }}
              </span>
            </button>

            <!-- Warning -->
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-1.5 cursor-pointer font-medium"
              [class.bg-blue-600]="selectedSeverity() === 'warning'"
              [class.border-blue-600]="selectedSeverity() === 'warning'"
              [class.text-white]="selectedSeverity() === 'warning'"
              [class.shadow-xs]="selectedSeverity() === 'warning'"
              [class.bg-blue-500/10]="selectedSeverity() !== 'warning'"
              [class.border-blue-500/20]="selectedSeverity() !== 'warning'"
              [class.text-blue-600]="selectedSeverity() !== 'warning'"
              [class.dark:text-blue-400]="selectedSeverity() !== 'warning'"
              (click)="selectedSeverity.set('warning')"
            >
              <span>{{
                'admin.errorLogs.severities.warning' | translate
              }}</span>
              <span
                class="px-1.5 py-0.5 text-[10px] rounded-full"
                [class.bg-blue-700]="selectedSeverity() === 'warning'"
                [class.text-white]="selectedSeverity() === 'warning'"
                [class.bg-blue-500/20]="selectedSeverity() !== 'warning'"
              >
                {{ warningCount() }}
              </span>
            </button>
          </div>

          <!-- Sort By Segmented Control -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-(--tui-text-tertiary)"
              >{{ 'admin.errorLogs.sortBy' | translate }}:</span
            >
            <div
              class="flex items-center p-1 rounded-xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) gap-1"
            >
              <button
                type="button"
                class="px-3 py-1 rounded-lg text-xs transition-all cursor-pointer font-medium"
                [class.bg-(--tui-background-base)]="sortBy() === 'severity'"
                [class.text-(--tui-text-primary)]="sortBy() === 'severity'"
                [class.shadow-xs]="sortBy() === 'severity'"
                [class.text-(--tui-text-secondary)]="sortBy() !== 'severity'"
                (click)="sortBy.set('severity')"
              >
                {{ 'admin.errorLogs.sortSeverity' | translate }}
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded-lg text-xs transition-all cursor-pointer font-medium"
                [class.bg-(--tui-background-base)]="sortBy() === 'date'"
                [class.text-(--tui-text-primary)]="sortBy() === 'date'"
                [class.shadow-xs]="sortBy() === 'date'"
                [class.text-(--tui-text-secondary)]="sortBy() !== 'date'"
                (click)="sortBy.set('date')"
              >
                {{ 'admin.errorLogs.sortDate' | translate }}
              </button>
            </div>
          </div>
        </div>

        <!-- Logs List -->
        @if (errorResource.isLoading()) {
          <div class="m-auto py-12 flex justify-center">
            <tui-loader size="xxl" />
          </div>
        } @else if (!filteredLogs().length) {
          <app-empty-state
            title="admin.errorLogs.emptyTitle"
            description="admin.errorLogs.emptyDescription"
          />
        } @else {
          <div class="flex flex-col gap-3">
            @for (log of filteredLogs(); track log.id) {
              <div
                class="p-4 rounded-2xl border border-(--tui-border-normal) bg-(--tui-background-base) flex flex-col gap-2 transition-all"
                [class.border-red-500]="log.severity === 'critical'"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2 flex-wrap">
                    <!-- Severity Badge -->
                    <span
                      tuiBadge
                      size="s"
                      [appearance]="getSeverityAppearance(log.severity)"
                    >
                      {{
                        'admin.errorLogs.severities.' + log.severity
                          | translate
                          | uppercase
                      }}
                    </span>

                    @if (log.context) {
                      <span
                        class="px-2 py-0.5 text-xs rounded-lg font-mono bg-(--tui-background-neutral-1) text-(--tui-text-secondary)"
                      >
                        {{ log.context }}
                      </span>
                    }

                    @if (log.code) {
                      <span
                        class="text-xs font-mono px-2 py-0.5 rounded bg-(--tui-background-neutral-1) text-(--tui-text-secondary)"
                      >
                        Code: {{ log.code }}
                      </span>
                    }
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="text-xs text-(--tui-text-tertiary)">
                      {{ log.created_at | date: 'medium' }}
                    </span>

                    <button
                      tuiButton
                      appearance="flat"
                      size="xs"
                      iconStart="@tui.copy"
                      type="button"
                      [title]="'copy' | translate"
                      (click)="copySingleLog(log)"
                    >
                      {{ 'copy' | translate }}
                    </button>
                  </div>
                </div>

                <!-- Error Message with Taiga Copy Component -->
                <tui-copy class="max-w-full">
                  <p
                    class="font-bold text-base text-(--tui-text-primary) break-words font-mono"
                  >
                    {{ log.message }}
                  </p>
                </tui-copy>

                <!-- Meta Info -->
                <div
                  class="flex flex-wrap items-center gap-4 text-xs text-(--tui-text-secondary)"
                >
                  @if (log.url) {
                    <span class="truncate max-w-md">
                      📍 <strong>URL:</strong> {{ log.url }}
                    </span>
                  }
                  @if (log.user_id) {
                    <div class="flex items-center gap-2">
                      <a
                        [routerLink]="['/profile', log.user_id]"
                        class="shrink-0 flex items-center"
                      >
                        <span
                          tuiAvatar
                          size="xs"
                          class="rounded-full! overflow-hidden ring-1 ring-(--tui-border-normal)"
                        >
                          @if (log.user_profile?.avatar; as avatar) {
                            <img
                              [src]="avatar | avatarUrl"
                              [alt]="log.user_profile.name || 'Avatar'"
                              class="w-full h-full object-cover rounded-full!"
                            />
                          } @else {
                            <tui-icon icon="@tui.user" />
                          }
                        </span>
                      </a>
                      <a
                        tuiLink
                        [routerLink]="['/profile', log.user_id]"
                        class="font-medium truncate text-xs"
                      >
                        {{ log.user_profile?.name || log.user_id }}
                      </a>
                    </div>
                  }
                </div>

                <!-- Expandable Stack Trace -->
                @if (log.stack) {
                  <details class="mt-2 text-xs">
                    <summary
                      class="cursor-pointer text-(--tui-text-action) hover:underline font-semibold"
                    >
                      {{ 'admin.errorLogs.viewStack' | translate }}
                    </summary>
                    <pre
                      class="mt-2 p-3 bg-(--tui-background-neutral-1) rounded-xl overflow-x-auto text-[11px] font-mono text-(--tui-text-secondary) leading-relaxed"
                      >{{ log.stack }}
                  </pre>
                  </details>
                }
              </div>
            }
          </div>
        }
      </div>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class AdminErrorLogsComponent {
  private readonly errorLogService = inject(ErrorLogService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal('');
  readonly selectedSeverity = signal<'all' | ErrorSeverity>('all');
  readonly sortBy = signal<'severity' | 'date'>('severity');

  readonly errorResource = resource({
    loader: async () => {
      return this.errorLogService.fetchLogs();
    },
  });

  readonly logs = computed(() => this.errorResource.value() ?? []);

  readonly totalCount = computed(() => this.logs().length);
  readonly criticalCount = computed(
    () => this.logs().filter((l) => l.severity === 'critical').length,
  );
  readonly errorCount = computed(
    () => this.logs().filter((l) => l.severity === 'error').length,
  );
  readonly warningCount = computed(
    () => this.logs().filter((l) => l.severity === 'warning').length,
  );

  readonly filteredLogs = computed(() => {
    const query = this.searchQuery();
    const severity = this.selectedSeverity();
    const sort = this.sortBy();
    let list = this.logs();

    if (severity !== 'all') {
      list = list.filter((l) => l.severity === severity);
    }

    if (query.trim()) {
      list = list.filter(
        (l) =>
          matchesQuery(l.message, query) ||
          matchesQuery(l.code ?? '', query) ||
          matchesQuery(l.context ?? '', query) ||
          matchesQuery(l.url ?? '', query) ||
          matchesQuery(l.user_profile?.name ?? '', query) ||
          matchesQuery(l.user_id ?? '', query),
      );
    }

    return this.errorLogService.sortLogs(list, sort);
  });

  reloadLogs(): void {
    this.errorResource.reload();
  }

  formatSingleLog(log: AppErrorLog): string {
    const userStr = log.user_id
      ? log.user_profile?.name
        ? `${log.user_profile.name} (${log.user_id})`
        : log.user_id
      : '';
    return (
      `[${log.severity.toUpperCase()}] ${log.created_at}\n` +
      `Message: ${log.message}\n` +
      (log.context ? `Context: ${log.context}\n` : '') +
      (log.code ? `Code: ${log.code}\n` : '') +
      (log.url ? `URL: ${log.url}\n` : '') +
      (userStr ? `User: ${userStr}\n` : '') +
      (log.stack ? `Stack:\n${log.stack}` : '')
    );
  }

  copySingleLog(log: AppErrorLog): void {
    const formatted = this.formatSingleLog(log);
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(formatted);
      this.toast.success(
        this.translate.instant('admin.errorLogs.copiedSingleSuccess'),
      );
    }
  }

  copyAllLogs(): void {
    const logs = this.filteredLogs();
    if (!logs.length) return;

    const formatted = logs
      .map((log, i) => `=== ERROR #${i + 1} ===\n${this.formatSingleLog(log)}`)
      .join('\n\n========================================\n\n');

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(formatted);
      this.toast.success(
        this.translate.instant('admin.errorLogs.copiedAllSuccess'),
      );
    }
  }

  getSeverityAppearance(severity: ErrorSeverity): string {
    switch (severity) {
      case 'critical':
        return 'negative';
      case 'error':
        return 'warning';
      case 'warning':
        return 'info';
      default:
        return 'neutral';
    }
  }

  async confirmClearLogs(): Promise<void> {
    const data: TuiConfirmData = {
      content: this.translate.instant('admin.errorLogs.confirmClearText'),
      yes: this.translate.instant('accept'),
      no: this.translate.instant('cancel'),
    };

    const confirm = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.errorLogs.confirmClearTitle'),
        data,
      }),
      { defaultValue: false },
    );

    if (confirm) {
      await this.errorLogService.clearErrors();
      this.reloadLogs();
      this.toast.success(
        this.translate.instant('admin.errorLogs.clearedSuccess'),
      );
    }
  }
}

export default AdminErrorLogsComponent;
