export interface Zone {
  id: string;
  name: string;
  description?: string;
  cragIds: string[];
  // Optional external metadata to integrate with 8a.nu
  slug?: string;
  countrySlug?: string;
}
