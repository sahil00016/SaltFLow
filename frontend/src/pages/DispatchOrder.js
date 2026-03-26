import React, { useEffect, useState } from 'react';
import { getOrders, dispatch } from '../api';
import ErrorMessage from '../components/ErrorMessage';

const cardStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  padding: '18px 20px',
  marginBottom: '12px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

function DispatchResult({ result }) {
  if (!result) return null;
  return (
    <div style={{
      backgroundColor: '#e8f5e9',
      border: '1px solid #a5d6a7',
      borderLeft: '4px solid #43a047',
      borderRadius: '4px',
      padding: '12px 16px',
      marginTop: '10px',
      fontSize: '13px',
      color: '#1b5e20',
    }}>
      <strong>Dispatched {result.total_dispatched} bags</strong>
      <div style={{ marginTop: '6px' }}>
        {result.allocations.map((a, i) => (
          <div key={i} style={{ marginTop: '2px' }}>
            Batch <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{a.batch_code}</span>: {a.quantity} bags
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DispatchOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispatchingId, setDispatchingId] = useState(null);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  const fetchOrders = () => {
    setLoading(true);
    getOrders()
      .then((all) => {
        const dispatchable = all.filter(
          (o) => o.status === 'pending' || o.status === 'partially_dispatched'
        );
        setOrders(dispatchable);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleDispatch = async (order) => {
    setDispatchingId(order.id);
    setErrors((prev) => ({ ...prev, [order.id]: null }));
    setResults((prev) => ({ ...prev, [order.id]: null }));

    try {
      const result = await dispatch(order.id);
      setResults((prev) => ({ ...prev, [order.id]: result }));
      // Refresh order list after dispatch
      fetchOrders();
    } catch (err) {
      setErrors((prev) => ({ ...prev, [order.id]: err.message }));
    } finally {
      setDispatchingId(null);
    }
  };

  const getRemaining = (order) => order.remaining_quantity ?? (order.quantity_required - (order.dispatched_quantity || 0));

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>Dispatch Orders</h1>
      <p style={{ color: '#666', marginTop: '4px', marginBottom: '24px' }}>
        Dispatch stock for pending or partial orders. Stock is allocated from oldest batches first.
      </p>

      <ErrorMessage message={error} />

      {loading ? (
        <p style={{ color: '#888' }}>Loading orders...</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
          <p style={{ fontSize: '16px' }}>No pending orders to dispatch.</p>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>All orders have been dispatched or there are no orders yet.</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => {
            const remaining = getRemaining(order);
            const isDispatching = dispatchingId === order.id;
            const result = results[order.id];
            const orderError = errors[order.id];

            return (
              <div key={order.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#1a73e8', fontSize: '15px' }}>
                        {order.order_code}
                      </span>
                      <span style={{
                        backgroundColor: order.status === 'partially_dispatched' ? '#e3f2fd' : '#fff8e1',
                        color: order.status === 'partially_dispatched' ? '#1565c0' : '#f57f17',
                        padding: '2px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}>
                        {order.status}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <span style={{ color: '#888' }}>Client: </span>
                        <span style={{ fontWeight: '500' }}>{order.client_name}</span>
                      </div>
                      <div>
                        <span style={{ color: '#888' }}>Required: </span>
                        <span style={{ fontWeight: '600' }}>{order.quantity_required} bags</span>
                      </div>
                      <div>
                        <span style={{ color: '#888' }}>Dispatched: </span>
                        <span style={{ fontWeight: '600', color: '#2e7d32' }}>{order.dispatched_quantity || 0} bags</span>
                      </div>
                      <div>
                        <span style={{ color: '#888' }}>Remaining: </span>
                        <span style={{ fontWeight: '700', color: remaining > 0 ? '#e65100' : '#2e7d32' }}>
                          {remaining} bags
                        </span>
                      </div>
                    </div>

                    {order.notes && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                        Note: {order.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                      onClick={() => handleDispatch(order)}
                      disabled={isDispatching || remaining <= 0}
                      style={{
                        backgroundColor: remaining > 0 ? '#1a73e8' : '#9e9e9e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: remaining > 0 && !isDispatching ? 'pointer' : 'not-allowed',
                        opacity: isDispatching ? 0.7 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isDispatching ? 'Dispatching...' : 'Dispatch'}
                    </button>
                  </div>
                </div>

                {orderError && (
                  <div style={{
                    backgroundColor: '#fdecea',
                    border: '1px solid #f5c6cb',
                    borderLeft: '4px solid #e53935',
                    borderRadius: '4px',
                    padding: '10px 14px',
                    marginTop: '10px',
                    fontSize: '13px',
                    color: '#b71c1c',
                  }}>
                    {orderError}
                  </div>
                )}

                <DispatchResult result={result} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
