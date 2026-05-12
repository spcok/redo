import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';

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
  image_url?: string | null; 
  distribution_map_url?: string | null; 
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

export const useAddAnimal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['offline-add-animal'], 
    onMutate: async (val: AnimalPayload) => {
      console.log(`📸 [API] Attempting Local Insert. Image size: ${val.image_url?.length || 0} bytes`);
      await db.waitReady;
      await db.query(
        `INSERT INTO animals (
          id, entity_type, parent_mob_id, census_count, name, species, latin_name, category, location, 
          hazard_rating, is_venomous, weight_unit, average_target_weight, date_of_birth, is_dob_unknown, 
          gender, microchip_id, ring_number, red_list_status, description, special_requirements, 
          critical_husbandry_notes, ambient_temp_only, target_day_temp_c, target_night_temp_c, 
          target_humidity_min_percent, target_humidity_max_percent, misting_frequency, acquisition_date, 
          origin, is_boarding, is_quarantine, display_order, archived, archived_at, is_deleted, created_by, modified_by,
          image_url, distribution_map_url
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, 
          0, false, now(), false, $33, $33, $34, $35
        )`,
        [
          val.animalId, val.entity_type, val.parent_mob_id || null, val.census_count, val.name || null, val.species || null, val.latin_name || null, val.category || null, val.location || null,
          val.hazard_rating || null, val.is_venomous ?? false, val.weight_unit, val.average_target_weight || null, val.date_of_birth || null, val.is_dob_unknown ?? false,
          val.gender || null, val.microchip_id || null, val.ring_number || null, val.red_list_status, val.description || null, val.special_requirements || null,
          val.critical_husbandry_notes || null, val.ambient_temp_only ?? false, val.target_day_temp_c || null, val.target_night_temp_c || null,
          val.target_humidity_min_percent || null, val.target_humidity_max_percent || null, val.misting_frequency || null, val.acquisition_date || null,
          val.origin || null, val.is_boarding ?? false, val.is_quarantine ?? false, val.currentUserId, val.image_url || null, val.distribution_map_url || null
        ]
      );
    },
    mutationFn: async (val: AnimalPayload) => {
      console.log(`☁️ [API] Attempting Supabase Insert...`);
      const { currentUserId, animalId, ...supabasePayload } = val;
      const { error } = await supabase.from('animals').insert({
        ...supabasePayload, 
        id: animalId, 
        display_order: 0,
        archived: false,
        archived_at: new Date().toISOString(),
        is_deleted: false,
        // Guarantee boolean safety to Supabase
        is_venomous: val.is_venomous ?? false,
        is_dob_unknown: val.is_dob_unknown ?? false,
        ambient_temp_only: val.ambient_temp_only ?? false,
        is_boarding: val.is_boarding ?? false,
        is_quarantine: val.is_quarantine ?? false,
        created_by: currentUserId, 
        modified_by: currentUserId
      });
      if (error) throw new Error(error.message);
    },
    onError: (error) => {
      console.error("🚨 [API CRASH] Mutation Failed! Reason:", error.message);
      alert(`Database Sync Error: ${error.message}\n\nPlease check your Developer Console.`);
    },
    onSuccess: () => {
      console.log(`✅ [API] Sync Successful`);
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    }
  });
};

export const useUpdateAnimal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['offline-update-animal'], 
    onMutate: async (val: AnimalPayload) => {
      console.log(`📸 [API] Attempting Local Update. Image size: ${val.image_url?.length || 0} bytes`);
      await db.waitReady;
      await db.query(
        `UPDATE animals SET 
          entity_type=$2, parent_mob_id=$3, census_count=$4, name=$5, species=$6, latin_name=$7, category=$8, location=$9, 
          hazard_rating=$10, is_venomous=$11, weight_unit=$12, average_target_weight=$13, date_of_birth=$14, is_dob_unknown=$15, 
          gender=$16, microchip_id=$17, ring_number=$18, red_list_status=$19, description=$20, special_requirements=$21, 
          critical_husbandry_notes=$22, ambient_temp_only=$23, target_day_temp_c=$24, target_night_temp_c=$25, 
          target_humidity_min_percent=$26, target_humidity_max_percent=$27, misting_frequency=$28, acquisition_date=$29, 
          origin=$30, is_boarding=$31, is_quarantine=$32, modified_by=$33, image_url=$34, distribution_map_url=$35, updated_at=now()
         WHERE id = $1`,
         [
            val.animalId, val.entity_type, val.parent_mob_id || null, val.census_count, val.name || null, val.species || null, val.latin_name || null, val.category || null, val.location || null,
            val.hazard_rating || null, val.is_venomous ?? false, val.weight_unit, val.average_target_weight || null, val.date_of_birth || null, val.is_dob_unknown ?? false,
            val.gender || null, val.microchip_id || null, val.ring_number || null, val.red_list_status, val.description || null, val.special_requirements || null,
            val.critical_husbandry_notes || null, val.ambient_temp_only ?? false, val.target_day_temp_c || null, val.target_night_temp_c || null,
            val.target_humidity_min_percent || null, val.target_humidity_max_percent || null, val.misting_frequency || null, val.acquisition_date || null,
            val.origin || null, val.is_boarding ?? false, val.is_quarantine ?? false, val.currentUserId, val.image_url || null, val.distribution_map_url || null
          ]
      );
    },
    mutationFn: async (val: AnimalPayload) => {
      console.log(`☁️ [API] Attempting Supabase Update...`);
      const { currentUserId, animalId, ...supabasePayload } = val;
      const { error } = await supabase.from('animals').update({
        ...supabasePayload, 
        is_venomous: val.is_venomous ?? false,
        is_dob_unknown: val.is_dob_unknown ?? false,
        ambient_temp_only: val.ambient_temp_only ?? false,
        is_boarding: val.is_boarding ?? false,
        is_quarantine: val.is_quarantine ?? false,
        modified_by: currentUserId, 
        updated_at: new Date().toISOString()
      }).eq('id', animalId);
      if (error) throw new Error(error.message);
    },
    onError: (error) => {
      console.error("🚨 [API CRASH] Update Failed! Reason:", error.message);
      alert(`Database Sync Error: ${error.message}\n\nPlease check your Developer Console.`);
    },
    onSuccess: (_, variables) => {
      console.log(`✅ [API] Sync Successful`);
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['animal', variables.animalId] });
    }
  });
};