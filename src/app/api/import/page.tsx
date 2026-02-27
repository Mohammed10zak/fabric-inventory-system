'use client';

import { useState } from 'react';

interface ImportResult {
  productTitle: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<{
    totalProcessed: number;
    successCount: number;
    failedCount: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setSummary(null);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResults(data.results);
      setSummary({
        totalProcessed: data.totalProcessed,
        successCount: data.successCount,
        failedCount: data.failedCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Product Title,Fabric 1,Meters 1,Fabric 2,Meters 2,Is Printed
Autumn Whisper Chiffon Crepe Hijab,chiffon,1.5,,,No
Blossom Veil Printed Prayer Gown,satin,3.5,,,Yes
Contrast Trim Flowing Modest Abaya Dress,lace,3.0,lining,2.5,No
Royal Orchid Floral Modest Maxi Dress,lace,3.0,lining,2.5,Yes`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fabric_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import Fabric Requirements</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Bulk update product fabric data via Excel/CSV
        </p>
      </div>

      {/* Instructions */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📋 Instructions</h2>
        <div className="space-y-3 text-[var(--color-text-muted)]">
          <p>1. Download the template file</p>
          <p>2. Fill in your product fabric data</p>
          <p>3. Upload the file and click Import</p>
        </div>

        <div className="mt-4 p-4 bg-[var(--color-bg)] rounded-lg">
          <h3 className="font-medium mb-2">Excel Columns:</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-text-muted)]">
                <th className="pb-2">Column</th>
                <th className="pb-2">Example</th>
                <th className="pb-2">Required</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Product Title</td><td>Royal Orchid Dress</td><td>✅ Yes</td></tr>
              <tr><td>Fabric 1</td><td>lace</td><td>✅ Yes</td></tr>
              <tr><td>Meters 1</td><td>3.0</td><td>✅ Yes</td></tr>
              <tr><td>Fabric 2</td><td>lining</td><td>Optional</td></tr>
              <tr><td>Meters 2</td><td>2.5</td><td>Optional</td></tr>
              <tr><td>Is Printed</td><td>Yes / No</td><td>✅ Yes</td></tr>
            </tbody>
          </table>
        </div>

        <button
          onClick={downloadTemplate}
          className="btn btn-outline mt-4"
        >
          📥 Download Template
        </button>
      </div>

      {/* Upload Section */}
      <div className="card p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">📤 Upload File</h2>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <div className="text-4xl mb-2">📁</div>
              <p className="text-[var(--color-text-muted)]">
                {file ? file.name : 'Click to select Excel or CSV file'}
              </p>
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-[var(--color-bg)] rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-[var(--color-danger)]"
              >
                ✕
              </button>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="btn btn-primary w-full"
          >
            {loading ? '⏳ Importing...' : '🚀 Start Import'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-danger mb-6">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {summary && (
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📊 Import Results</h2>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-[var(--color-bg)] rounded-lg text-center">
              <p className="text-2xl font-bold">{summary.totalProcessed}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Total</p>
            </div>
            <div className="p-4 bg-[var(--color-success)] bg-opacity-10 rounded-lg text-center">
              <p className="text-2xl font-bold text-[var(--color-success)]">{summary.successCount}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Success</p>
            </div>
            <div className="p-4 bg-[var(--color-danger)] bg-opacity-10 rounded-lg text-center">
              <p className="text-2xl font-bold text-[var(--color-danger)]">{summary.failedCount}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Failed</p>
            </div>
          </div>

          {results && results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.status === 'success'
                      ? 'bg-[var(--color-success)] bg-opacity-10'
                      : result.status === 'failed'
                      ? 'bg-[var(--color-danger)] bg-opacity-10'
                      : 'bg-[var(--color-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>
                      {result.status === 'success' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'}
                    </span>
                    <div>
                      <p className="font-medium">{result.productTitle}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">{result.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}