export const NotificationTypes = {
  LIKE: 'like',
  COMMENT: 'comment',
  MENTION: 'mention',
  MESSAGE: 'message',
  LIKED_COMMENT: 'likedComment',
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];
