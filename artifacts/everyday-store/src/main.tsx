import { createRoot } from 'react-dom/client';
import { setBaseUrl, resolveWebsite } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ''));

async function startStorefront() {
  const assignment = await resolveWebsite();
  if (assignment.configured && assignment.websiteType === 'existing') {
    window.location.replace(`/${window.location.search}${window.location.hash}`);
    return;
  }
  createRoot(document.getElementById('root')!, {
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
