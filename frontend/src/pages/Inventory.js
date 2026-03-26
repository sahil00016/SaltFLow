import { useEffect, useState } from 'react';
import { getBatches, deleteBatch, adjustStock, createBatch } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  backgroundColor: '#f8f9fa',
  borderBottom: '2px solid #e0e0e0',
  fontSize: '13px',
  fontWeight: '600',
  color: '#555',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: '13px',
  color: '#333',
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#444',
  marginBottom: '4px',
};

const formGroupStyle = { marginBottom: '16px' };

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
    >
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '28px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: '13px', color: '#666', marginTop: '4px', marginBottom: 0 }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999', lineHeight: 1, padding: '0 0 0 12px' }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Add Batch Modal ───────────────────────────────────────────────────────────

function AddBatchModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    product_name: '',
    grade: 'Fine',
    arrival_date: '',
    total_quantity: '',
    warehouse_location: '',
    batch_code: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const batch = await createBatch({
        product_name: form.product_name.trim(),
        grade: form.grade,
        arrival_date: form.arrival_date,
        total_quantity: parseInt(form.total_quantity, 10),
        warehouse_location: form.warehouse_location.trim() || null,
        batch_code: form.batch_code.trim() || null,
      });
      onSuccess(batch);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Add New Batch" subtitle="Register a new delivery of salt into inventory" onClose={onClose}>
      <ErrorMessage message={error} />
      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="product_name">Product Name *</label>
          <input id="product_name" name="product_name" type="text" required
            value={form.product_name} onChange={handleChange}
            placeholder="e.g. Rock Salt, Sea Salt" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="grade">Grade *</label>
            <select id="grade" name="grade" value={form.grade} onChange={handleChange} style={inputStyle}>
              <option value="Fine">Fine</option>
              <option value="Coarse">Coarse</option>
              <option value="Industrial">Industrial</option>
            </select>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="arrival_date">Arrival Date *</label>
            <input id="arrival_date" name="arrival_date" type="date" required
              value={form.arrival_date} onChange={handleChange} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="total_quantity">Total Bags *</label>
            <input id="total_quantity" name="total_quantity" type="number" required min="1"
              value={form.total_quantity} onChange={handleChange}
              placeholder="e.g. 500" style={inputStyle} />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="warehouse_location">Location</label>
            <input id="warehouse_location" name="warehouse_location" type="text"
              value={form.warehouse_location} onChange={handleChange}
              placeholder="e.g. Warehouse A" style={inputStyle} />
          </div>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="batch_code">
            Batch Code{' '}
            <span style={{ fontWeight: '400', color: '#999' }}>(auto-generated if left blank)</span>
          </label>
          <input id="batch_code" name="batch_code" type="text"
            value={form.batch_code} onChange={handleChange}
            placeholder="Leave blank to auto-generate" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '9px 20px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', color: '#555' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: '9px 22px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '4px', backgroundColor: loading ? '#aaa' : '#1a73e8', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Adding...' : 'Add Batch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Adjust Stock Modal ────────────────────────────────────────────────────────

function AdjustModal({ batch, onClose, onSuccess }) {
  const [mode, setMode] = useState('set');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const previewQty = () => {
    const v = parseInt(value, 10);
    if (isNaN(v)) return null;
    return mode === 'set' ? v : batch.remaining_quantity + v;
  };

  const preview = previewQty();
  const previewInvalid = preview !== null && preview < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const v = parseInt(value, 10);
    if (isNaN(v)) { setError('Please enter a valid number'); return; }
    if (!reason.trim()) { setError('Reason is required'); return; }

    const payload = {
      reason: reason.trim(),
      ...(mode === 'set' ? { new_quantity: v } : { adjustment_amount: v }),
    };

    setLoading(true);
    try {
      const updated = await adjustStock(batch.id, payload);
      onSuccess(updated, batch.remaining_quantity);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Adjust Stock"
      subtitle={`Batch ${batch.batch_code} — current stock: ${batch.remaining_quantity} bags`}
      onClose={onClose}
    >
      <ErrorMessage message={error} />
      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label style={labelStyle}>Adjustment Type</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[{ v: 'set', label: 'Set exact quantity' }, { v: 'delta', label: 'Add / subtract' }].map(({ v, label }) => (
              <label key={v} style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px',
                border: `2px solid ${mode === v ? '#1a73e8' : '#ddd'}`,
                borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                fontWeight: mode === v ? '600' : '400',
                color: mode === v ? '#1a73e8' : '#444',
                backgroundColor: mode === v ? '#e8f0fe' : '#fff',
              }}>
                <input type="radio" name="mode" value={v} checked={mode === v}
                  onChange={() => { setMode(v); setValue(''); setError(''); }}
                  style={{ display: 'none' }} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="adj_value">
            {mode === 'set' ? 'New Quantity (bags)' : 'Amount (use − for reduction)'}
          </label>
          <input id="adj_value" type="number" required value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder={mode === 'set' ? 'e.g. 180' : 'e.g. −20 or +50'}
            style={{ ...inputStyle, borderColor: previewInvalid ? '#e53935' : '#ddd' }} />
          {preview !== null && (
            <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: '600', color: previewInvalid ? '#e53935' : '#2e7d32' }}>
              {previewInvalid ? `Result would be ${preview} bags — cannot go below 0` : `Result: ${preview} bags`}
            </div>
          )}
        </div>

        <div style={formGroupStyle}>
          <label style={labelStyle} htmlFor="adj_reason">Reason *</label>
          <textarea id="adj_reason" required rows={2} value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="e.g. Physical count showed 20 bags damaged"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '9px 20px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', color: '#555' }}>
            Cancel
          </button>
          <button type="submit" disabled={loading || previewInvalid}
            style={{ padding: '9px 20px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '4px', backgroundColor: loading || previewInvalid ? '#aaa' : '#1a73e8', color: '#fff', cursor: loading || previewInvalid ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Saving...' : 'Save Adjustment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Stock Page ───────────────────────────────────────────────────────────

export default function Inventory() {
  const [batches, setBatches] = useState([]);
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [adjustingBatch, setAdjustingBatch] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchBatches = (empty) => {
    setLoading(true);
    setError('');
    getBatches(empty)
      .then(setBatches)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBatches(includeEmpty); }, [includeEmpty]);

  const handleDelete = async (batch) => {
    if (!window.confirm(`Delete batch "${batch.batch_code}"? This cannot be undone.`)) return;
    setError(''); setActionMsg('');
    try {
      await deleteBatch(batch.id);
      setActionMsg(`Batch "${batch.batch_code}" deleted.`);
      fetchBatches(includeEmpty);
    } catch (e) { setError(e.message); }
  };

  const handleAdjustSuccess = (updatedBatch, oldQty) => {
    const change = updatedBatch.remaining_quantity - oldQty;
    const dir = change >= 0 ? `+${change}` : String(change);
    setActionMsg(`Batch ${updatedBatch.batch_code}: ${oldQty} → ${updatedBatch.remaining_quantity} bags (${dir})`);
    setAdjustingBatch(null);
    fetchBatches(includeEmpty);
  };

  const handleAddSuccess = (batch) => {
    setActionMsg(`Batch "${batch.batch_code}" added — ${batch.total_quantity} bags.`);
    setShowAddModal(false);
    fetchBatches(includeEmpty);
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Stock</h1>
          <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>
            All salt batches sorted by arrival date — oldest stock dispatched first
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '13px', color: '#555' }}>
            <input type="checkbox" checked={includeEmpty} onChange={(e) => setIncludeEmpty(e.target.checked)}
              style={{ width: '15px', height: '15px', cursor: 'pointer' }} />
            Show empty batches
          </label>
          <button
            onClick={() => { setShowAddModal(true); setActionMsg(''); setError(''); }}
            style={{ backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            + New Batch
          </button>
        </div>
      </div>

      <ErrorMessage message={error} />

      {actionMsg && (
        <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderLeft: '4px solid #43a047', borderRadius: '4px', padding: '10px 14px', marginTop: '12px', color: '#1b5e20', fontSize: '13px' }}>
          {actionMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#888', marginTop: '24px' }}>Loading stock...</p>
      ) : batches.length === 0 ? (
        <div style={{ marginTop: '40px', textAlign: 'center', color: '#888', backgroundColor: '#fff', borderRadius: '8px', padding: '48px 20px', border: '1px dashed #ddd' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No batches found.</p>
          <p style={{ fontSize: '13px' }}>
            {includeEmpty ? 'No batches exist yet.' : 'All batches are empty — tick "Show empty batches" to see them.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ marginTop: '16px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            + Add First Batch
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <thead>
              <tr>
                <th style={thStyle}>Batch Code</th>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Grade</th>
                <th style={thStyle}>Arrival Date</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Bags</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Remaining</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ backgroundColor: b.remaining_quantity === 0 ? '#fafafa' : '#fff' }}>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#1a73e8', fontWeight: '600' }}>{b.batch_code}</td>
                  <td style={tdStyle}>{b.product_name}</td>
                  <td style={tdStyle}>{b.grade}</td>
                  <td style={tdStyle}>{b.arrival_date}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{b.total_quantity.toLocaleString()}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', color: b.remaining_quantity > 0 ? '#2e7d32' : '#999' }}>
                    {b.remaining_quantity.toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, color: '#666' }}>{b.warehouse_location || '—'}</td>
                  <td style={tdStyle}>
                    {b.remaining_quantity > 0 ? (
                      <span style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>Available</span>
                    ) : (
                      <span style={{ backgroundColor: '#f5f5f5', color: '#999', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>Empty</span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => { setAdjustingBatch(b); setActionMsg(''); setError(''); }}
                      style={{ backgroundColor: 'transparent', border: '1px solid #1a73e8', color: '#1a73e8', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginRight: '6px' }}
                    >
                      Adjust
                    </button>
                    {b.remaining_quantity === 0 && (
                      <button
                        onClick={() => handleDelete(b)}
                        style={{ backgroundColor: 'transparent', border: '1px solid #e53935', color: '#e53935', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
            {batches.length} batch{batches.length !== 1 ? 'es' : ''}
          </p>
        </div>
      )}

      {adjustingBatch && (
        <AdjustModal batch={adjustingBatch} onClose={() => setAdjustingBatch(null)} onSuccess={handleAdjustSuccess} />
      )}
      {showAddModal && (
        <AddBatchModal onClose={() => setShowAddModal(false)} onSuccess={handleAddSuccess} />
      )}
    </div>
  );
}
