'use client';

import { useEffect, useState } from 'react';

interface Fabric {
  id: string;
  name: string;
  costPerMeter: number;
  availableMeters: number;
  updatedAt: string;
}

interface InventoryLog {
  id: string;
  fabricId: string;
  fabricName: string;
  change: number;
  reason: string;
  timestamp: string;
}

export default function InventoryPage() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [selectedFabric, setSelectedFabric] = useState('');
  const [changeAmount, setChangeAmount] = useState('');
  const [changeType, setChangeType] = useState<'add' | 'subtract'>('add');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [fabricsRes, logsRes] = await Promise.all([
        fetch('/api/fabrics'),
        fetch('/api/inventory?limit=20')
      ]);
      
      const fabricsData = await fabricsRes.json();
      const logsData = await logsRes.json();
      
      setFabrics(fabricsData.fabrics || []);
      setLogs(logsData.logs || []);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFabric || !changeAmount || !reason) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const change = changeType === 'add' 
        ? parseFloat(changeAmount) 
        : -parseFloat(changeAmount);

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fabricName: selectedFabric,
          change,
          reason
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update inventory');
      }

      setSuccess(data.message);
      setChangeAmount('');
      setReason('');
      
      // Refresh data
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const lowStockFabrics = fabrics.filter(f => f.availableMeters < 10);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            Update fabric stock levels
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockFabrics.length > 0 && (
        <div className="alert alert-warning mb-6">
          <span className="text-xl">⚠️</span>
          <div>
            <strong>Low Stock Alert!</strong>
            <p className="text-sm mt-1">
              {lowStockFabrics.map(f => `${f.name} (${f.availableMeters}m)`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-6">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">×</button>
        </div>
      )}

      {success && (
        <div className="alert mb-6" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--color-success)' }}>
          <span>✅</span>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-auto">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Inventory Form */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Update Inventory</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fabric Type</label>
              <select
                value={selectedFabric}
                onChange={e => setSelectedFabric(e.target.value)}
                className="input"
                required
              >
                <option value="">Select fabric...</option>
                {fabrics.map(fabric => (
                  <option key={fabric.id} value={fabric.name}>
                    {fabric.name} ({fabric.availableMeters}m available)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Change Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChangeType('add')}
                  className={`btn flex-1 ${changeType === 'add' ? 'btn-success' : 'btn-outline'}`}
                >
                  ➕ Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setChangeType('subtract')}
                  className={`btn flex-1 ${changeType === 'subtract' ? 'btn-danger' : 'btn-outline'}`}
                >
                  ➖ Remove Stock
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Amount (meters)</label>
              <input
                type="number"
                value={changeAmount}
                onChange={e => setChangeAmount(e.target.value)}
                placeholder="Enter meters..."
                className="input"
                min="0"
                step="0.1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g., Factory delivery, Order #1234..."
                className="input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full"
            >
              {submitting ? 'Updating...' : 'Update Inventory'}
            </button>
          </form>
        </div>

        {/* Current Stock */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-6">Current Stock</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="skeleton h-16 w-full"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {fabrics.map(fabric => (
                <div
                  key={fabric.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    fabric.availableMeters < 10 
                      ? 'bg-[var(--color-warning)] bg-opacity-10 border border-[var(--color-warning)]' 
                      : 'bg-[var(--color-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🧵</span>
                    <div>
                      <p className="font-medium capitalize">{fabric.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {fabric.costPerMeter} EGP/m
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold mono ${
                      fabric.availableMeters < 10 ? 'text-[var(--color-warning)]' : ''
                    }`}>
                      {fabric.availableMeters} m
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      = {(fabric.availableMeters * fabric.costPerMeter).toLocaleString()} EGP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>
        
        {logs.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-center py-8">
            No inventory changes recorded yet
          </p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-[var(--color-bg)] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xl ${log.change > 0 ? '' : ''}`}>
                    {log.change > 0 ? '📥' : '📤'}
                  </span>
                  <div>
                    <p className="font-medium capitalize">{log.fabricName}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">{log.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold mono ${
                    log.change > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
                  }`}>
                    {log.change > 0 ? '+' : ''}{log.change} m
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {formatDate(log.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
