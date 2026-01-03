'use client';

import { useEffect, useState } from 'react';

interface Webhook {
  id: string;
  topic: string;
  endpoint: {
    callbackUrl: string;
  };
  createdAt: string;
}

export default function SettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks/register');
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    } catch (err) {
      setError('Failed to load webhooks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    
    // Set default callback URL based on current location
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      setCallbackUrl(`${baseUrl}/api/webhooks/order`);
    }
  }, []);

  const handleRegister = async () => {
    if (!callbackUrl) {
      setError('Please enter a callback URL');
      return;
    }

    setRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/webhooks/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackUrl })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || JSON.stringify(data.error) || 'Failed to register');
      }

      setSuccess('Webhook registered successfully! New orders will now auto-subtract fabric.');
      fetchWebhooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register webhook');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      await fetch(`/api/webhooks/register?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      setSuccess('Webhook deleted');
      fetchWebhooks();
    } catch (err) {
      setError('Failed to delete webhook');
    }
  };

  const hasOrderWebhook = webhooks.some(w => w.topic === 'ORDERS_CREATE');

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Configure automatic inventory updates
        </p>
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

      {/* Status Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-4 h-4 rounded-full ${hasOrderWebhook ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'}`}></div>
          <h2 className="text-xl font-semibold">Auto-Subtract Status</h2>
        </div>
        
        {hasOrderWebhook ? (
          <div className="p-4 bg-[var(--color-success)] bg-opacity-10 rounded-lg border border-[var(--color-success)]">
            <p className="text-[var(--color-success)] font-medium">✅ ACTIVE - Inventory will auto-subtract when orders come in</p>
          </div>
        ) : (
          <div className="p-4 bg-[var(--color-warning)] bg-opacity-10 rounded-lg border border-[var(--color-warning)]">
            <p className="text-[var(--color-warning)] font-medium">⚠️ INACTIVE - Register webhook below to enable auto-subtract</p>
          </div>
        )}
      </div>

      {/* Register Webhook */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Register Order Webhook</h2>
        <p className="text-[var(--color-text-muted)] mb-4">
          This webhook tells Shopify to notify your app when new orders are placed.
          The app will then automatically subtract fabric from inventory.
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Callback URL</label>
            <input
              type="url"
              value={callbackUrl}
              onChange={e => setCallbackUrl(e.target.value)}
              placeholder="https://your-app.vercel.app/api/webhooks/order"
              className="input"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              ⚠️ Must be a public HTTPS URL (won't work with localhost)
            </p>
          </div>
          
          <button
            onClick={handleRegister}
            disabled={registering || hasOrderWebhook}
            className="btn btn-primary"
          >
            {registering ? 'Registering...' : hasOrderWebhook ? 'Already Registered' : '🔗 Register Webhook'}
          </button>
        </div>
      </div>

      {/* Existing Webhooks */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Registered Webhooks</h2>
        
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="skeleton h-16 w-full"></div>
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-center py-8">
            No webhooks registered yet
          </p>
        ) : (
          <div className="space-y-3">
            {webhooks.map(webhook => (
              <div
                key={webhook.id}
                className="flex items-center justify-between p-4 bg-[var(--color-bg)] rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {webhook.topic === 'ORDERS_CREATE' ? '📦 ' : ''}
                    {webhook.topic}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] break-all">
                    {webhook.endpoint?.callbackUrl}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(webhook.id)}
                  className="btn btn-outline text-sm text-[var(--color-danger)] border-[var(--color-danger)]"
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="card p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">How Auto-Subtract Works</h2>
        <div className="space-y-4 text-[var(--color-text-muted)]">
          <div className="flex gap-3">
            <span className="text-2xl">1️⃣</span>
            <p>Customer places order on your Shopify store</p>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">2️⃣</span>
            <p>Shopify sends order details to your webhook URL</p>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">3️⃣</span>
            <p>Your app looks up each product's fabric requirements</p>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">4️⃣</span>
            <p>Fabric is automatically subtracted from inventory</p>
          </div>
          <div className="flex gap-3">
            <span className="text-2xl">5️⃣</span>
            <p>If stock falls below 10m, you'll see a warning on Dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
}
