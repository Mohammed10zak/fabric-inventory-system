import { NextRequest, NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/shopify';
import { loadFabrics, calculateFabricCost, parseFabricRequirements, getSetting } from '@/lib/fabrics';
import { OrderWithFabricUsage } from '@/types';

// GET /api/orders - Get all orders with fabric usage
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const shopifyOrders = await fetchOrders(limit);
    const fabrics = await loadFabrics();
    
    // Get print cost from database settings
    const printCostStr = await getSetting('print_cost_per_meter', '25');
    const printCostPerMeter = parseInt(printCostStr);
    
    const ordersWithUsage: OrderWithFabricUsage[] = shopifyOrders.map(order => {
      let totalFabricCost = 0;
      const fabricUsage: Record<string, number> = {};
      
      const items = order.lineItems.edges.map(({ node: item }) => {
        const fabricRequirements = parseFabricRequirements(
          item.product?.metafield?.value || null
        );
        
        const { totalCost } = calculateFabricCost(
          fabricRequirements,
          fabrics,
          printCostPerMeter
        );
        
        const fabricCostPerUnit = totalCost;
        const totalItemFabricCost = totalCost * item.quantity;
        totalFabricCost += totalItemFabricCost;
        
        // Calculate fabric usage for this item
        if (fabricRequirements) {
          for (const [fabricName, meters] of Object.entries(fabricRequirements.fabrics)) {
            const totalMeters = meters * item.quantity;
            fabricUsage[fabricName] = (fabricUsage[fabricName] || 0) + totalMeters;
          }
        }
        
        return {
          title: item.title,
          quantity: item.quantity,
          fabricRequirements,
          fabricCostPerUnit,
          totalFabricCost: totalItemFabricCost,
        };
      });
      
      return {
        id: order.id,
        name: order.name,
        createdAt: order.createdAt,
        totalPrice: order.totalPrice,
        items,
        totalFabricCost,
        fabricUsage,
      };
    });
    
    // Calculate total fabric usage across all orders
    const totalFabricUsage: Record<string, number> = {};
    ordersWithUsage.forEach(order => {
      for (const [fabricName, meters] of Object.entries(order.fabricUsage)) {
        totalFabricUsage[fabricName] = (totalFabricUsage[fabricName] || 0) + meters;
      }
    });
    
    return NextResponse.json({ 
      orders: ordersWithUsage,
      count: ordersWithUsage.length,
      totalFabricUsage,
      totalFabricCost: ordersWithUsage.reduce((sum, o) => sum + o.totalFabricCost, 0)
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}