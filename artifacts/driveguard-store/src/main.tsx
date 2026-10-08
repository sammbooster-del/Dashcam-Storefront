import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';
import { routeAssignedWebsite } from './websiteRouting';

const root = createRoot(document.getElementById('root')!, {
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
});

async function startStorefront() {
  root.render(<main style={{ padding: 32 }} role="status">Loading store…</main>);
  try {
    const redirected = await routeAssignedWebsite();
    if (!redirected) root.render(
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
