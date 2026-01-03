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

interface Setting {
  id: string;
  key: string;
  value: string;
  label: string;
  description: string;
}

export default function SettingsPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchData = async () => {
    try {
      const [webhooksRes, settingsRes] = await Promise.all([
        fetch('/api/webhooks/register'),
        fetch('/api/settings')
      ]);
      
      const webhooksData = await webhooksRes.json();
      const settingsData = await settingsRes.json();
      
      setWebhooks(webhooksData.webhooks || []);
      setSettings(settingsData.settings || []);
      
      // Initialize editing values
      const editValues: Record<string, string> = {};
      (settingsData.settings || []).forEach((s: Setting) => {
        editValues[s.key] = s.value;
      });
      setEditingSettings(editValues);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
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

      setSuccess('Webhook registered successfully!');
      fetchData();
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
      fetchData();
    } catch (err) {
      setError('Failed to delete webhook');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      for (const setting of settings) {
        if (editingSettings[setting.key] !== setting.value) {
          const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              key: setting.key, 
              value: editingSettings[setting.key] 
            })
          });

          if (!res.ok) {
            throw new Error(`Failed to update ${setting.label}`);
          }
        }
      }

      setSuccess('Settings saved successfully!');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const hasOrderWebhook = webhooks.some(w => w.topic === 'ORDERS_CREATE');
  const hasSettingsChanges = settings.some(s => editingSettings[s.key] !== s.value);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Configure system settings and webhooks
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

      {/* Fabric Configuration Settings */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">⚙️ Fabric Configuration</h2>
        <p className="text-[var(--color-text-muted)] mb-6">
          Configure costs and thresholds for fabric calculations
        </p>

        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-12 w-full"></div>
            <div className="skeleton h-12 w-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {settings.map(setting => (
              <div key={setting.id} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-4 bg-[var(--color-bg)] rounded-lg">
                <div className="flex-1">
                  <label className="block font-medium">{setting.label}</label>
                  <p className="text-sm text-[var(--color-text-muted)]">{setting.description}</p>
                </div>
                <div className="w-full md:w-32">
                  <input
                    type="number"
                    value={editingSettings[setting.key] || ''}
                    onChange={e => setEditingSettings({
                      ...editingSettings,
                      [setting.key]: e.target.value
                    })}
                    className="input text-center"
                    min="0"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings || !hasSettingsChanges}
              className="btn btn-primary mt-4"
            >
              {savingSettings ? 'Saving...' : hasSettingsChanges ? '💾 Save Changes' : 'No Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Webhook Status */}
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
        <h2 className="text-xl font-semibold mb-4">🔗 Register Order Webhook</h2>
        <p className="text-[var(--color-text-muted)] mb-4">
          This webhook tells Shopify to notify your app when new orders are placed.
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
          <div className="skeleton h-16 w-full"></div>
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
    </div>
  );
}