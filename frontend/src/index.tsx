import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';

import App from './App';
import { store } from './store/slices';
import theme from './theme';
import { logger } from './utils/logger';

// Log application startup
logger.info('Application starting', {
  environment: process.env.NODE_ENV,
  version: process.env.REACT_APP_VERSION || '1.0.0'
});

// Add error boundary logging
window.onerror = (message, source, lineno, colno, error) => {
  logger.error('Global error caught', {
    message,
    source,
    lineno,
    colno,
    error: error?.stack
  });
};

// Add promise rejection logging
window.onunhandledrejection = (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason
  });
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Log successful render
logger.info('Application rendered successfully'); 