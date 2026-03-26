import { useEffect, useState } from 'react';
import { getClients, getClientOutstanding, updatePayment } from '../api';
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

export default function ClientOutstanding() {
  const [clients, setClients] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [outstanding, setOutstanding] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    getClients().then(setClients).catch(() => {});
  }, []);

  const fetchOutstanding = (id) => {
    if (!id) {
      setOutstanding(null);
      return;
    }
    setLoading(true);
    setError('');
    setActionMsg('');
    getClientOutstanding(id)
      .then(setOutstanding)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const handleClientSelect = (e) => {
    setSelectedId(e.target.value);
    setOutstanding(null);
    setActionMsg('');
    setError('');
    fetchOutstanding(e.target.value);
  };

  const handleMarkPaid = async (order) => {
    if (!window.confirm(`Mark order "${order.order_code}" as paid?`)) return;
    setPayingId(order.id);
    setError('');
    setActionMsg('');
    try {
      await updatePayment(order.id, 'paid');
      setActionMsg(`Order "${order.order_code}" marked as paid.`);
      fetchOutstanding(selectedId);
    } catch (err) {
      setError(err.message);
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Payments</h1>
      <p style={{ color: '#666', marginTop: '4px', marginBottom: '24px' }}>Track and settle unpaid client balances</p>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '24px', maxWidth: '800px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '4px' }}>
            Select Client
          </label>
          <select
            value={selectedId}
            onChange={handleClientSelect}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="">-- Select a client --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
            ))}
          </select>
        </div>

        <ErrorMessage message={error} />

        {actionMsg && (
          <div style={{ backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderLeft: '4px solid #43a047', borderRadius: '4px', padding: '10px 14px', marginBottom: '16px', color: '#1b5e20', fontSize: '13px' }}>
            {actionMsg}
          </div>
        )}

        {loading && <p style={{ color: '#888' }}>Loading...</p>}

        {outstanding && !loading && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '14px 16px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Client Name</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>{outstanding.client_name}</div>
              </div>
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '6px', padding: '14px 16px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Phone</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>{outstanding.phone}</div>
              </div>
              <div style={{
                backgroundColor: parseFloat(outstanding.outstanding_balance) > 0 ? '#fff3e0' : '#e8f5e9',
                borderRadius: '6px',
                padding: '14px 16px',
                border: `1px solid ${parseFloat(outstanding.outstanding_balance) > 0 ? '#ffcc80' : '#a5d6a7'}`,
              }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Outstanding Balance</div>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '700',
                  color: parseFloat(outstanding.outstanding_balance) > 0 ? '#e65100' : '#2e7d32',
                }}>
                  ₹{parseFloat(outstanding.outstanding_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
              Unpaid Orders ({outstanding.unpaid_orders.length})
            </h2>

            {outstanding.unpaid_orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#888', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                <p>No unpaid orders. All orders are paid!</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Order Code</th>
                      <th style={thStyle}>Order Date</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Qty (bags)</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Amount (₹)</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outstanding.unpaid_orders.map((o) => (
                      <tr key={o.id}>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#1a73e8', fontWeight: '600' }}>{o.order_code}</td>
                        <td style={tdStyle}>{o.order_date}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>{o.quantity_required.toLocaleString()}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: '#e65100' }}>
                          ₹{parseFloat(o.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            backgroundColor: o.status === 'fully_dispatched' ? '#e8f5e9' : '#fff8e1',
                            color: o.status === 'fully_dispatched' ? '#2e7d32' : '#f57f17',
                            padding: '2px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={() => handleMarkPaid(o)}
                            disabled={payingId === o.id}
                            style={{
                              backgroundColor: '#43a047',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              opacity: payingId === o.id ? 0.7 : 1,
                            }}
                          >
                            {payingId === o.id ? 'Updating...' : 'Mark as Paid'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
