import { ShopifyProduct, ShopifyOrder } from '@/types';

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL!;
const SHOPIFY_ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';

const shopifyAdminUrl = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

async function shopifyAdminFetch(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(shopifyAdminUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`);
  }

  const json = await response.json();
  
  if (json.errors) {
    console.error('Shopify GraphQL Errors:', json.errors);
    throw new Error(json.errors[0]?.message || 'GraphQL Error');
  }

  return json.data;
}

// Fetch all ACTIVE products with fabric requirements metafield (with pagination)
export async function fetchProducts(): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const query = `
      query GetProducts($first: Int!, $query: String, $after: String) {
        products(first: $first, query: $query, after: $after) {
          edges {
            node {
              id
              title
              handle
              status
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              metafield(namespace: "custom", key: "fabric_requirements") {
                value
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    title
                    price
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `;

    const data = await shopifyAdminFetch(query, { 
      first: 250, // Max allowed by Shopify
      query: "status:active",
      after: cursor
    });

    const products = data.products.edges.map((edge: { node: ShopifyProduct; cursor: string }) => edge.node);
    allProducts.push(...products);

    hasNextPage = data.products.pageInfo.hasNextPage;
    if (hasNextPage && data.products.edges.length > 0) {
      cursor = data.products.edges[data.products.edges.length - 1].cursor;
    }
  }

  return allProducts;
}

// Fetch single product by ID
export async function fetchProductById(id: string): Promise<ShopifyProduct | null> {
  const query = `
    query GetProduct($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        status
        images(first: 1) {
          edges {
            node {
              url
              altText
            }
          }
        }
        metafield(namespace: "custom", key: "fabric_requirements") {
          value
        }
        variants(first: 1) {
          edges {
            node {
              id
              title
              price
            }
          }
        }
      }
    }
  `;

  const data = await shopifyAdminFetch(query, { id });
  return data.product;
}

// Fetch orders
export async function fetchOrders(first: number = 50): Promise<ShopifyOrder[]> {
  const query = `
    query GetOrders($first: Int!) {
      orders(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            lineItems(first: 50) {
              edges {
                node {
                  title
                  quantity
                  product {
                    id
                    metafield(namespace: "custom", key: "fabric_requirements") {
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyAdminFetch(query, { first });
  return data.orders.edges.map((edge: { node: ShopifyOrder }) => ({
    ...edge.node,
    totalPrice: edge.node.totalPriceSet?.shopMoney?.amount || '0',
  }));
}

// Fetch single order by ID
export async function fetchOrderById(id: string): Promise<ShopifyOrder | null> {
  const query = `
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 50) {
          edges {
            node {
              title
              quantity
              product {
                id
                metafield(namespace: "custom", key: "fabric_requirements") {
                  value
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyAdminFetch(query, { id });
  if (!data.order) return null;
  
  return {
    ...data.order,
    totalPrice: data.order.totalPriceSet?.shopMoney?.amount || '0',
  };
}
