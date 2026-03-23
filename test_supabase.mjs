import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://xyzcompany.supabase.co', 'public-anon-key');

let query = supabase
  .from('route_ascents')
  .select(`*, route:routes!inner(*)`)
  .neq('user_id', '123')
  .gte('route.grade', 0)
  .lte('route.grade', 22);

console.log("Using route.grade:");
console.log(query.url.toString());

let query2 = supabase
  .from('route_ascents')
  .select(`*, route:routes!inner(*)`)
  .neq('user_id', '123')
  .gte('routes.grade', 0)
  .lte('routes.grade', 22);

console.log("\nUsing routes.grade:");
console.log(query2.url.toString());
