import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with service role key (full access)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types for database tables
export interface DbFabric {
  id: string;
  name: string;
  cost_per_meter: number;
  available_meters: number;
  created_at: string;
  updated_at: string;
}

export interface DbInventoryLog {
  id: string;
  fabric_id: string;
  fabric_name: string;
  change_amount: number;
  reason: string;
  created_at: string;
}

export interface DbProcessedOrder {
  id: string;
  shopify_order_id: string;
  order_name: string;
  total_fabric_cost: number;
  fabric_usage: Record<string, number>;
  processed_at: string;
}
