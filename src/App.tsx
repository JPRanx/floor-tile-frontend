import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DataHub } from './pages/DataHub';
import { Boats } from './pages/Boats';
import { OrderBuilder } from './pages/OrderBuilder';
import { PlanningView } from './pages/PlanningView';
import { Intelligence } from './pages/Intelligence';
import { ProductManagement } from './pages/ProductManagement';
import { ConfigPage } from './pages/ConfigPage';
import { FactoryRequestBuilder } from './pages/FactoryRequestBuilder';
import { HorizonView } from './pages/HorizonView';
import { HorizonBoat } from './pages/HorizonBoat';
import { CustomerProfiles } from './pages/CustomerProfiles';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
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
                  <Route path="/planning" element={<PlanningView />} />
                  <Route path="/order-builder" element={<OrderBuilder />} />
                  <Route path="/factory-requests" element={<FactoryRequestBuilder />} />
                  <Route path="/intelligence" element={<Intelligence />} />
                  <Route path="/customers" element={<CustomerProfiles />} />
                  <Route path="/products" element={<ProductManagement />} />
                  <Route path="/config" element={<ConfigPage />} />
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
