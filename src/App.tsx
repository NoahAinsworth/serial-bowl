import { BrowserRouter, Routes, Route } from "react-router-dom";

const App = () => (
  <BrowserRouter>
    <div className="min-h-screen p-8" style={{ background: '#000', color: '#fff' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>SerialCereal</h1>
      <Routes>
        <Route path="/" element={<div>Home Page - App is working</div>} />
        <Route path="*" element={<div>Page not found</div>} />
      </Routes>
    </div>
  </BrowserRouter>
);

export default App;
