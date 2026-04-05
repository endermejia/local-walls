import { ToastService } from '../services/toast.service';

/**
 * Handles error mapping and shows a toast notification.
 * @param error The error object (usually from Supabase)
 * @param toast The ToastService instance
 */
export function handleErrorToast(
  error: { code?: string; message?: string },
  toast: ToastService,
): void {
  let messageKey = 'errors.unexpected';

  // Specific PostgreSQL / Supabase error codes
  if (error?.code === '23503') {
    messageKey = 'errors.database.foreign_key_violation';
  } else if (error?.code === '23505') {
    messageKey = 'errors.database.unique_violation';
  }

  toast.error(messageKey);
}

/**
 * Extracts a human-readable message from an unknown error object.
 * @param error The error object to extract the message from
 * @returns The error message as a string
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error === undefined) return 'undefined';
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}
