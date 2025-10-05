import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";

const App = () => (
  <ThemeProvider>
    <BrowserRouter>
      <div className="min-h-screen p-8 bg-background text-foreground">
        <h1 className="text-3xl mb-4">SerialCereal</h1>
        <Routes>
          <Route path="/" element={<div>Home Page - Theme Provider Added</div>} />
          <Route path="*" element={<div>Page not found</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
