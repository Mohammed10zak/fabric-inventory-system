'use client';

import { useEffect, useState } from 'react';

interface OrderItem {
  title: string;
  quantity: number;
  fabricRequirements: {
    fabrics: Record<string, number>;
    is_printed: boolean;
  } | null;
  fabricCostPerUnit: number;
  totalFabricCost: number;
}

interface Order {
  id: string;
  name: string;
  createdAt: string;
  totalPrice: string;
  items: OrderItem[];
  totalFabricCost: number;
  fabricUsage: Record<string, number>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalFabricUsage, setTotalFabricUsage] = useState<Record<string, number>>({});
  const [totalFabricCost, setTotalFabricCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch('/api/orders?limit=50');
        const data = await res.json();
        setOrders(data.orders || []);
        setTotalFabricUsage(data.totalFabricUsage || {});
        setTotalFabricCost(data.totalFabricCost || 0);
      } catch (err) {
        setError('Failed to load orders');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            View orders and fabric consumption
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-6">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Total Orders</p>
          <p className="text-3xl font-bold mono">{orders.length}</p>
        </div>
        
        <div className="stat-card">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Total Fabric Cost</p>
          <p className="text-3xl font-bold mono text-[var(--color-success)]">
            {totalFabricCost.toLocaleString()} EGP
          </p>
        </div>
        
        <div className="stat-card">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Fabric Types Used</p>
          <p className="text-3xl font-bold mono">{Object.keys(totalFabricUsage).length}</p>
        </div>
      </div>

      {/* Total Fabric Usage */}
      {Object.keys(totalFabricUsage).length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Total Fabric Usage (All Orders)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(totalFabricUsage).map(([fabric, meters]) => (
              <div key={fabric} className="p-4 bg-[var(--color-bg)] rounded-lg">
                <p className="text-sm text-[var(--color-text-muted)] capitalize">{fabric}</p>
                <p className="text-2xl font-bold mono">{meters.toFixed(1)} m</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Items</th>
                <th>Fabric Cost</th>
                <th>Order Total</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  <td><div className="skeleton h-6 w-24"></div></td>
                  <td><div className="skeleton h-6 w-32"></div></td>
                  <td><div className="skeleton h-6 w-16"></div></td>
                  <td><div className="skeleton h-6 w-20"></div></td>
                  <td><div className="skeleton h-6 w-20"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Items</th>
                <th>Fabric Cost (EGP)</th>
                <th>Order Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <span className="font-medium">{order.name}</span>
                  </td>
                  <td>
                    <span className="text-[var(--color-text-muted)]">
                      {formatDate(order.createdAt)}
                    </span>
                  </td>
                  <td>
                    <span className="mono">{order.items.length}</span>
                  </td>
                  <td>
                    <span className="mono font-bold text-[var(--color-success)]">
                      {order.totalFabricCost.toFixed(2)} EGP
                    </span>
                  </td>
                  <td>
                    <span className="mono">${order.totalPrice}</span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="btn btn-outline text-sm py-2"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[var(--color-text-muted)]">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">{selectedOrder.name}</h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-2xl text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Order Items */}
              <div className="p-4 bg-[var(--color-bg)] rounded-lg">
                <h3 className="font-semibold mb-3">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start py-2 border-b border-[var(--color-border)] last:border-0">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Qty: {item.quantity} × {item.fabricCostPerUnit.toFixed(2)} EGP
                        </p>
                      </div>
                      <p className="mono font-bold">{item.totalFabricCost.toFixed(2)} EGP</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fabric Usage */}
              {Object.keys(selectedOrder.fabricUsage).length > 0 && (
                <div className="p-4 bg-[var(--color-bg)] rounded-lg">
                  <h3 className="font-semibold mb-3">Fabric Usage</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(selectedOrder.fabricUsage).map(([fabric, meters]) => (
                      <div key={fabric} className="flex justify-between">
                        <span className="capitalize">{fabric}</span>
                        <span className="mono">{meters.toFixed(1)} m</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="p-4 bg-[var(--color-primary)] bg-opacity-10 rounded-lg border border-[var(--color-primary)]">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Fabric Cost</span>
                  <span className="text-2xl font-bold mono">
                    {selectedOrder.totalFabricCost.toFixed(2)} EGP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
