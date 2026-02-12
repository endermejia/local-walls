# Database Changes for Mentions

To support the new "mention" notification type, please ensure that the `notifications` table accepts `'mention'` as a valid value for the `type` column.

If you have a Check Constraint on the `type` column, please update it:

```sql
-- Drop the existing constraint (name might vary, check your schema)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add the constraint with the new type
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type IN ('like', 'comment', 'mention'));
```

If there are no constraints on the `type` column, no SQL changes are needed.
