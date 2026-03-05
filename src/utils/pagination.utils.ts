import { SupabaseClient } from '@supabase/supabase-js';
import { UserProfileBasicDto, PaginatedProfilesResult } from '../models';

/**
 * Fetches a paginated list of user profiles based on a many-to-many relationship
 * (e.g., likes, comments, etc.).
 *
 * It first queries the junction table to get the user IDs, then fetches the
 * corresponding profiles and sorts them to match the original order (created_at desc).
 *
 * @param supabaseClient The initialized Supabase client
 * @param tableName The junction table name (e.g., 'route_ascent_likes')
 * @param foreignKeyColumn The foreign key column relating to the parent entity
 * @param idValue The ID of the parent entity
 * @param page The page number (0-indexed)
 * @param pageSize The number of items per page
 * @param query Optional search string to filter profiles by name
 * @param methodName Optional string for logging purposes
 */
export async function getPaginatedProfilesFromJunction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseClient: SupabaseClient<any, "public", any>,
  tableName: string,
  foreignKeyColumn: string,
  idValue: number | string,
  page: number,
  pageSize: number,
  query: string,
  methodName = 'getPaginatedProfilesFromJunction',
): Promise<PaginatedProfilesResult> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  // 1. Fetch user IDs from the junction table
  const likesQuery = supabaseClient
    .from(tableName)
    .select('user_id', { count: 'exact' })
    .eq(foreignKeyColumn, idValue)
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data: junctionData, error: junctionError, count } = await likesQuery;

  if (junctionError) {
    console.error(`[PaginationUtils] ${methodName} error`, junctionError);
    throw junctionError;
  }

  if (!junctionData || junctionData.length === 0) {
    return { items: [], total: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = junctionData.map((d: any) => d.user_id);

  // 2. Fetch user profiles using those IDs
  let profilesQuery = supabaseClient
    .from('user_profiles')
    .select('id, name, avatar')
    .in('id', userIds);

  if (query) {
    profilesQuery = profilesQuery.ilike('name', `%${query}%`);
  }

  const { data: profilesData, error: profilesError } = await profilesQuery;

  if (profilesError) {
    console.error(
      `[PaginationUtils] ${methodName} profiles error`,
      profilesError,
    );
    throw profilesError;
  }

  // 3. Sort profiles back to match the order of the junction table (created_at desc)
  const profileMap = new Map(profilesData?.map((p) => [p.id, p]));
  const sortedProfiles = userIds
    .map((id: string) => profileMap.get(id))
    .filter((p: UserProfileBasicDto | undefined): p is UserProfileBasicDto => !!p);

  return {
    items: sortedProfiles,
    total: count || 0,
  };
}
