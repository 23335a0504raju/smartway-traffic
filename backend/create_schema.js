import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Needs Service Role Key for Schema changes ideally, but we will use the REST API via RPC or direct SQL if possible.

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
    console.log("Creating sumo_sessions table...");
    // Supabase JS client doesn't support raw DDL directly via public anon key easily without an RPC.
    // However, I will output the SQL required so we can instruct the user or run it.
    const sql = `
        CREATE TABLE IF NOT EXISTS sumo_sessions (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
            session_id text,
            network_name text,
            junction_count integer,
            total_vehicles integer,
            emergency_detected boolean,
            vehicle_summary jsonb,
            junction_data jsonb
        );
    `;
    console.log("SQL to run in Supabase SQL Editor:\n\n" + sql);
}

createTable();
