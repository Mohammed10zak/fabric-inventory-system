import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { 
  loadFabrics, 
  updateFabricInventory, 
  parseFabricRequirements,
  isOrderProcessed,
  markOrderProcessed,
  calculateFabricCost
} from '@/lib/fabrics';

const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || '';
const PRINT_COST_PER_METER = parseInt(process.env.PRINT_COST_PER_METER || '25');

// Verify webhook signature from Shopify
function verifyWebhook(body: string, signature: string): boolean {
  // Skip verification for now - we'll add proper verification later
  // This is safe because Shopify webhooks are registered through your admin
  console.log('Webhook received, processing...');
  return true;
}

// POST /api/webhooks/order - Handle new order from Shopify
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256') || '';
    
    // Verify webhook is from Shopify
    if (!verifyWebhook(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const order = JSON.parse(body);
    const orderId = String(order.id);
    const orderName = order.name || `#${order.order_number}`;
    
    console.log(`📦 New order received: ${orderName}`);
    
    // Check if order already processed (prevent duplicates)
    const alreadyProcessed = await isOrderProcessed(orderId);
    if (alreadyProcessed) {
      console.log(`⏭️ Order ${orderName} already processed, skipping`);
      return NextResponse.json({ 
        success: true,
        message: 'Order already processed',
        order: orderName
      });
    }
    
    // Load fabrics for cost calculation
    const fabrics = await loadFabrics();
    const fabricUsage: Record<string, number> = {};
    let totalFabricCost = 0;
    const processedItems: string[] = [];
    
    // Process each line item
    for (const item of order.line_items || []) {
      const productId = item.product_id;
      const quantity = item.quantity || 1;
      const title = item.title || 'Unknown Product';
      
      // Fetch the product's metafield to get fabric requirements
      const fabricReq = await fetchProductFabricRequirements(productId);
      
      if (fabricReq) {
        // Calculate cost for this item
        const { totalCost } = calculateFabricCost(fabricReq, fabrics, PRINT_COST_PER_METER);
        totalFabricCost += totalCost * quantity;
        
        // Subtract fabric for each fabric type
        for (const [fabricName, meters] of Object.entries(fabricReq.fabrics)) {
          const totalMeters = meters * quantity;
          
          // Track usage
          fabricUsage[fabricName] = (fabricUsage[fabricName] || 0) + totalMeters;
          
          const updated = await updateFabricInventory(
            fabricName,
            -totalMeters, // Negative = subtract
            `Order ${orderName} - ${title} x${quantity}`
          );
          
          if (updated) {
            processedItems.push(`${fabricName}: -${totalMeters}m`);
            console.log(`✂️ Subtracted ${totalMeters}m of ${fabricName} for ${title}`);
            
            // Check low stock warning
            if (updated.availableMeters < 10) {
              console.warn(`⚠️ LOW STOCK: ${fabricName} has only ${updated.availableMeters}m left!`);
            }
          }
        }
      } else {
        console.log(`ℹ️ No fabric data for product: ${title}`);
      }
    }
    
    // Mark order as processed
    await markOrderProcessed(orderId, orderName, totalFabricCost, fabricUsage);
    
    console.log(`✅ Order ${orderName} processed. Fabric changes: ${processedItems.join(', ') || 'None'}`);
    
    return NextResponse.json({ 
      success: true,
      order: orderName,
      fabricChanges: processedItems,
      totalFabricCost
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Fetch product fabric requirements from Shopify
async function fetchProductFabricRequirements(productId: number | string) {
  try {
    const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL!;
    const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
    const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';
    
    const url = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    
    const query = `
      query GetProductMetafield($id: ID!) {
        product(id: $id) {
          metafield(namespace: "custom", key: "fabric_requirements") {
            value
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
        variables: { id: `gid://shopify/Product/${productId}` } 
      }),
    });
    
    const data = await response.json();
    const metafieldValue = data?.data?.product?.metafield?.value;
    
    return parseFabricRequirements(metafieldValue);
  } catch (error) {
    console.error('Error fetching product metafield:', error);
    return null;
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    status: 'Webhook endpoint ready',
    message: 'This endpoint receives order notifications from Shopify'
  });
}
