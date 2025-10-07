import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';

import './styles/index.css';

import AdminApp from './AdminApp';
import FrontendApp from './FrontendApp';

const adminRootElement = document.getElementById('root');
const frontendRootElement = document.getElementById('qe-frontend-root');

if (adminRootElement) {
  const root = ReactDOM.createRoot(adminRootElement);
  root.render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <AdminApp />
      </I18nextProvider>
    </React.StrictMode>
  );
}

if (frontendRootElement) {
  const root = ReactDOM.createRoot(frontendRootElement);
  root.render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <FrontendApp />
      </I18nextProvider>
    </React.StrictMode>
  );
}