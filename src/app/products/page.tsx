'use client';

import { useEffect, useState, useMemo } from 'react';

interface FabricBreakdown {
  fabricName: string;
  meters: number;
  costPerMeter: number;
  printCost: number;
  totalCost: number;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  image: string | null;
  price: string;
  fabricRequirements: {
    fabrics: Record<string, number>;
    is_printed: boolean;
  } | null;
  fabricCost: number;
  fabricBreakdown: FabricBreakdown[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'withFabric'>('withFabric');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const url = filter === 'withFabric' 
          ? '/api/products?withFabric=true' 
          : '/api/products';
        const res = await fetch(url);
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        setError('Failed to load products');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [filter]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(product => 
      product.title.toLowerCase().includes(query) ||
      product.handle.toLowerCase().includes(query) ||
      Object.keys(product.fabricRequirements?.fabrics || {}).some(
        fabric => fabric.toLowerCase().includes(query)
      )
    );
  }, [products, searchQuery]);

  const getTotalMeters = (product: Product) => {
    if (!product.fabricRequirements) return 0;
    return Object.values(product.fabricRequirements.fabrics).reduce((sum, m) => sum + m, 0);
  };

  const getFabricNames = (product: Product) => {
    if (!product.fabricRequirements) return '-';
    return Object.keys(product.fabricRequirements.fabrics).join(', ');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            {loading ? 'Loading...' : `${filteredProducts.length} of ${products.length} products`}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('withFabric')}
            className={`btn ${filter === 'withFabric' ? 'btn-primary' : 'btn-outline'}`}
          >
            With Fabric Data
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          >
            All Products
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products by name or fabric type..."
            className="input pl-12"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-6">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Fabrics</th>
                <th>Meters</th>
                <th>Printed</th>
                <th>Fabric Cost</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  <td><div className="skeleton h-6 w-48"></div></td>
                  <td><div className="skeleton h-6 w-24"></div></td>
                  <td><div className="skeleton h-6 w-16"></div></td>
                  <td><div className="skeleton h-6 w-12"></div></td>
                  <td><div className="skeleton h-6 w-20"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Fabrics</th>
                  <th>Total Meters</th>
                  <th>Printed</th>
                  <th>Fabric Cost (EGP)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-[var(--color-bg)] rounded-lg flex items-center justify-center">
                            👗
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{product.title}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            ${product.price}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="capitalize">{getFabricNames(product)}</span>
                    </td>
                    <td>
                      <span className="mono">{getTotalMeters(product).toFixed(1)} m</span>
                    </td>
                    <td>
                      {product.fabricRequirements?.is_printed ? (
                        <span className="badge badge-warning">🖨️ Yes</span>
                      ) : product.fabricRequirements ? (
                        <span className="badge badge-success">No</span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">-</span>
                      )}
                    </td>
                    <td>
                      {product.fabricCost > 0 ? (
                        <span className="mono font-bold text-[var(--color-success)]">
                          {product.fabricCost.toFixed(2)} EGP
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">-</span>
                      )}
                    </td>
                    <td>
                      {product.fabricRequirements ? (
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="btn btn-outline text-sm py-2"
                        >
                          View Details
                        </button>
                      ) : (
                        <span className="text-[var(--color-text-muted)] text-sm">No fabric data</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[var(--color-text-muted)]">
                      {searchQuery ? `No products found matching "${searchQuery}"` : 'No products found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
            <div className="flex flex-wrap gap-4 text-sm">
              <p className="text-[var(--color-text-muted)]">
                Showing <strong className="text-[var(--color-text)]">{filteredProducts.length}</strong> 
                {searchQuery && ` of ${products.length}`} products
                {filter === 'withFabric' && ' with fabric data'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">{selectedProduct.title}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-2xl text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ×
              </button>
            </div>

            {selectedProduct.fabricRequirements ? (
              <div className="space-y-4">
                <div className="p-4 bg-[var(--color-bg)] rounded-lg">
                  <h3 className="font-semibold mb-3">Fabric Breakdown</h3>
                  <div className="space-y-2">
                    {selectedProduct.fabricBreakdown.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-[var(--color-border)] last:border-0">
                        <div>
                          <p className="font-medium capitalize">{item.fabricName}</p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {item.meters} m × {item.costPerMeter} EGP
                            {item.printCost > 0 && ` + ${item.printCost} print`}
                          </p>
                        </div>
                        <p className="mono font-bold">{item.totalCost.toFixed(2)} EGP</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-primary)] bg-opacity-10 rounded-lg border border-[var(--color-primary)]">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Fabric Cost</span>
                    <span className="text-2xl font-bold mono">
                      {selectedProduct.fabricCost.toFixed(2)} EGP
                    </span>
                  </div>
                </div>

                <div className="text-sm text-[var(--color-text-muted)]">
                  <p>
                    {selectedProduct.fabricRequirements.is_printed 
                      ? '🖨️ This product uses printed fabric (+25 EGP/m)'
                      : '📦 This product uses plain fabric'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[var(--color-text-muted)]">
                No fabric data available for this product
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
