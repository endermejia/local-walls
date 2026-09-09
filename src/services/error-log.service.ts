import { inject, Injectable, signal } from '@angular/core';

import { IS_BROWSER } from '../app/is-browser';
import { LocalStorage } from './local-storage';
import { SupabaseService } from './supabase.service';

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface AppErrorLogUser {
  id: string;
  name: string | null;
  avatar: string | null;
}

export interface AppErrorLog {
  id: string;
  created_at: string;
  message: string;
  stack?: string | null;
  url?: string | null;
  user_id?: string | null;
  severity: ErrorSeverity;
  code?: string | null;
  context?: string | null;
  user_profile?: AppErrorLogUser | null;
}

const SEVERITY_WEIGHT: Record<ErrorSeverity, number> = {
  critical: 4,
  error: 3,
  warning: 2,
  info: 1,
};

@Injectable({
  providedIn: 'root',
})
export class ErrorLogService {
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly localStorage = inject(LocalStorage);
  private readonly supabase = inject(SupabaseService);
  private readonly storageKey = 'app_error_logs_v3';

  readonly logs = signal<AppErrorLog[]>([]);

  constructor() {
    if (this.isBrowser) {
      this.logs.set(this.loadLocalLogs());
    }
  }

  async logError(
    error: unknown,
    severity: ErrorSeverity = 'error',
    context?: string,
  ): Promise<void> {
    if (!this.isBrowser) return;

    const { message, code, stack } = this.unwrapError(error);

    // Ignore empty/blank error messages or empty JSON that have no actionable information
    const trimmed = message.trim();
    if (
      !trimmed ||
      trimmed === '{"message":""}' ||
      trimmed === '{}' ||
      trimmed === 'null' ||
      trimmed === 'undefined'
    ) {
      return;
    }

    const userId = this.supabase.authUserId();
    const profile = this.supabase.userProfile();
    const newLog: AppErrorLog = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      message,
      stack,
      url: window.location.href,
      user_id: userId || null,
      severity,
      code,
      context: context ?? null,
      user_profile: profile
        ? {
            id: profile.id,
            name: profile.name,
            avatar: profile.avatar,
          }
        : null,
    };

    // Save locally first
    this.saveLocalLog(newLog);

    // Save to Supabase table `error_logs` silently (without console output)
    try {
      await this.supabase.whenReady();
      await this.supabase.client.from('error_logs').insert({
        id: newLog.id,
        message: newLog.message,
        stack: newLog.stack,
        url: newLog.url,
        user_id: newLog.user_id,
        severity: newLog.severity,
        code: newLog.code,
        context: newLog.context,
      });
    } catch {
      // Suppress console output if DB insert fails
    }
  }

  async fetchLogs(): Promise<AppErrorLog[]> {
    if (!this.isBrowser) return [];

    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error || !data) {
        return this.sortLogs(this.loadLocalLogs());
      }

      const userIds = [
        ...new Set(
          data.map((l) => l.user_id).filter((id): id is string => !!id),
        ),
      ];

      let userProfilesMap = new Map<string, AppErrorLogUser>();
      if (userIds.length > 0) {
        const { data: profiles } = await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

        if (profiles) {
          userProfilesMap = new Map(
            profiles.map((p) => [
              p.id,
              {
                id: p.id,
                name: p.name,
                avatar: p.avatar,
              },
            ]),
          );
        }
      }

      const dbLogs = (data as AppErrorLog[]).map((log) => ({
        ...log,
        severity: (log.severity as ErrorSeverity) || 'error',
        user_profile: log.user_id
          ? (userProfilesMap.get(log.user_id) ?? null)
          : null,
      }));

      const sorted = this.sortLogs(dbLogs);
      this.logs.set(sorted);
      return sorted;
    } catch {
      return this.sortLogs(this.loadLocalLogs());
    }
  }

  sortLogs(
    logs: AppErrorLog[],
    sortBy: 'severity' | 'date' = 'severity',
  ): AppErrorLog[] {
    return [...logs].sort((a, b) => {
      if (sortBy === 'severity') {
        const weightA = SEVERITY_WEIGHT[a.severity] ?? 0;
        const weightB = SEVERITY_WEIGHT[b.severity] ?? 0;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }

  async clearErrors(): Promise<void> {
    this.logs.set([]);
    if (this.isBrowser) {
      try {
        this.localStorage.removeItem(this.storageKey);
      } catch {
        // ignore
      }
      try {
        await this.supabase.whenReady();
        await this.supabase.client
          .from('error_logs')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {
        // ignore
      }
    }
  }

  private loadLocalLogs(): AppErrorLog[] {
    if (!this.isBrowser) return [];
    try {
      const data = this.localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveLocalLog(log: AppErrorLog): void {
    const updated = [log, ...this.loadLocalLogs()].slice(0, 100);
    this.logs.set(this.sortLogs(updated));
    try {
      this.localStorage.setItem(this.storageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  private unwrapError(
    error: unknown,
    depth = 0,
  ): { message: string; code: string | null; stack: string | null } {
    if (depth > 5 || !error) {
      return { message: 'Unexpected error', code: null, stack: null };
    }

    if (typeof error === 'string') {
      return { message: error, code: null, stack: null };
    }

    if (error instanceof Error) {
      let message = error.message;
      let stack = error.stack ?? null;
      let code: string | null = null;

      if (
        'context' in error &&
        error.context &&
        typeof error.context === 'object'
      ) {
        const ctx = error.context as Record<string, unknown>;
        if (typeof ctx['status'] === 'number') {
          code = String(ctx['status']);
        }
      }

      if (!message || message === '[object Object]' || message === 'Error') {
        const anyErr = error as unknown as Record<string, unknown>;
        if (anyErr['cause']) {
          const inner = this.unwrapError(anyErr['cause'], depth + 1);
          if (
            inner.message &&
            inner.message !== '[object Object]' &&
            inner.message !== 'Error'
          ) {
            message = inner.message;
          }
          if (inner.code) code = inner.code;
          if (!stack && inner.stack) stack = inner.stack;
        }
      }

      return {
        message: message || 'Unexpected error',
        code,
        stack,
      };
    }

    if (typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      const innerError = errorObj['error'];
      const cause = errorObj['cause'];

      const code: string | null = errorObj['code']
        ? String(errorObj['code'])
        : errorObj['status']
          ? String(errorObj['status'])
          : null;
      const stack = errorObj['stack'] ? String(errorObj['stack']) : null;

      // Check explicit text fields
      const candidate =
        errorObj['message'] ||
        errorObj['details'] ||
        errorObj['messageKey'] ||
        errorObj['hint'];

      if (
        typeof candidate === 'string' &&
        candidate.trim() &&
        candidate !== '[object Object]'
      ) {
        return { message: candidate, code, stack };
      }

      // Check cause or inner error recursively
      if (cause) {
        const inner = this.unwrapError(cause, depth + 1);
        if (
          inner.message &&
          inner.message !== '[object Object]' &&
          inner.message !== 'Error'
        ) {
          return {
            message: inner.message,
            code: code || inner.code,
            stack: stack || inner.stack,
          };
        }
      }

      if (innerError) {
        const inner = this.unwrapError(innerError, depth + 1);
        if (
          inner.message &&
          inner.message !== '[object Object]' &&
          inner.message !== 'Error'
        ) {
          return {
            message: inner.message,
            code: code || inner.code,
            stack: stack || inner.stack,
          };
        }
      }

      try {
        const json = JSON.stringify(error);
        if (json && json !== '{}' && json !== '{"message":""}') {
          return { message: json, code, stack };
        }
      } catch {
        // cyclic
      }
    }

    return {
      message: String(error ?? 'Unexpected error'),
      code: null,
      stack: null,
    };
  }
}
