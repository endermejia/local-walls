import { TuiToastService } from '@taiga-ui/kit';
import { TranslateService } from '@ngx-translate/core';

/**
 * Handles error mapping and shows a toast notification.
 * @param error The error object (usually from Supabase)
 * @param toast The TuiToastService instance
 * @param translate The TranslateService instance
 */
export function handleErrorToast(
  error: { code?: string; message?: string },
  toast: TuiToastService,
  translate: TranslateService,
): void {
  let messageKey = 'errors.unexpected';

  // Specific PostgreSQL / Supabase error codes
  if (error?.code === '23503') {
    messageKey = 'errors.database.foreign_key_violation';
  } else if (error?.code === '23505') {
    messageKey = 'errors.database.unique_violation';
  }

  toast
    .open(translate.instant(messageKey), {
      appearance: 'negative',
      data: '@tui.circle-x',
    })
    .subscribe();
}
