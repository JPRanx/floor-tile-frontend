import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Recommendations } from './pages/Recommendations';
import { Boats } from './pages/Boats';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/boats" element={<Boats />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
