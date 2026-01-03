import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL!;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

// POST /api/webhooks/register - Register webhook with Shopify
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { callbackUrl } = body;
    
    if (!callbackUrl) {
      return NextResponse.json(
        { error: 'callbackUrl is required' },
        { status: 400 }
      );
    }
    
    const shopifyUrl = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    
    // Create webhook subscription for orders/create
    const mutation = `
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          webhookSubscription {
            id
            topic
            endpoint {
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          topic: 'ORDERS_CREATE',
          webhookSubscription: {
            callbackUrl: callbackUrl,
            format: 'JSON'
          }
        }
      }),
    });
    
    const data = await response.json();
    
    if (data.errors) {
      return NextResponse.json({ error: data.errors }, { status: 400 });
    }
    
    const result = data.data?.webhookSubscriptionCreate;
    
    if (result?.userErrors?.length > 0) {
      return NextResponse.json({ error: result.userErrors }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      webhook: result?.webhookSubscription,
      message: 'Webhook registered successfully!'
    });
    
  } catch (error) {
    console.error('Error registering webhook:', error);
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 });
  }
}

// GET /api/webhooks/register - List existing webhooks
export async function GET() {
  try {
    const shopifyUrl = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    
    const query = `
      query {
        webhookSubscriptions(first: 20) {
          edges {
            node {
              id
              topic
              endpoint {
                ... on WebhookHttpEndpoint {
                  callbackUrl
                }
              }
              createdAt
            }
          }
        }
      }
    `;
    
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    });
    
    const data = await response.json();
    const webhooks = data.data?.webhookSubscriptions?.edges?.map((e: { node: unknown }) => e.node) || [];
    
    return NextResponse.json({ webhooks });
    
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

// DELETE /api/webhooks/register - Delete a webhook
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Webhook ID is required' }, { status: 400 });
    }
    
    const shopifyUrl = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
    
    const mutation = `
      mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
          deletedWebhookSubscriptionId
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: mutation,
        variables: { id }
      }),
    });
    
    const data = await response.json();
    
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
