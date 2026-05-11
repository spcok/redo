import { z } from 'zod';

/**
 * Audit Point O-01: No 'as any'[cite: 1].
 * Strictly typed database models derived from the V3 SQL schema.
 */

export const AnimalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  species: z.string().nullable(),
  category: z.string().nullable(),
  weight_unit: z.string(),
  census_count: z.number(),
  entity_type: z.string(),
  red_list_status: z.string(),
  display_order: z.number(),
  is_deleted: z.boolean(),
});

export const DailyLogSchema = z.object({
  id: z.string().uuid(),
  animal_id: z.string().uuid(),
  log_type: z.string(),
  log_date: z.string(), // ISO String
  notes: z.string().nullable(),
  weight_grams: z.preprocess((val) => (val === null ? null : Number(val)), z.number().nullable()),
  temperature_c: z.preprocess((val) => (val === null ? null : Number(val)), z.number().nullable()),
  is_deleted: z.boolean(),
});

export type Animal = z.infer<typeof AnimalSchema>;
export type DailyLog = z.infer<typeof DailyLogSchema>;