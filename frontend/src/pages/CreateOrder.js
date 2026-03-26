import React, { useEffect, useState } from 'react';
import { getClients, createOrder, createClient } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  marginTop: '4px',
  outline: 'none',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#444',
  marginBottom: '2px',
};

const formGroupStyle = { marginBottom: '18px' };

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

const secondaryBtnStyle = {
  backgroundColor: 'transparent',
  color: '#1a73e8',
  border: '1px solid #1a73e8',
  borderRadius: '4px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
};

export default function CreateOrder() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: '',
    quantity_required: '',
    price_per_bag: '',
    order_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', address: '' });
  const [showNewClient, setShowNewClient] = useState(false);
  const [error, setError] = useState('');
  const [clientError, setClientError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);

  const fetchClients = () => {
    getClients().then(setClients).catch(() => {});
  };

  useEffect(() => { fetchClients(); }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleClientChange = (e) => {
    setNewClientForm({ ...newClientForm, [e.target.name]: e.target.value });
    setClientError('');
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setClientError('');
    setClientLoading(true);
    try {
      const client = await createClient({
        name: newClientForm.name.trim(),
        phone: newClientForm.phone.trim(),
        address: newClientForm.address.trim() || null,
      });
      fetchClients();
      setForm({ ...form, client_id: String(client.id) });
      setNewClientForm({ name: '', phone: '', address: '' });
      setShowNewClient(false);
    } catch (err) {
      setClientError(err.message);
    } finally {
      setClientLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const order = await createOrder({
        client_id: parseInt(form.client_id, 10),
        quantity_required: parseInt(form.quantity_required, 10),
        price_per_bag: parseFloat(form.price_per_bag),
        order_date: form.order_date,
        notes: form.notes.trim() || null,
      });
      setSuccess(`Order "${order.order_code}" created for ${order.client_name}. Total: ₹${parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      setForm({
        client_id: '',
        quantity_required: '',
        price_per_bag: '',
        order_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Create New Order</h1>
      <p style={{ color: '#666', marginTop: '4px', marginBottom: '24px' }}>Place a new order for a client</p>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '28px', maxWidth: '560px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <ErrorMessage message={error} />

        {success && (
          <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderLeft: '4px solid #43a047', borderRadius: '4px', padding: '12px 16px', margin: '12px 0', color: '#1b5e20', fontSize: '14px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="client_id">Client *</label>
            <select
              id="client_id"
              name="client_id"
              required
              value={form.client_id}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">-- Select a client --</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewClient(!showNewClient)}
              style={{ ...secondaryBtnStyle, marginTop: '8px', fontSize: '12px', padding: '6px 12px' }}
            >
              {showNewClient ? 'Cancel adding client' : '+ Add new client'}
            </button>
          </div>

          {showNewClient && (
            <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '16px', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>New Client</h3>
              <ErrorMessage message={clientError} />
              <div style={{ marginBottom: '10px' }}>
                <label style={{ ...labelStyle, fontSize: '12px' }} htmlFor="nc_name">Name *</label>
                <input id="nc_name" name="name" type="text" required value={newClientForm.name} onChange={handleClientChange} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} placeholder="Client name" />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ ...labelStyle, fontSize: '12px' }} htmlFor="nc_phone">Phone *</label>
                <input id="nc_phone" name="phone" type="text" required value={newClientForm.phone} onChange={handleClientChange} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} placeholder="Phone number" />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ ...labelStyle, fontSize: '12px' }} htmlFor="nc_address">Address</label>
                <input id="nc_address" name="address" type="text" value={newClientForm.address} onChange={handleClientChange} style={{ ...inputStyle, fontSize: '13px', padding: '8px 10px' }} placeholder="Address (optional)" />
              </div>
              <button
                type="button"
                onClick={handleAddClient}
                disabled={clientLoading}
                style={{ ...btnStyle, fontSize: '13px', padding: '8px 16px', opacity: clientLoading ? 0.7 : 1 }}
              >
                {clientLoading ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          )}

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="quantity_required">Quantity Required (Bags) *</label>
            <input
              id="quantity_required"
              name="quantity_required"
              type="number"
              required
              min="1"
              value={form.quantity_required}
              onChange={handleChange}
              placeholder="e.g. 100"
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="price_per_bag">Price Per Bag (₹) *</label>
            <input
              id="price_per_bag"
              name="price_per_bag"
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.price_per_bag}
              onChange={handleChange}
              placeholder="e.g. 45.00"
              style={inputStyle}
            />
            {form.quantity_required && form.price_per_bag && (
              <div style={{ marginTop: '6px', fontSize: '13px', color: '#1a73e8', fontWeight: '600' }}>
                Total: ₹{(parseFloat(form.price_per_bag) * parseInt(form.quantity_required, 10)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="order_date">Order Date *</label>
            <input
              id="order_date"
              name="order_date"
              type="date"
              required
              value={form.order_date}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle} htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any special instructions or notes (optional)"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating...' : 'Create Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
