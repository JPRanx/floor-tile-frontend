import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { DataHub } from './pages/DataHub';
import { Boats } from './pages/Boats';
import { OrderBuilder } from './pages/OrderBuilder';
import { Intelligence } from './pages/Intelligence';
import { ProductManagement } from './pages/ProductManagement';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-hub" element={<DataHub />} />
          <Route path="/boats" element={<Boats />} />
          <Route path="/order-builder" element={<OrderBuilder />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/products" element={<ProductManagement />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
