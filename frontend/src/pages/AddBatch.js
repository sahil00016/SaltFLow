import React, { useState } from 'react';
import { createBatch } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  marginTop: '4px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#444',
  marginBottom: '2px',
};

const formGroupStyle = {
  marginBottom: '18px',
};

const btnStyle = {
  backgroundColor: '#1a73e8',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  padding: '10px 24px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
};

export default function AddBatch() {
  const [form, setForm] = useState({
    product_name: '',
    grade: 'Fine',
    arrival_date: '',
    total_quantity: '',
    warehouse_location: '',
    batch_code: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      product_name: form.product_name.trim(),
      grade: form.grade,
      arrival_date: form.arrival_date,
      total_quantity: parseInt(form.total_quantity, 10),
      warehouse_location: form.warehouse_location.trim() || null,
      batch_code: form.batch_code.trim() || null,
    };

    try {
      const batch = await createBatch(payload);
      setSuccess(`Batch "${batch.batch_code}" created successfully with ${batch.total_quantity} bags.`);
      setForm({
        product_name: '',
        grade: 'Fine',
        arrival_date: '',
        total_quantity: '',
        warehouse_location: '',
        batch_code: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Add New Batch</h1>
      <p style={{ color: '#666', marginTop: '4px', marginBottom: '24px' }}>
        Register a new inventory batch of salt
      </p>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '28px', maxWidth: '560px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <ErrorMessage message={error} />

        {success && (
          <div style={{
            backgroundColor: '#e8f5e9',
            border: '1px solid #a5d6a7',
            borderLeft: '4px solid #43a047',
            borderRadius: '4px',
            padding: '12px 16px',
            margin: '12px 0',
            color: '#1b5e20',
            fontSize: '14px',
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="product_name">Product Name *</label>
            <input
              id="product_name"
              name="product_name"
              type="text"
              required
              value={form.product_name}
              onChange={handleChange}
              placeholder="e.g. Rock Salt, Sea Salt"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="grade">Grade *</label>
            <select
              id="grade"
              name="grade"
              value={form.grade}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="Fine">Fine</option>
              <option value="Coarse">Coarse</option>
              <option value="Industrial">Industrial</option>
            </select>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="arrival_date">Arrival Date *</label>
            <input
              id="arrival_date"
              name="arrival_date"
              type="date"
              required
              value={form.arrival_date}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="total_quantity">Total Quantity (Bags) *</label>
            <input
              id="total_quantity"
              name="total_quantity"
              type="number"
              required
              min="1"
              value={form.total_quantity}
              onChange={handleChange}
              placeholder="e.g. 500"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="warehouse_location">Warehouse Location</label>
            <input
              id="warehouse_location"
              name="warehouse_location"
              type="text"
              value={form.warehouse_location}
              onChange={handleChange}
              placeholder="e.g. Warehouse A, Bay 3 (optional)"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="batch_code">
              Batch Code <span style={{ fontWeight: '400', color: '#888' }}>(auto-generated if empty)</span>
            </label>
            <input
              id="batch_code"
              name="batch_code"
              type="text"
              value={form.batch_code}
              onChange={handleChange}
              placeholder="e.g. B-2024-001 (leave blank to auto-generate)"
              style={inputStyle}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating...' : 'Create Batch'}
          </button>
        </form>
      </div>
    </div>
  );
}
