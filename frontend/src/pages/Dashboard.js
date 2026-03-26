import React, { useEffect, useState } from 'react';
import { getBatches, getOrders, getClients } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const cardContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '20px',
  marginTop: '24px',
};

function StatCard({ label, value, color, subtitle }) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: `1px solid ${color}30`,
        borderTop: `4px solid ${color}`,
        borderRadius: '8px',
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: '500' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: '700', color }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{subtitle}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [batches, setBatches] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBatches(false), getOrders(), getClients()])
      .then(([b, o, c]) => {
        setBatches(b);
        setOrders(o);
        setClients(c);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalBagsAvailable = batches.reduce((sum, b) => sum + b.remaining_quantity, 0);
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'partially_dispatched').length;
  const totalOutstanding = clients.reduce((sum, c) => sum + parseFloat(c.outstanding_balance || 0), 0);

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Dashboard</h1>
      <p style={{ color: '#666', marginTop: '4px' }}>Overview of your salt inventory and orders</p>

      <ErrorMessage message={error} />

      {loading ? (
        <p style={{ color: '#888', marginTop: '24px' }}>Loading dashboard data...</p>
      ) : (
        <div style={cardContainerStyle}>
          <StatCard
            label="Batches with Stock"
            value={batches.length}
            color="#1a73e8"
            subtitle="Active inventory batches"
          />
          <StatCard
            label="Total Bags Available"
            value={totalBagsAvailable.toLocaleString()}
            color="#34a853"
            subtitle="Bags ready for dispatch"
          />
          <StatCard
            label="Pending / Partial Orders"
            value={pendingOrders}
            color="#f9ab00"
            subtitle="Orders awaiting dispatch"
          />
          <StatCard
            label="Total Outstanding Balance"
            value={`₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
            color="#ea4335"
            subtitle="Unpaid amount across all clients"
          />
        </div>
      )}

      <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
            Recent Orders
          </h2>
          {orders.length === 0 ? (
            <p style={{ color: '#888', fontSize: '14px' }}>No orders yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555' }}>Code</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555' }}>Client</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555' }}>Qty</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '6px 8px', color: '#1a73e8', fontFamily: 'monospace' }}>{o.order_code}</td>
                    <td style={{ padding: '6px 8px' }}>{o.client_name}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{o.quantity_required}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
            Stock Overview (Active Batches)
          </h2>
          {batches.length === 0 ? (
            <p style={{ color: '#888', fontSize: '14px' }}>No active batches.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555' }}>Batch</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', color: '#555' }}>Product</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px', color: '#555' }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {batches.slice(0, 6).map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '6px 8px', color: '#1a73e8', fontFamily: 'monospace' }}>{b.batch_code}</td>
                    <td style={{ padding: '6px 8px' }}>{b.product_name} ({b.grade})</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '600' }}>{b.remaining_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    pending: { bg: '#fff8e1', text: '#f57f17' },
    fully_dispatched: { bg: '#e8f5e9', text: '#2e7d32' },
    partially_dispatched: { bg: '#e3f2fd', text: '#1565c0' },
    cancelled: { bg: '#fce4ec', text: '#880e4f' },
  };
  const c = colors[status] || { bg: '#f5f5f5', text: '#555' };
  return (
    <span style={{
      backgroundColor: c.bg,
      color: c.text,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
    }}>
      {status}
    </span>
  );
}
