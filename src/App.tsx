import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './i18n';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { DataHub } from './pages/DataHub';
import { Recommendations } from './pages/Recommendations';
import { Boats } from './pages/Boats';
import { OrderBuilder } from './pages/OrderBuilder';
import { Shipments } from './pages/Shipments';
import { Analytics } from './pages/Analytics';
import { Pipeline } from './pages/Pipeline';
import { Intelligence } from './pages/Intelligence';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/data-hub" element={<DataHub />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/boats" element={<Boats />} />
          <Route path="/order-builder" element={<OrderBuilder />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/intelligence" element={<Intelligence />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
