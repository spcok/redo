import { PGlite } from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';

class DatabaseService {
  public pg: PGlite;
  public waitReady: Promise<void>;

  constructor() {
    this.pg = new PGlite('idb://koa-local-db', {
      extensions: {
        sync: electricSync()
      }
    });
    this.waitReady = this.initDb();
  }

  private async initDb() {
    try {
      await this.pg.waitReady;

      await this.pg.exec(`
        -- 0. USERS TABLE (Mirrors Supabase Auth Profiles for local joins)
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY,
          email text,
          full_name text,
          role text,
          avatar_url text,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );

        -- 1. ANIMALS TABLE
        CREATE TABLE IF NOT EXISTS animals (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          entity_type text NOT NULL,
          parent_mob_id uuid,
          census_count integer NOT NULL,
          name text,
          species text,
          latin_name text,
          category text,
          location text,
          image_url text,
          distribution_map_url text,
          hazard_rating text,
          is_venomous boolean NOT NULL DEFAULT false,
          weight_unit text NOT NULL,
          flying_weight_g numeric,
          winter_weight_g numeric,
          average_target_weight numeric,
          date_of_birth date,
          is_dob_unknown boolean NOT NULL DEFAULT false,
          gender text,
          microchip_id text,
          ring_number text,
          has_no_id boolean NOT NULL DEFAULT false,
          red_list_status text NOT NULL,
          description text,
          special_requirements text,
          critical_husbandry_notes text,
          ambient_temp_only boolean NOT NULL DEFAULT false,
          target_day_temp_c numeric,
          target_night_temp_c numeric,
          water_tipping_temp numeric,
          target_humidity_min_percent numeric,
          target_humidity_max_percent numeric,
          misting_frequency text,
          acquisition_date date,
          origin text,
          lineage_unknown boolean NOT NULL DEFAULT false,
          is_boarding boolean NOT NULL DEFAULT false,
          is_quarantine boolean NOT NULL DEFAULT false,
          display_order integer NOT NULL DEFAULT 0,
          archived boolean NOT NULL DEFAULT false,
          archived_at timestamp with time zone, 
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid,
          modified_by uuid,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );

        -- 2. CLINICAL SCHEDULE TABLE
        CREATE TABLE IF NOT EXISTS clinical_schedule (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          animal_id uuid NOT NULL,
          schedule_type text NOT NULL,
          title text NOT NULL,
          start_date date NOT NULL,
          end_date date NOT NULL,
          frequency text NOT NULL,
          status text NOT NULL DEFAULT 'ACTIVE',
          assigned_to uuid NOT NULL,
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid NOT NULL,
          modified_by uuid,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );

        -- 3. CLINICAL RECORDS TABLE
        CREATE TABLE IF NOT EXISTS clinical_records (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          animal_id uuid NOT NULL,
          record_type text NOT NULL,
          record_date date NOT NULL,
          time_in timestamp with time zone,
          time_out timestamp with time zone,
          soap_subjective text NOT NULL,
          soap_objective text NOT NULL,
          soap_assessment text NOT NULL,
          soap_plan text NOT NULL,
          weight_grams numeric NOT NULL,
          conductor_role text NOT NULL,
          conducted_by uuid NOT NULL,
          external_vet_name text NOT NULL,
          external_vet_clinic text NOT NULL,
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid NOT NULL,
          modified_by uuid NOT NULL,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now()
        );

        -- 4. TIMESHEETS TABLE
        CREATE TABLE IF NOT EXISTS timesheets (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid,
          shift_date date NOT NULL,
          clock_in_time timestamp with time zone NOT NULL DEFAULT now(),
          clock_out_time timestamp with time zone,
          status text NOT NULL,
          notes text,
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid,
          modified_by uuid,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );

        -- 5. TASKS TABLE
        CREATE TABLE IF NOT EXISTS tasks (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          title text NOT NULL,
          description text,
          assigned_to uuid,
          due_date date,
          task_type text,
          status text DEFAULT 'PENDING',
          completed_at timestamp with time zone,
          completed_by uuid,
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid,
          modified_by uuid,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );

        -- 6. SAFETY INCIDENTS TABLE
        CREATE TABLE IF NOT EXISTS safety_incidents (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          incident_date date NOT NULL,
          incident_time timestamp with time zone,
          incident_type text NOT NULL,
          severity text NOT NULL,
          description text NOT NULL,
          location text,
          persons_involved text,
          animals_involved text,
          action_taken text,
          reported_by uuid,
          status text DEFAULT 'OPEN',
          is_deleted boolean NOT NULL DEFAULT false,
          created_by uuid,
          modified_by uuid,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now()
        );
      `);

      console.log('✅ [DB] Local PGlite initialized with strict V3 Schema.');

      // =====================================================================
      // OPTIMIZATION: Setup indexing for lightning-fast TanStack queries
      // =====================================================================
      await this.pg.exec(`
        CREATE INDEX IF NOT EXISTS idx_animals_is_deleted ON animals(is_deleted);
        CREATE INDEX IF NOT EXISTS idx_timesheets_user_date ON timesheets(user_id, shift_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);
        CREATE INDEX IF NOT EXISTS idx_clinical_schedule_animal ON clinical_schedule(animal_id);
        CREATE INDEX IF NOT EXISTS idx_clinical_records_animal ON clinical_records(animal_id);
      `);

    } catch (error) {
      console.error('🚨 [DB] Failed to initialize local database:', error);
      throw error;
    }
  }

  public async query(sql: string, params?: any[]) {
    await this.waitReady;
    return this.pg.query(sql, params);
  }
}

export const db = new DatabaseService();