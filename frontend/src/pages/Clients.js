import { useEffect, useState } from 'react';
import { getClients, createClient } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const inp = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' };
const lbl = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#444', marginBottom: '4px' };
const fg  = { marginBottom: '14px' };

function AddClientModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState({ name: '', phone: '', address: '' });
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const c = await createClient({ name: form.name.trim(), phone: form.phone.trim(), address: form.address.trim() || null });
      onSuccess(c);
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Add New Client</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#aaa' }}>×</button>
        </div>
        <ErrorMessage message={err} />
        <form onSubmit={submit}>
          <div style={fg}>
            <label style={lbl}>Full Name *</label>
            <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Sharma" style={inp} />
          </div>
          <div style={fg}>
            <label style={lbl}>Phone Number *</label>
            <input type="text" required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 9876543210" style={inp} />
          </div>
          <div style={fg}>
            <label style={lbl}>Address</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Office / shop address (optional)" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', fontSize: '13px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer', color: '#555' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '9px 22px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '4px', backgroundColor: loading ? '#aaa' : '#1a73e8', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Adding...' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Clients() {
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const load = () => {
    setLoading(true);
    getClients().then(setClients).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdded = (c) => {
    setSuccessMsg(`Client "${c.name}" added successfully.`);
    setShowModal(false);
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Clients</h1>
          <p style={{ color: '#666', marginTop: '4px', marginBottom: 0 }}>Manage all your clients</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setSuccessMsg(''); setError(''); }}
          style={{ marginTop: '4px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          + New Client
        </button>
      </div>

      <ErrorMessage message={error} />
      {successMsg && (
        <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderLeft: '4px solid #43a047', borderRadius: '4px', padding: '10px 14px', marginBottom: '12px', color: '#1b5e20', fontSize: '13px' }}>
          {successMsg}
        </div>
      )}

      {loading ? <p style={{ color: '#888', marginTop: '20px' }}>Loading clients...</p>
        : clients.length === 0 ? (
          <div style={{ marginTop: '32px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', padding: '48px 20px', border: '1px dashed #ddd' }}>
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '16px' }}>No clients yet. Add your first client.</p>
            <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 24px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
              + Add First Client
            </button>
          </div>
        ) : (
          <div style={{ marginTop: '16px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Phone', 'Address', 'Outstanding (₹)'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', backgroundColor: '#f8f9fa', borderBottom: '2px solid #e0e0e0', fontSize: '12px', fontWeight: '600', color: '#555' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontWeight: '600', color: '#1a1a1a', fontSize: '14px' }}>{c.name}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '13px', color: '#555' }}>{c.phone}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '13px', color: '#888' }}>{c.address || '—'}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', fontSize: '14px', fontWeight: '600', color: parseFloat(c.outstanding_balance) > 0 ? '#c62828' : '#2e7d32' }}>
                      ₹{parseFloat(c.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ padding: '8px 16px', fontSize: '12px', color: '#aaa' }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
        )}

      {showModal && <AddClientModal onClose={() => setShowModal(false)} onSuccess={handleAdded} />}
    </div>
  );
}