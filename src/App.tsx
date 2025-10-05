import { BrowserRouter, Routes, Route } from "react-router-dom";

const App = () => {
  console.log('App started');
  
  return (
    <BrowserRouter>
      <div style={{ padding: '20px', color: 'white' }}>
        <h1>App Works</h1>
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
