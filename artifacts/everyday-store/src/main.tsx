import { createRoot } from 'react-dom/client';
import { setBaseUrl, resolveWebsiteWithRetry } from '@workspace/api-client-react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

setBaseUrl(import.meta.env.BASE_URL.replace(/\/$/, ''));

const root = createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
});

async function startStorefront() {
  root.render(<main style={{ padding: 32 }} role="status">Loading store…</main>);
  try {
    const assignment = await resolveWebsiteWithRetry();
    if (assignment.configured && assignment.websiteType === 'existing') {
      window.location.replace(`/${window.location.search}${window.location.hash}`);
      return;
    }
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    );
  } catch (error) {
    console.error('Store startup failed', error);
    root.render(
      <main style={{ padding: 32 }} role="alert">
        <h1>This store could not be loaded.</h1>
        <p>Website routing is temporarily unavailable. Please try again.</p>
        <button onClick={() => void startStorefront()}>Retry loading store</button>
      </main>,
    );
  }
}
void startStorefront();
