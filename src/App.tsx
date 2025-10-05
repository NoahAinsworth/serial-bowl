import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "./pages/Home";
import AuthPage from "./pages/AuthPage";

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="*" element={<div className="p-4 text-foreground">Page not found</div>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);

export default App;
