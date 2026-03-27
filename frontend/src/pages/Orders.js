import { useEffect, useState } from 'react';
import { getOrders, cancelOrder, updatePayment, getClients, createClient, createOrder, getBatches } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const thStyle = {
  textAlign: 'left', padding: '10px 12px', backgroundColor: '#f8f9fa',
  borderBottom: '2px solid #e0e0e0', fontSize: '13px', fontWeight: '600',
  color: '#555', whiteSpace: 'nowrap',
};
const tdStyle = {
  padding: '10px 12px', borderBottom: '1px solid #f0f0f0',
  fontSize: '13px', color: '#333',
};
const inp = {
  width: '100%', padding: '9px 12px', border: '1px solid #ddd',
  borderRadius: '4px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};
const lbl = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' };
const fg  = { marginBottom: '14px' };

function StatusBadge({ status }) {
  const map = {
    pending:              { bg: '#fff8e1', text: '#f57f17', label: 'Pending' },
    fully_dispatched:     { bg: '#e8f5e9', text: '#2e7d32', label: 'Dispatched' },
    partially_dispatched: { bg: '#e3f2fd', text: '#1565c0', label: 'Partial' },
    cancelled:            { bg: '#fce4ec', text: '#880e4f', label: 'Cancelled' },
  };
  const c = map[status] || { bg: '#f5f5f5', text: '#555', label: status };
  return <span style={{ backgroundColor: c.bg, color: c.text, padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>{c.label}</span>;
}

function PaymentBadge({ status }) {
  const paid = status === 'paid';
  return <span style={{ backgroundColor: paid ? '#e8f5e9' : '#fff3e0', color: paid ? '#2e7d32' : '#e65100', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '500' }}>{paid ? 'Paid' : 'Unpaid'}</span>;
}

// ── New Order Modal ───────────────────────────────────────────────────────────

function CreateOrderModal({ onClose, onSuccess }) {
  const [clients, setClients]         = useState([]);
  const [products, setProducts]       = useState([]); // distinct product+grade from batches
  const [form, setForm]               = useState({ client_id: '', product_name: '', grade: '', quantity_required: '', price_per_bag: '', order_date: new Date().toISOString().split('T')[0], notes: '' });
  const [nc, setNc]                   = useState({ name: '', phone: '', address: '' });
  const [showNc, setShowNc]           = useState(false);
  const [err, setErr]                 = useState('');
  const [ncErr, setNcErr]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [ncLoading, setNcLoading]     = useState(false);

  useEffect(() => {
    getClients().then(setClients).catch(() => {});
    getBatches().then(batches => {
      // Build unique product+grade list from batches that still have stock
      const seen = new Set();
      const list = [];
      batches.filter(b => b.remaining_quantity > 0).forEach(b => {
        const key = `${b.product_name}||${b.grade}`;
        if (!seen.has(key)) { seen.add(key); list.push({ product_name: b.product_name, grade: b.grade }); }
      });
      setProducts(list);
    }).catch(() => {});
  }, []);

  const addClient = async (e) => {
    e.preventDefault(); setNcErr(''); setNcLoading(true);
    try {
      const c = await createClient({ name: nc.name.trim(), phone: nc.phone.trim(), address: nc.address.trim() || null });
      getClients().then(setClients);
      setForm(f => ({ ...f, client_id: String(c.id) }));
      setNc({ name: '', phone: '', address: '' }); setShowNc(false);
    } catch (e) { setNcErr(e.message); } finally { setNcLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const o = await createOrder({ client_id: parseInt(form.client_id), product_name: form.product_name, grade: form.grade, quantity_required: parseInt(form.quantity_required), price_per_bag: parseFloat(form.price_per_bag), order_date: form.order_date, notes: form.notes.trim() || null });
      onSuccess(o);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  const total = form.quantity_required && form.price_per_bag
    ? (parseFloat(form.price_per_bag) * parseInt(form.quantity_required)).toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : null;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>New Order</h2>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '4px', marginBottom: 0 }}>Place an order for a client</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#aaa', lineHeight: 1 }}>×</button>
        </div>

        <ErrorMessage message={err} />
        <form onSubmit={submit}>
          {/* Client */}
          <div style={fg}>
            <label style={lbl}>Client *</label>
            <select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} style={inp}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
            <button type="button" onClick={() => setShowNc(!showNc)}
              style={{ marginTop: '6px', background: 'none', border: 'none', color: '#1a73e8', fontSize: '12px', cursor: 'pointer', padding: 0, fontWeight: '500' }}>
              {showNc ? '− Cancel' : '+ Add new client'}
            </button>
          </div>

          {showNc && (
            <div style={{ background: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#444', margin: '0 0 10px 0' }}>New Client</p>
              <ErrorMessage message={ncErr} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ ...lbl, fontSize: '11px' }}>Name *</label>
                  <input type="text" required value={nc.name} onChange={e => setNc({ ...nc, name: e.target.value })} placeholder="Client name" style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ ...lbl, fontSize: '11px' }}>Phone *</label>
                  <input type="text" required value={nc.phone} onChange={e => setNc({ ...nc, phone: e.target.value })} placeholder="Phone number" style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
                </div>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ ...lbl, fontSize: '11px' }}>Address</label>
                <input type="text" value={nc.address} onChange={e => setNc({ ...nc, address: e.target.value })} placeholder="Address (optional)" style={{ ...inp, padding: '7px 10px', fontSize: '12px' }} />
              </div>
              <button type="button" onClick={addClient} disabled={ncLoading}
                style={{ backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '4px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', opacity: ncLoading ? 0.7 : 1 }}>
                {ncLoading ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          )}

          {/* Product */}
          <div style={fg}>
            <label style={lbl}>Product *</label>
            <select required value={`${form.product_name}||${form.grade}`}
              onChange={e => {
                const [product_name, grade] = e.target.value.split('||');
                setForm({ ...form, product_name, grade });
              }} style={inp}>
              <option value="||">— Select product —</option>
              {products.map(p => (
                <option key={`${p.product_name}||${p.grade}`} value={`${p.product_name}||${p.grade}`}>
                  {p.product_name} — {p.grade}
                </option>
              ))}
            </select>
            {products.length === 0 && (
              <p style={{ fontSize: '11px', color: '#e65100', marginTop: '4px' }}>No stock available. Add batches first.</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={fg}>
              <label style={lbl}>Qty Required (bags) *</label>
              <input type="number" required min="1" value={form.quantity_required} onChange={e => setForm({ ...form, quantity_required: e.target.value })} placeholder="e.g. 100" style={inp} />
            </div>
            <div style={fg}>
              <label style={lbl}>Price Per Bag (₹) *</label>
              <input type="number" required min="0.01" step="0.01" value={form.price_per_bag} onChange={e => setForm({ ...form, price_per_bag: e.target.value })} placeholder="e.g. 45.00" style={inp} />
            </div>
          </div>

          {total && (
            <div style={{ backgroundColor: '#e8f0fe', borderRadius: '5px', padding: '8px 12px', marginBottom: '14px', fontSize: '13px', color: '#1a73e8', fontWeight: '600' }}>
              Order Total: ₹{total}
            </div>
          )}

          <div style={fg}>
            <label style={lbl}>Order Date *</label>
            <input type="date" required value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} style={inp} />
          </div>
          <div style={fg}>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} rows={2} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions (optional)" style={{ ...inp, resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', color: '#555' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '9px 22px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '4px', backgroundColor: loading ? '#aaa' : '#1a73e8', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Orders Page ───────────────────────────────────────────────────────────────

export default function Orders() {
  const [orders, setOrders]           = useState([]);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [actionMsg, setActionMsg]     = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [busyId, setBusyId]           = useState(null);

  const fetch = () => { setLoading(true); getOrders().then(setOrders).catch(e => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { fetch(); }, []); // eslint-disable-line

  const handleCancel = async (o) => {
    if (!window.confirm(`Cancel order "${o.order_code}"? Stock will be reverted.`)) return;
    setError(''); setActionMsg(''); setBusyId(o.id);
    try { await cancelOrder(o.id); setActionMsg(`Order "${o.order_code}" cancelled.`); fetch(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  };

  const handlePayment = async (o, status) => {
    const verb = status === 'paid' ? 'mark as paid' : 'revert to unpaid';
    if (!window.confirm(`${verb} "${o.order_code}" (₹${parseFloat(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})?`)) return;
    setError(''); setActionMsg(''); setBusyId(o.id);
    try { await updatePayment(o.id, status); setActionMsg(`Order "${o.order_code}" marked as ${status}.`); fetch(); }
    catch (e) { setError(e.message); } finally { setBusyId(null); }
  };

  const handleCreated = (o) => {
    setActionMsg(`Order "${o.order_code}" created for ${o.client_name} — ₹${parseFloat(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
    setShowModal(false); fetch();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Orders</h1>
          <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>Create orders, track dispatch status and mark payments</p>
        </div>
        <button onClick={() => { setShowModal(true); setActionMsg(''); setError(''); }}
          style={{ marginTop: '4px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
          + New Order
        </button>
      </div>

      <ErrorMessage message={error} />
      {actionMsg && <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderLeft: '4px solid #43a047', borderRadius: '4px', padding: '10px 14px', marginBottom: '12px', color: '#1b5e20', fontSize: '13px' }}>{actionMsg}</div>}

      {loading ? <p style={{ color: '#888', marginTop: '16px' }}>Loading orders...</p>
        : orders.length === 0 ? (
          <div style={{ marginTop: '32px', textAlign: 'center', color: '#888', backgroundColor: '#fff', borderRadius: '8px', padding: '48px 20px', border: '1px dashed #ddd' }}>
            <p style={{ fontSize: '16px', marginBottom: '4px' }}>No orders yet.</p>
            <button onClick={() => setShowModal(true)} style={{ marginTop: '12px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '5px', padding: '9px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Create First Order</button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Order Code</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Product</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Bags</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>₹/Bag</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Dispatched</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Payment</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const busy = busyId === o.id;
                  return (
                    <tr key={o.id}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#1a73e8', fontWeight: '600' }}>{o.order_code}</td>
                      <td style={tdStyle}>{o.client_name}</td>
                      <td style={{ ...tdStyle, fontSize: '12px' }}>{o.product_name ? `${o.product_name} (${o.grade})` : '—'}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{o.quantity_required}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#555' }}>₹{parseFloat(o.price_per_bag).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>₹{parseFloat(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ ...tdStyle, textAlign: 'right', color: '#555' }}>{o.dispatched_quantity || 0}</td>
                      <td style={tdStyle}>{o.order_date}</td>
                      <td style={tdStyle}><StatusBadge status={o.status} /></td>
                      <td style={tdStyle}><PaymentBadge status={o.payment_status} /></td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        {o.status !== 'cancelled' && o.payment_status === 'unpaid' && (
                          <button disabled={busy} onClick={() => handlePayment(o, 'paid')}
                            style={{ backgroundColor: '#43a047', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginRight: '5px', opacity: busy ? 0.6 : 1 }}>
                            Mark Paid
                          </button>
                        )}
                        {o.status !== 'cancelled' && o.payment_status === 'paid' && (
                          <button disabled={busy} onClick={() => handlePayment(o, 'unpaid')}
                            style={{ backgroundColor: 'transparent', border: '1px solid #999', color: '#666', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginRight: '5px', opacity: busy ? 0.6 : 1 }}>
                            Unpaid
                          </button>
                        )}
                        {(o.status === 'pending' || o.status === 'partially_dispatched') && (
                          <button disabled={busy} onClick={() => handleCancel(o)}
                            style={{ backgroundColor: 'transparent', border: '1px solid #e53935', color: '#e53935', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} total</p>
          </div>
        )
      }

      {showModal && <CreateOrderModal onClose={() => setShowModal(false)} onSuccess={handleCreated} />}
    </div>
  );
}