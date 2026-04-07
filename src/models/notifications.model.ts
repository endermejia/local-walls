export const NotificationTypes = {
  LIKE: 'like',
  COMMENT: 'comment',
  MENTION: 'mention',
  MESSAGE: 'message',
  LIKED_COMMENT: 'likedComment',
  FOLLOW_REQUEST: 'follow_request',
  FOLLOW_ACCEPTED: 'follow_accepted',
} as const;

export type NotificationType =
  (typeof NotificationTypes)[keyof typeof NotificationTypes];
