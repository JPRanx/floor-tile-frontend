import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DataHub } from './pages/DataHub';
import { Boats } from './pages/Boats';
import { OrderBuilder } from './pages/OrderBuilder';
import { PlanningView } from './pages/PlanningView';
import { Intelligence } from './pages/Intelligence';
import { ProductManagement } from './pages/ProductManagement';
import { ConfigPage } from './pages/ConfigPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<PlanningView />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data-hub" element={<DataHub />} />
          <Route path="/boats" element={<Boats />} />
          <Route path="/planning" element={<PlanningView />} />
          <Route path="/order-builder" element={<OrderBuilder />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/config" element={<ConfigPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
