import { createRoot } from "react-dom/client";
import "./index.css";

console.log('main.tsx starting');

const App = () => {
  console.log('App component rendering');
  return <div style={{ padding: '20px', color: 'white' }}>React Works!</div>;
};

const rootElement = document.getElementById("root");
console.log('root element:', rootElement);

if (rootElement) {
  console.log('Mounting React...');
  createRoot(rootElement).render(<App />);
  console.log('React mounted');
}
