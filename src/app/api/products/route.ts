import { NextRequest, NextResponse } from "next/server";
import { fetchProducts } from "@/lib/shopify";
import {
  loadFabrics,
  calculateFabricCost,
  parseFabricRequirements,
  getSetting,
} from "@/lib/fabrics";
import { ProductWithFabricCost } from "@/types";

// GET /api/products - Get all products with fabric costs
export async function GET(request: NextRequest) {
  try {
    const shopifyProducts = await fetchProducts();
    const fabrics = await loadFabrics();

    // Get print cost from database settings
    const printCostStr = await getSetting("print_cost_per_meter", "25");
    const printCostPerMeter = parseInt(printCostStr);

    const productsWithCosts: ProductWithFabricCost[] = shopifyProducts.map(
      (product) => {
        const fabricRequirements = parseFabricRequirements(
          product.metafield?.value || null
        );
        const { totalCost, breakdown } = calculateFabricCost(
          fabricRequirements,
          fabrics,
          printCostPerMeter
        );

        return {
          id: product.id,
          title: product.title,
          handle: product.handle,
          image: product.images.edges[0]?.node.url || null,
          price: product.variants.edges[0]?.node.price || "0",
          fabricRequirements,
          fabricCost: totalCost,
          fabricBreakdown: breakdown,
        };
      }
    );

    // Filter to only products with fabric requirements if requested
    const { searchParams } = new URL(request.url);
    const withFabricOnly = searchParams.get("withFabric") === "true";

    const filteredProducts = withFabricOnly
      ? productsWithCosts.filter((p) => p.fabricRequirements !== null)
      : productsWithCosts;

    return NextResponse.json({
      products: filteredProducts,
      count: filteredProducts.length,
      printCostPerMeter,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
