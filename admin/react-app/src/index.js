import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css'; // Si usas un archivo CSS principal para Tailwind

// 1. Busca el div con el id 'root' en el DOM.
const rootElement = document.getElementById('root');

// 2. Crea el punto de montaje de React en ese elemento.
const root = ReactDOM.createRoot(rootElement);

// 3. Renderiza tu componente principal <App />.
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);