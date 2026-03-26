import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddBatch from './pages/AddBatch';
import Inventory from './pages/Inventory';
import CreateOrder from './pages/CreateOrder';
import DispatchOrder from './pages/DispatchOrder';
import ClientOutstanding from './pages/ClientOutstanding';
import Orders from './pages/Orders';
import ActivityLogs from './pages/ActivityLogs';
import ClientLedger from './pages/ClientLedger';

const contentWrap = {
  marginLeft: 220,
  minHeight: '100vh',
  backgroundColor: '#f0f2f5',
};

const pageStyle = {
  maxWidth: '1080px',
  padding: '28px 32px',
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <Navbar onLogout={handleLogout} />
      <div style={contentWrap}>
      <div style={pageStyle}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/add-batch" element={<AddBatch />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/dispatch" element={<DispatchOrder />} />
          <Route path="/outstanding" element={<ClientOutstanding />} />
          <Route path="/logs" element={<ActivityLogs />} />
          <Route path="/ledger" element={<ClientLedger />} />
          <Route path="/ledger/:clientId" element={<ClientLedger />} />
        </Routes>
      </div>
      </div>
    </BrowserRouter>
  );
}
