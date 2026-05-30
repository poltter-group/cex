import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { testConnection } from './lib/firebase';
import { AuthProvider } from './lib/auth-context';
import { MarketProvider } from './lib/market-context';

testConnection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <MarketProvider>
          <App />
        </MarketProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
