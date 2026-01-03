import { NextRequest, NextResponse } from 'next/server';
import { loadSettingsWithDetails, updateSetting } from '@/lib/fabrics';

// GET /api/settings - Get all settings
export async function GET() {
  try {
    const settings = await loadSettingsWithDetails();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT /api/settings - Update a setting
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;
    
    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: key, value' },
        { status: 400 }
      );
    }
    
    const success = await updateSetting(key, String(value));
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}