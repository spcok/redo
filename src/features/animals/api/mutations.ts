export type AnimalPayload = {
  animalId: string;
  entity_type: string;
  parent_mob_id?: string | null;
  census_count: number;
  name?: string | null;
  species?: string | null;
  latin_name?: string | null;
  category?: string | null;
  location?: string | null;
  image_url?: string | null; // Added
  distribution_map_url?: string | null; // Added
  hazard_rating?: string | null;
  is_venomous: boolean;
  weight_unit: string;
  average_target_weight?: number | null;
  date_of_birth?: string | null;
  is_dob_unknown: boolean;
  gender?: string | null;
  microchip_id?: string | null;
  ring_number?: string | null;
  red_list_status: string;
  description?: string | null;
  special_requirements?: string | null;
  critical_husbandry_notes?: string | null;
  ambient_temp_only: boolean;
  target_day_temp_c?: number | null;
  target_night_temp_c?: number | null;
  target_humidity_min_percent?: number | null;
  target_humidity_max_percent?: number | null;
  misting_frequency?: string | null;
  acquisition_date?: string | null;
  origin?: string | null;
  is_boarding: boolean;
  is_quarantine: boolean;
  currentUserId: string;
};

// ... In useAddAnimal onMutate SQL ...
// Add image_url and distribution_map_url to the column list and values ($34, $35)
// Updated SQL snippet for INSERT:
/*
`INSERT INTO animals (
  ..., location, image_url, distribution_map_url, hazard_rating, ...
) VALUES (
  ..., $9, $34, $35, $10, ...
)`
*/

// ... In useUpdateAnimal onMutate SQL ...
// Add image_url=$34, distribution_map_url=$35 to the SET clause