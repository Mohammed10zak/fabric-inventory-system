// Fabric Types
export interface Fabric {
  id: string;
  name: string;
  costPerMeter: number;
  availableMeters: number;
  updatedAt: string;
}

export interface FabricRequirements {
  fabrics: Record<string, number>;
  is_printed: boolean;
}

// Product Types
export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  images: {
    edges: Array<{
      node: {
        url: string;
        altText: string | null;
      };
    }>;
  };
  metafield: {
    value: string;
  } | null;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
      };
    }>;
  };
}

export interface ProductWithFabricCost {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  price: string;
  fabricRequirements: FabricRequirements | null;
  fabricCost: number;
  fabricBreakdown: Array<{
    fabricName: string;
    meters: number;
    costPerMeter: number;
    printCost: number;
    totalCost: number;
  }>;
}

// Order Types
export interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  totalPrice: string;
  totalPriceSet?: {
    shopMoney?: {
      amount: string;
      currencyCode: string;
    };
  };
  lineItems: {
    edges: Array<{
      node: {
        title: string;
        quantity: number;
        product: {
          id: string;
          metafield: {
            value: string;
          } | null;
        } | null;
      };
    }>;
  };
}

export interface OrderWithFabricUsage {
  id: string;
  name: string;
  createdAt: string;
  totalPrice: string;
  items: Array<{
    title: string;
    quantity: number;
    fabricRequirements: FabricRequirements | null;
    fabricCostPerUnit: number;
    totalFabricCost: number;
  }>;
  totalFabricCost: number;
  fabricUsage: Record<string, number>;
}

// Inventory Log Types
export interface InventoryLog {
  id: string;
  fabricId: string;
  fabricName: string;
  change: number;
  reason: string;
  timestamp: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalFabricTypes: number;
  totalInventoryValue: number;
  lowStockCount: number;
  totalMetersInStock: number;
}
