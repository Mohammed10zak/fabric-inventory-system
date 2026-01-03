import { NextRequest, NextResponse } from 'next/server';
import { 
  loadFabrics, 
  addFabric, 
  updateFabric, 
  deleteFabric,
  getLowStockFabrics,
  calculateInventoryValue
} from '@/lib/fabrics';

// GET /api/fabrics - Get all fabrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get('lowStock') === 'true';
    const threshold = parseInt(searchParams.get('threshold') || '10');
    
    if (lowStockOnly) {
      const lowStockFabrics = await getLowStockFabrics(threshold);
      return NextResponse.json({ 
        fabrics: lowStockFabrics,
        count: lowStockFabrics.length 
      });
    }
    
    const fabrics = await loadFabrics();
    const inventoryValue = await calculateInventoryValue();
    const lowStockFabrics = await getLowStockFabrics(threshold);
    
    return NextResponse.json({ 
      fabrics,
      stats: {
        totalTypes: fabrics.length,
        totalMeters: fabrics.reduce((sum, f) => sum + f.availableMeters, 0),
        inventoryValue,
        lowStockCount: lowStockFabrics.length,
      }
    });
  } catch (error) {
    console.error('Error fetching fabrics:', error);
    return NextResponse.json({ error: 'Failed to fetch fabrics' }, { status: 500 });
  }
}

// POST /api/fabrics - Add new fabric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, costPerMeter, availableMeters } = body;
    
    if (!name || costPerMeter === undefined || availableMeters === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, costPerMeter, availableMeters' },
        { status: 400 }
      );
    }
    
    const newFabric = await addFabric(name, costPerMeter, availableMeters);
    
    if (!newFabric) {
      return NextResponse.json({ error: 'Failed to add fabric' }, { status: 500 });
    }
    
    return NextResponse.json({ fabric: newFabric }, { status: 201 });
  } catch (error) {
    console.error('Error adding fabric:', error);
    return NextResponse.json({ error: 'Failed to add fabric' }, { status: 500 });
  }
}

// PUT /api/fabrics - Update fabric
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Fabric ID is required' }, { status: 400 });
    }
    
    const updatedFabric = await updateFabric(id, updates);
    
    if (!updatedFabric) {
      return NextResponse.json({ error: 'Fabric not found' }, { status: 404 });
    }
    
    return NextResponse.json({ fabric: updatedFabric });
  } catch (error) {
    console.error('Error updating fabric:', error);
    return NextResponse.json({ error: 'Failed to update fabric' }, { status: 500 });
  }
}

// DELETE /api/fabrics - Delete fabric
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Fabric ID is required' }, { status: 400 });
    }
    
    const deleted = await deleteFabric(id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Fabric not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fabric:', error);
    return NextResponse.json({ error: 'Failed to delete fabric' }, { status: 500 });
  }
}
