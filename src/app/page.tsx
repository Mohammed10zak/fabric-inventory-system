'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Fabric {
  id: string;
  name: string;
  costPerMeter: number;
  availableMeters: number;
  updatedAt: string;
}

interface Stats {
  totalTypes: number;
  totalMeters: number;
  inventoryValue: number;
  lowStockCount: number;
}

interface Product {
  id: string;
  title: string;
  fabricCost: number;
  fabricRequirements: {
    fabrics: Record<string, number>;
    is_printed: boolean;
  } | null;
}

export default function Dashboard() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch fabrics
        const fabricsRes = await fetch('/api/fabrics');
        const fabricsData = await fabricsRes.json();
        setFabrics(fabricsData.fabrics);
        setStats(fabricsData.stats);

        // Fetch products with fabric data
        const productsRes = await fetch('/api/products?withFabric=true');
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const lowStockFabrics = fabrics.filter(f => f.availableMeters < 10);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton h-4 w-24 mb-2"></div>
              <div className="skeleton h-8 w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">
        <span>⚠️</span>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="text-sm text-[var(--color-text-muted)]">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockFabrics.length > 0 && (
        <div className="alert alert-warning mb-6">
          <span className="text-xl">⚠️</span>
          <div>
            <strong>Low Stock Alert!</strong>
            <p className="text-sm mt-1">
              {lowStockFabrics.map(f => f.name).join(', ')} - below 10 meters
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Total Fabric Types</p>
          <p className="text-3xl font-bold mono">{stats?.totalTypes || 0}</p>
        </div>
        
        <div className="stat-card">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Total Meters in Stock</p>
          <p className="text-3xl font-bold mono">{stats?.totalMeters?.toFixed(1) || 0} m</p>
        </div>
        
        <div className="stat-card">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Inventory Value</p>
          <p className="text-3xl font-bold mono">{stats?.inventoryValue?.toLocaleString() || 0} EGP</p>
        </div>
        
        <div className="stat-card">
          <p className="text-sm text-[var(--color-text-muted)] mb-1">Low Stock Items</p>
          <p className={`text-3xl font-bold mono ${stats?.lowStockCount ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
            {stats?.lowStockCount || 0}
          </p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fabric Inventory */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Fabric Inventory</h2>
            <Link href="/inventory" className="text-sm text-[var(--color-primary)] hover:underline">
              View all →
            </Link>
          </div>
          
          <div className="space-y-3">
            {fabrics.map(fabric => (
              <div key={fabric.id} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🧵</span>
                  <div>
                    <p className="font-medium capitalize">{fabric.name}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{fabric.costPerMeter} EGP/m</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold mono ${fabric.availableMeters < 10 ? 'text-[var(--color-warning)]' : ''}`}>
                    {fabric.availableMeters} m
                  </p>
                  <span className={`badge ${fabric.availableMeters < 10 ? 'badge-warning' : 'badge-success'}`}>
                    {fabric.availableMeters < 10 ? 'Low' : 'OK'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Products with Fabric Cost */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Products Fabric Cost</h2>
            <Link href="/products" className="text-sm text-[var(--color-primary)] hover:underline">
              View all →
            </Link>
          </div>
          
          <div className="space-y-3">
            {products.slice(0, 5).map(product => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👗</span>
                  <div>
                    <p className="font-medium">{product.title.slice(0, 30)}...</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {product.fabricRequirements?.is_printed ? '🖨️ Printed' : 'Plain'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold mono text-[var(--color-success)]">
                    {product.fabricCost.toFixed(2)} EGP
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">fabric cost</p>
                </div>
              </div>
            ))}
            
            {products.length === 0 && (
              <p className="text-[var(--color-text-muted)] text-center py-4">
                No products with fabric data found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
