# Instructions

Run the following SQL command in your Supabase SQL Editor to add the video URL support:

```sql
ALTER TABLE route_ascents ADD COLUMN video_url text;
```

# Image Optimization

The application has been updated to optimize user-uploaded images (avatars and ascent photos) to improve loading speed.

## Changes

1.  **Format:** All new images are converted to `WebP` format.
2.  **Quality:** Image quality is set to `80`.
3.  **Resizing:**
    *   **Ascent Photos:** Resized to a maximum width of `1600px`.
    *   **Avatars:** Resized to a maximum width of `512px` (as previously, but now with reduced quality 80).

## Supabase Configuration Requirements

To ensure these changes work correctly, please verify the following in your Supabase project:

1.  **Storage Buckets:**
    *   The `avatar` and `route-ascent-photos` (or equivalent) buckets must allow the `image/webp` MIME type.
    *   If you have restrictive RLS or bucket policies based on file extension or MIME type, ensure `.webp` and `image/webp` are permitted.

2.  **Edge Functions:**
    *   Ensure the `upload-avatar` and `upload-route-ascent-photo` edge functions (if custom logic exists) accept `image/webp`.

## Existing Data

*   These changes **only apply to new uploads**.
*   Existing images in the database remain in their original format (JPEG/PNG) and size.
