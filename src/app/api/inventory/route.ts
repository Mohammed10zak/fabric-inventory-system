import { NextRequest, NextResponse } from 'next/server';
import { updateFabricInventory, loadInventoryLogs } from '@/lib/fabrics';

// POST /api/inventory - Update fabric inventory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fabricName, change, reason } = body;
    
    if (!fabricName || change === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: fabricName, change, reason' },
        { status: 400 }
      );
    }
    
    const updatedFabric = await updateFabricInventory(fabricName, change, reason);
    
    if (!updatedFabric) {
      return NextResponse.json({ error: 'Fabric not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      fabric: updatedFabric,
      message: `Updated ${fabricName} by ${change > 0 ? '+' : ''}${change} meters`
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}

// GET /api/inventory - Get inventory logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const logs = await loadInventoryLogs(limit);
    
    return NextResponse.json({ 
      logs,
      totalCount: logs.length
    });
  } catch (error) {
    console.error('Error fetching inventory logs:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory logs' }, { status: 500 });
  }
}
