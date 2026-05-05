import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './i18n';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { SetPassword } from './pages/SetPassword';
import { Dashboard } from './pages/Dashboard';
import { DataHub } from './pages/DataHub';
import { Boats } from './pages/Boats';
import { Intelligence } from './pages/Intelligence';
import { ProductManagement } from './pages/ProductManagement';
import { ConfigPage } from './pages/ConfigPage';
import { HorizonView } from './pages/HorizonView';
import { HorizonBoat } from './pages/HorizonBoat';
import { CustomerProfiles } from './pages/CustomerProfiles';
import { Users } from './pages/Users';
import { OrderPlan } from './pages/OrderPlan';

// Detects Supabase auth callbacks landing in the URL hash and routes them
// to the right page. Invites/recoveries → /set-password.
function AuthCallbackHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const type = params.get('type');
    if (type === 'invite' || type === 'recovery') {
      // Strip the hash so we don't re-trigger, then go to set-password
      navigate('/set-password' + window.location.search, { replace: true });
    }
  }, [navigate]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthCallbackHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<HorizonView />} />
                  <Route path="/horizon" element={<HorizonView />} />
                  <Route path="/horizon/boat" element={<HorizonBoat />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/data-hub" element={<DataHub />} />
                  <Route path="/boats" element={<Boats />} />
                  <Route path="/intelligence" element={<Intelligence />} />
                  <Route path="/customers" element={<CustomerProfiles />} />
                  <Route path="/products" element={<ProductManagement />} />
                  <Route path="/config" element={<ConfigPage />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/plan" element={<OrderPlan />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
