import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL!;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

interface ImportRow {
  productTitle: string;
  fabric1: string;
  meters1: number;
  fabric2: string;
  meters2: number;
  isPrinted: boolean;
}

// Update Shopify product metafield
async function updateProductMetafield(productId: string, fabricData: object): Promise<boolean> {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  
  const mutation = `
    mutation UpdateProductMetafield($input: ProductInput!) {
      productUpdate(input: $input) {
        product {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        input: {
          id: productId,
          metafields: [
            {
              namespace: 'custom',
              key: 'fabric_requirements',
              value: JSON.stringify(fabricData),
              type: 'json',
            },
          ],
        },
      },
    }),
  });

  const data = await response.json();
  return !data.data?.productUpdate?.userErrors?.length;
}

// Find product by title
async function findProductByTitle(title: string): Promise<string | null> {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  
  const query = `
    query FindProduct($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query,
      variables: { query: `title:"${title}"` },
    }),
  });

  const data = await response.json();
  const product = data.data?.products?.edges?.[0]?.node;
  
  if (product && product.title.toLowerCase() === title.toLowerCase()) {
    return product.id;
  }
  
  return null;
}

// POST /api/import - Import Excel file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const results: Array<{
      productTitle: string;
      status: 'success' | 'failed' | 'skipped';
      message: string;
    }> = [];

    let successCount = 0;
    let failedCount = 0;

    for (const row of rows as Record<string, unknown>[]) {
      const productTitle = String(row['Product Title'] || row['product title'] || row['Title'] || '').trim();
      
      if (!productTitle) {
        continue; // Skip empty rows
      }

      const fabric1 = String(row['Fabric 1'] || row['fabric 1'] || '').trim().toLowerCase();
      const meters1 = parseFloat(String(row['Meters 1'] || row['meters 1'] || 0)) || 0;
      const fabric2 = String(row['Fabric 2'] || row['fabric 2'] || '').trim().toLowerCase();
      const meters2 = parseFloat(String(row['Meters 2'] || row['meters 2'] || 0)) || 0;
      const isPrintedRaw = String(row['Is Printed'] || row['is printed'] || row['Printed'] || 'no').toLowerCase();
      const isPrinted = isPrintedRaw === 'yes' || isPrintedRaw === 'true' || isPrintedRaw === '1';

      // Skip if no fabric data
      if (!fabric1 && !fabric2) {
        results.push({
          productTitle,
          status: 'skipped',
          message: 'No fabric data provided',
        });
        continue;
      }

      // Build fabric requirements object
      const fabrics: Record<string, number> = {};
      if (fabric1 && meters1 > 0) {
        fabrics[fabric1] = meters1;
      }
      if (fabric2 && meters2 > 0) {
        fabrics[fabric2] = meters2;
      }

      const fabricData = {
        fabrics,
        is_printed: isPrinted,
      };

      // Find product in Shopify
      const productId = await findProductByTitle(productTitle);
      
      if (!productId) {
        results.push({
          productTitle,
          status: 'failed',
          message: 'Product not found in Shopify',
        });
        failedCount++;
        continue;
      }

      // Update metafield
      const success = await updateProductMetafield(productId, fabricData);
      
      if (success) {
        results.push({
          productTitle,
          status: 'success',
          message: `Updated: ${JSON.stringify(fabricData)}`,
        });
        successCount++;
      } else {
        results.push({
          productTitle,
          status: 'failed',
          message: 'Failed to update metafield',
        });
        failedCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Log the import
    await supabase.from('import_logs').insert({
      filename: file.name,
      total_products: results.length,
      success_count: successCount,
      failed_count: failedCount,
      details: results,
    });

    return NextResponse.json({
      success: true,
      totalProcessed: results.length,
      successCount,
      failedCount,
      results,
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

// GET /api/import - Get import history
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('import_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ logs: data });
  } catch (error) {
    console.error('Error fetching import logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}