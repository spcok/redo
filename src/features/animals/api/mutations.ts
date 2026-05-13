import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';

// 1. STRICT PAYLOAD DEFINITION (Derived exactly from v3-database schema.csv)
export type AnimalPayload = {
  id: string;
  entity_type: string;
  parent_mob_id: string | null;
  census_count: number;
  name: string | null;
  species: string | null;
  latin_name: string | null;
  category: string | null;
  location: string | null;
  image_url: string | null;
  distribution_map_url: string | null;
  hazard_rating: string | null;
  is_venomous: boolean;
  weight_unit: string;
  average_target_weight: number | null;
  date_of_birth: string | null;
  is_dob_unknown: boolean;
  gender: string | null;
  microchip_id: string | null;
  ring_number: string | null;
  has_no_id: boolean;
  red_list_status: string;
  description: string | null;
  special_requirements: string | null;
  critical_husbandry_notes: string | null;
  ambient_temp_only: boolean;
  target_day_temp_c: number | null;
  target_night_temp_c: number | null;
  target_humidity_min_percent: number | null;
  target_humidity_max_percent: number | null;
  misting_frequency: string | null;
  acquisition_date: string | null;
  origin: string | null;
  lineage_unknown: boolean;
  is_boarding: boolean;
  is_quarantine: boolean;
  created_by: string;
};

export const useAddAnimal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['offline-add-animal'], 
    onMutate: async (payload: AnimalPayload) => {
      console.log(`📸 [API] Local Insert: ${payload.name || 'Unnamed'}`);
      await db.waitReady;
      await db.query(
        `INSERT INTO animals (
          id, entity_type, parent_mob_id, census_count, name, species, latin_name, category, location, 
          image_url, distribution_map_url, hazard_rating, is_venomous, weight_unit, average_target_weight, 
          date_of_birth, is_dob_unknown, gender, microchip_id, ring_number, has_no_id, red_list_status, 
          description, special_requirements, critical_husbandry_notes, ambient_temp_only, target_day_temp_c, 
          target_night_temp_c, target_humidity_min_percent, target_humidity_max_percent, misting_frequency, 
          acquisition_date, origin, lineage_unknown, is_boarding, is_quarantine, 
          display_order, archived, is_deleted, created_by, modified_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36,
          0, false, false, $37, $37, now(), now()
        )`,
        [
          payload.id, payload.entity_type, payload.parent_mob_id, payload.census_count, payload.name, 
          payload.species, payload.latin_name, payload.category, payload.location, payload.image_url, 
          payload.distribution_map_url, payload.hazard_rating, payload.is_venomous, payload.weight_unit, 
          payload.average_target_weight, payload.date_of_birth, payload.is_dob_unknown, payload.gender, 
          payload.microchip_id, payload.ring_number, payload.has_no_id, payload.red_list_status, 
          payload.description, payload.special_requirements, payload.critical_husbandry_notes, 
          payload.ambient_temp_only, payload.target_day_temp_c, payload.target_night_temp_c, 
          payload.target_humidity_min_percent, payload.target_humidity_max_percent, payload.misting_frequency, 
          payload.acquisition_date, payload.origin, payload.lineage_unknown, payload.is_boarding, 
          payload.is_quarantine, payload.created_by
        ]
      );
    },
    mutationFn: async (payload: AnimalPayload) => {
      console.log(`☁️ [API] Supabase Upload...`);
      // We send the exact same scrubbed payload to Supabase
      const { error } = await supabase.from('animals').insert({
        ...payload,
        modified_by: payload.created_by,
        display_order: 0,
        archived: false,
        is_deleted: false,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    }
  });
};

export const useUpdateAnimal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['offline-update-animal'], 
    onMutate: async (payload: AnimalPayload) => {
      console.log(`📸 [API] Local Update: ${payload.name || 'Unnamed'}`);
      await db.waitReady;
      await db.query(
        `UPDATE animals SET 
          entity_type=$2, parent_mob_id=$3, census_count=$4, name=$5, species=$6, latin_name=$7, category=$8, location=$9, 
          image_url=$10, distribution_map_url=$11, hazard_rating=$12, is_venomous=$13, weight_unit=$14, average_target_weight=$15, 
          date_of_birth=$16, is_dob_unknown=$17, gender=$18, microchip_id=$19, ring_number=$20, has_no_id=$21, red_list_status=$22, 
          description=$23, special_requirements=$24, critical_husbandry_notes=$25, ambient_temp_only=$26, target_day_temp_c=$27, 
          target_night_temp_c=$28, target_humidity_min_percent=$29, target_humidity_max_percent=$30, misting_frequency=$31, 
          acquisition_date=$32, origin=$33, lineage_unknown=$34, is_boarding=$35, is_quarantine=$36, modified_by=$37, updated_at=now()
         WHERE id = $1`,
         [
          payload.id, payload.entity_type, payload.parent_mob_id, payload.census_count, payload.name, 
          payload.species, payload.latin_name, payload.category, payload.location, payload.image_url, 
          payload.distribution_map_url, payload.hazard_rating, payload.is_venomous, payload.weight_unit, 
          payload.average_target_weight, payload.date_of_birth, payload.is_dob_unknown, payload.gender, 
          payload.microchip_id, payload.ring_number, payload.has_no_id, payload.red_list_status, 
          payload.description, payload.special_requirements, payload.critical_husbandry_notes, 
          payload.ambient_temp_only, payload.target_day_temp_c, payload.target_night_temp_c, 
          payload.target_humidity_min_percent, payload.target_humidity_max_percent, payload.misting_frequency, 
          payload.acquisition_date, payload.origin, payload.lineage_unknown, payload.is_boarding, 
          payload.is_quarantine, payload.created_by
        ]
      );
    },
    mutationFn: async (payload: AnimalPayload) => {
      console.log(`☁️ [API] Supabase Update...`);
      const { id, created_by, ...updateData } = payload;
      const { error } = await supabase.from('animals').update({
        ...updateData,
        modified_by: created_by,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
      queryClient.invalidateQueries({ queryKey: ['animal', variables.id] });
    }
  });
};