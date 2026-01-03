import { supabase, DbFabric, DbInventoryLog } from './supabase';
import { Fabric, FabricRequirements, ProductWithFabricCost, InventoryLog } from '@/types';

// Convert database fabric to app fabric type
function toAppFabric(dbFabric: DbFabric): Fabric {
  return {
    id: dbFabric.id,
    name: dbFabric.name,
    costPerMeter: Number(dbFabric.cost_per_meter),
    availableMeters: Number(dbFabric.available_meters),
    updatedAt: dbFabric.updated_at,
  };
}

// Convert database log to app log type
function toAppLog(dbLog: DbInventoryLog): InventoryLog {
  return {
    id: dbLog.id,
    fabricId: dbLog.fabric_id,
    fabricName: dbLog.fabric_name,
    change: Number(dbLog.change_amount),
    reason: dbLog.reason,
    timestamp: dbLog.created_at,
  };
}

// Load all fabrics from Supabase
export async function loadFabrics(): Promise<Fabric[]> {
  const { data, error } = await supabase
    .from('fabrics')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error loading fabrics:', error);
    return [];
  }

  return (data || []).map(toAppFabric);
}

// Get fabric by name
export async function getFabricByName(name: string): Promise<Fabric | null> {
  const { data, error } = await supabase
    .from('fabrics')
    .select('*')
    .ilike('name', name)
    .single();

  if (error || !data) {
    return null;
  }

  return toAppFabric(data);
}

// Update fabric inventory
export async function updateFabricInventory(
  fabricName: string,
  change: number,
  reason: string
): Promise<Fabric | null> {
  // First get the current fabric
  const { data: fabric, error: fetchError } = await supabase
    .from('fabrics')
    .select('*')
    .ilike('name', fabricName)
    .single();

  if (fetchError || !fabric) {
    console.error('Fabric not found:', fabricName);
    return null;
  }

  // Update the available meters
  const newMeters = Number(fabric.available_meters) + change;
  
  const { data: updated, error: updateError } = await supabase
    .from('fabrics')
    .update({ available_meters: newMeters })
    .eq('id', fabric.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating fabric:', updateError);
    return null;
  }

  // Log the change
  await addInventoryLog({
    fabricId: fabric.id,
    fabricName: fabric.name,
    change,
    reason,
  });

  return toAppFabric(updated);
}

// Add new fabric type
export async function addFabric(
  name: string, 
  costPerMeter: number, 
  availableMeters: number
): Promise<Fabric | null> {
  const { data, error } = await supabase
    .from('fabrics')
    .insert({
      name: name.toLowerCase(),
      cost_per_meter: costPerMeter,
      available_meters: availableMeters,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding fabric:', error);
    return null;
  }

  return toAppFabric(data);
}

// Update fabric details
export async function updateFabric(
  id: string, 
  updates: Partial<Fabric>
): Promise<Fabric | null> {
  const dbUpdates: Record<string, unknown> = {};
  
  if (updates.name !== undefined) dbUpdates.name = updates.name.toLowerCase();
  if (updates.costPerMeter !== undefined) dbUpdates.cost_per_meter = updates.costPerMeter;
  if (updates.availableMeters !== undefined) dbUpdates.available_meters = updates.availableMeters;

  const { data, error } = await supabase
    .from('fabrics')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating fabric:', error);
    return null;
  }

  return toAppFabric(data);
}

// Delete fabric
export async function deleteFabric(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('fabrics')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting fabric:', error);
    return false;
  }

  return true;
}

// Load inventory logs
export async function loadInventoryLogs(limit: number = 50): Promise<InventoryLog[]> {
  const { data, error } = await supabase
    .from('inventory_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error loading inventory logs:', error);
    return [];
  }

  return (data || []).map(toAppLog);
}

// Add inventory log
export async function addInventoryLog(
  log: Omit<InventoryLog, 'id' | 'timestamp'>
): Promise<InventoryLog | null> {
  const { data, error } = await supabase
    .from('inventory_logs')
    .insert({
      fabric_id: log.fabricId,
      fabric_name: log.fabricName,
      change_amount: log.change,
      reason: log.reason,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding inventory log:', error);
    return null;
  }

  return toAppLog(data);
}

// Check if order has been processed
export async function isOrderProcessed(shopifyOrderId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('processed_orders')
    .select('id')
    .eq('shopify_order_id', shopifyOrderId)
    .single();

  return !error && data !== null;
}

// Mark order as processed
export async function markOrderProcessed(
  shopifyOrderId: string,
  orderName: string,
  totalFabricCost: number,
  fabricUsage: Record<string, number>
): Promise<boolean> {
  const { error } = await supabase
    .from('processed_orders')
    .insert({
      shopify_order_id: shopifyOrderId,
      order_name: orderName,
      total_fabric_cost: totalFabricCost,
      fabric_usage: fabricUsage,
    });

  if (error) {
    console.error('Error marking order as processed:', error);
    return false;
  }

  return true;
}

// Get low stock fabrics
export async function getLowStockFabrics(threshold: number = 10): Promise<Fabric[]> {
  const { data, error } = await supabase
    .from('fabrics')
    .select('*')
    .lt('available_meters', threshold)
    .order('available_meters');

  if (error) {
    console.error('Error getting low stock fabrics:', error);
    return [];
  }

  return (data || []).map(toAppFabric);
}

// Calculate total inventory value
export async function calculateInventoryValue(): Promise<number> {
  const fabrics = await loadFabrics();
  return fabrics.reduce((total, fabric) => {
    return total + (fabric.costPerMeter * fabric.availableMeters);
  }, 0);
}

// Calculate fabric cost for a product (sync function - needs fabrics passed in)
export function calculateFabricCost(
  fabricRequirements: FabricRequirements | null,
  fabrics: Fabric[],
  printCostPerMeter: number = 25
): { totalCost: number; breakdown: ProductWithFabricCost['fabricBreakdown'] } {
  if (!fabricRequirements) {
    return { totalCost: 0, breakdown: [] };
  }

  const breakdown: ProductWithFabricCost['fabricBreakdown'] = [];
  let totalCost = 0;

  for (const [fabricName, meters] of Object.entries(fabricRequirements.fabrics)) {
    const fabric = fabrics.find(f => f.name.toLowerCase() === fabricName.toLowerCase());
    const costPerMeter = fabric?.costPerMeter || 0;
    const printCost = fabricRequirements.is_printed ? printCostPerMeter : 0;
    const effectiveCostPerMeter = costPerMeter + printCost;
    const fabricTotalCost = meters * effectiveCostPerMeter;

    breakdown.push({
      fabricName,
      meters,
      costPerMeter,
      printCost,
      totalCost: fabricTotalCost,
    });

    totalCost += fabricTotalCost;
  }

  return { totalCost, breakdown };
}

// Parse fabric requirements from metafield
export function parseFabricRequirements(metafieldValue: string | null): FabricRequirements | null {
  if (!metafieldValue) return null;
  
  try {
    return JSON.parse(metafieldValue);
  } catch (error) {
    console.error('Error parsing fabric requirements:', error);
    return null;
  }
}
