import { useEffect, useState } from 'react';
import { getLogs } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const ACTION_COLORS = {
  CREATE_BATCH:   { bg: '#e8f5e9', text: '#2e7d32', label: 'Batch Created' },
  DELETE_BATCH:   { bg: '#fce4ec', text: '#880e4f', label: 'Batch Deleted' },
  STOCK_ADJUST:   { bg: '#fff3e0', text: '#e65100', label: 'Stock Adjusted' },
  CREATE_ORDER:   { bg: '#e3f2fd', text: '#1565c0', label: 'Order Created' },
  CANCEL_ORDER:   { bg: '#fce4ec', text: '#c62828', label: 'Order Cancelled' },
  DISPATCH:       { bg: '#f3e5f5', text: '#6a1b9a', label: 'Dispatched' },
  PAYMENT_UPDATE: { bg: '#fff8e1', text: '#f57f17', label: 'Payment Update' },
};

const ACTION_TYPES = ['', 'CREATE_BATCH', 'DELETE_BATCH', 'STOCK_ADJUST', 'CREATE_ORDER', 'CANCEL_ORDER', 'DISPATCH', 'PAYMENT_UPDATE'];
const ENTITY_TYPES = ['', 'batch', 'order', 'client'];

function ActionBadge({ action_type }) {
  const c = ACTION_COLORS[action_type] || { bg: '#f5f5f5', text: '#555', label: action_type };
  return (
    <span style={{
      backgroundColor: c.bg,
      color: c.text,
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

const selectStyle = {
  padding: '8px 12px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '13px',
  outline: 'none',
  backgroundColor: '#fff',
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [limit, setLimit] = useState(50);

  const fetchLogs = () => {
    setLoading(true);
    setError('');
    getLogs({
      limit,
      action_type: actionFilter || undefined,
      entity_type: entityFilter || undefined,
    })
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [actionFilter, entityFilter, limit]); // eslint-disable-line

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Audit Log</h1>
      <p style={{ color: '#666', marginTop: '4px', marginBottom: '20px' }}>
        Complete audit trail of all actions in the system
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginRight: '6px' }}>Action:</label>
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={selectStyle}>
            <option value="">All actions</option>
            {ACTION_TYPES.slice(1).map((a) => (
              <option key={a} value={a}>{ACTION_COLORS[a]?.label || a}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginRight: '6px' }}>Type:</label>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} style={selectStyle}>
            <option value="">All types</option>
            {ENTITY_TYPES.slice(1).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginRight: '6px' }}>Show:</label>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={selectStyle}>
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
          </select>
        </div>
        <button
          onClick={fetchLogs}
          style={{ padding: '8px 16px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      <ErrorMessage message={error} />

      {loading ? (
        <p style={{ color: '#888' }}>Loading activity log...</p>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#aaa', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
          <p style={{ fontSize: '15px' }}>No activity logged yet.</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>Actions will appear here as you use the system.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          {logs.map((log, i) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 18px',
                borderBottom: i < logs.length - 1 ? '1px solid #f0f0f0' : 'none',
                backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
              }}
            >
              {/* Left: action badge */}
              <div style={{ minWidth: '130px', paddingTop: '2px' }}>
                <ActionBadge action_type={log.action_type} />
              </div>

              {/* Middle: description */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#222', lineHeight: '1.5' }}>
                  {log.description}
                </div>
                {log.entity_id && (
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                    {log.entity_type} #{log.entity_id}
                  </div>
                )}
              </div>

              {/* Right: timestamp */}
              <div style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                {formatTimestamp(log.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
          Showing {logs.length} most recent entries
        </p>
      )}
    </div>
  );
}
