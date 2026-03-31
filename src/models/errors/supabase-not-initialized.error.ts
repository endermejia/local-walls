export class SupabaseNotInitializedError extends Error {
  constructor(message = 'Supabase client is not initialized. Ensure you are in the browser and provideSupabaseConfig is set.') {
    super(message);
    this.name = 'SupabaseNotInitializedError';
  }
}
