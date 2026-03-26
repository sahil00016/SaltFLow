import React from 'react';

export default function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div
      style={{
        backgroundColor: '#fdecea',
        border: '1px solid #f5c6cb',
        borderLeft: '4px solid #e53935',
        borderRadius: '4px',
        padding: '12px 16px',
        margin: '12px 0',
        color: '#b71c1c',
        fontSize: '14px',
        lineHeight: '1.5',
      }}
    >
      <strong>Error: </strong>{message}
    </div>
  );
}
