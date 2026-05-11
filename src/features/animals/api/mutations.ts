import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../../lib/db';
import { supabase } from '../../../lib/supabase';

export type AddAnimalPayload = {
  animalId: string;
  entity_type: string;
  parent_mob_id?: string | null;
  census_count: number;
  name?: string | null;
  species?: string | null;
  latin_name?: string | null;
  category?: string | null;
  weight_unit: string;
  red_list_status: string;
  currentUserId: string;
};

export const useAddAnimal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // The Persister tracks this exact key to retry it if the network is offline
    mutationKey: ['offline-add-animal'], 
    
    // 1. OPTIMISTIC UI: Write directly to PGlite so the dashboard reacts instantly
    onMutate: async (val: AddAnimalPayload) => {
      await db.waitReady;
      await db.query(
        `INSERT INTO animals (
          id, entity_type, parent_mob_id, census_count, name, species, latin_name, 
          category, weight_unit, red_list_status, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
        [
          val.animalId, val.entity_type, val.parent_mob_id || null, val.census_count, val.name || null,
          val.species || null, val.latin_name || null, val.category || null, 
          val.weight_unit, val.red_list_status, val.currentUserId
        ]
      );
    },
    
    // 2. NETWORK CALL: Send the exact same payload to Supabase in the background
    mutationFn: async (val: AddAnimalPayload) => {
      const { error } = await supabase.from('animals').insert({
        id: val.animalId,
        entity_type: val.entity_type,
        parent_mob_id: val.parent_mob_id || null,
        census_count: val.census_count,
        name: val.name || null,
        species: val.species || null,
        latin_name: val.latin_name || null,
        category: val.category || null,
        weight_unit: val.weight_unit,
        red_list_status: val.red_list_status,
        created_by: val.currentUserId,
        modified_by: val.currentUserId,
      });

      if (error) throw new Error(error.message);
    },
    
    // Force Dashboard poll to lock in the final state once the cloud matches
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
    }
  });
};