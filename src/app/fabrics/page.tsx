'use client';

import { useEffect, useState } from 'react';

interface Fabric {
  id: string;
  name: string;
  costPerMeter: number;
  availableMeters: number;
  updatedAt: string;
}

export default function FabricsPage() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingFabric, setEditingFabric] = useState<Fabric | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formMeters, setFormMeters] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFabrics = async () => {
    try {
      const res = await fetch('/api/fabrics');
      const data = await res.json();
      setFabrics(data.fabrics || []);
    } catch (err) {
      setError('Failed to load fabrics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFabrics();
  }, []);

  const openAddModal = () => {
    setEditingFabric(null);
    setFormName('');
    setFormCost('');
    setFormMeters('100');
    setShowModal(true);
  };

  const openEditModal = (fabric: Fabric) => {
    setEditingFabric(fabric);
    setFormName(fabric.name);
    setFormCost(String(fabric.costPerMeter));
    setFormMeters(String(fabric.availableMeters));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formName || !formCost) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingFabric) {
        // Update existing fabric
        const res = await fetch('/api/fabrics', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingFabric.id,
            name: formName,
            costPerMeter: parseFloat(formCost),
            availableMeters: parseFloat(formMeters)
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update fabric');
        }

        setSuccess('Fabric updated successfully');
      } else {
        // Add new fabric
        const res = await fetch('/api/fabrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            costPerMeter: parseFloat(formCost),
            availableMeters: parseFloat(formMeters)
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to add fabric');
        }

        setSuccess('Fabric added successfully');
      }

      setShowModal(false);
      fetchFabrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (fabric: Fabric) => {
    if (!confirm(`Are you sure you want to delete "${fabric.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/fabrics?id=${fabric.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete fabric');
      }

      setSuccess('Fabric deleted successfully');
      fetchFabrics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fabric');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Fabric Types</h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            Manage fabric types and costs
          </p>
        </div>
        
        <button onClick={openAddModal} className="btn btn-primary">
          ➕ Add Fabric
        </button>
      </div>

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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-6">
              <div className="skeleton h-8 w-32 mb-4"></div>
              <div className="skeleton h-6 w-24 mb-2"></div>
              <div className="skeleton h-6 w-20"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fabrics.map(fabric => (
            <div key={fabric.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🧵</span>
                  <h3 className="text-xl font-semibold capitalize">{fabric.name}</h3>
                </div>
                <span className={`badge ${fabric.availableMeters < 10 ? 'badge-warning' : 'badge-success'}`}>
                  {fabric.availableMeters < 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Cost per meter</span>
                  <span className="font-bold mono">{fabric.costPerMeter} EGP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Available</span>
                  <span className={`font-bold mono ${fabric.availableMeters < 10 ? 'text-[var(--color-warning)]' : ''}`}>
                    {fabric.availableMeters} m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-text-muted)]">Total Value</span>
                  <span className="font-bold mono text-[var(--color-success)]">
                    {(fabric.costPerMeter * fabric.availableMeters).toLocaleString()} EGP
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(fabric)}
                  className="btn btn-outline flex-1 text-sm"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(fabric)}
                  className="btn btn-outline flex-1 text-sm text-[var(--color-danger)] border-[var(--color-danger)]"
                >
                  🗑️ Delete
                </button>
              </div>

              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Last updated: {formatDate(fabric.updatedAt)}
              </p>
            </div>
          ))}

          {fabrics.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-[var(--color-text-muted)] mb-4">No fabrics added yet</p>
              <button onClick={openAddModal} className="btn btn-primary">
                Add Your First Fabric
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">
                {editingFabric ? 'Edit Fabric' : 'Add New Fabric'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-2xl text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fabric Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., cotton, silk, chiffon..."
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cost per Meter (EGP)</label>
                <input
                  type="number"
                  value={formCost}
                  onChange={e => setFormCost(e.target.value)}
                  placeholder="e.g., 60"
                  className="input"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Available Meters</label>
                <input
                  type="number"
                  value={formMeters}
                  onChange={e => setFormMeters(e.target.value)}
                  placeholder="e.g., 100"
                  className="input"
                  min="0"
                  step="0.1"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? 'Saving...' : editingFabric ? 'Update Fabric' : 'Add Fabric'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
