import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';
import { routeAssignedWebsite } from './websiteRouting';

async function startStorefront() {
const redirected = await routeAssignedWebsite();
if (!redirected) createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
}
void startStorefront().catch(() => {
  createRoot(document.getElementById('root')!).render(
    <main style={{ padding: 32 }} role="alert">
      <h1>This store could not be loaded.</h1>
      <p>Website routing is temporarily unavailable. Please try again.</p>
      <button onClick={() => window.location.reload()}>Reload store</button>
    </main>,
  );
});
