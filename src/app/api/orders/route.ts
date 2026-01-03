import { NextRequest, NextResponse } from 'next/server';
import { fetchOrders } from '@/lib/shopify';
import { loadFabrics, calculateFabricCost, parseFabricRequirements } from '@/lib/fabrics';
import { OrderWithFabricUsage } from '@/types';

const PRINT_COST_PER_METER = parseInt(process.env.PRINT_COST_PER_METER || '25');

// GET /api/orders - Get all orders with fabric usage
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const shopifyOrders = await fetchOrders(limit);
    const fabrics = await loadFabrics();
    
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
          PRINT_COST_PER_METER
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
