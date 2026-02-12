import React, { lazy, Suspense, useEffect, useState } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlatformProvider } from './contexts/PlatformContext';

const AppContent = lazy(() => import('./AppContent'));

function VercelWidgets() {
  const [Widgets, setWidgets] = useState<React.ReactNode>(null);
  useEffect(() => {
    Promise.all([
      import('@vercel/analytics/react').then((m) => m.Analytics),
      import('@vercel/speed-insights/react').then((m) => m.SpeedInsights),
    ]).then(([Analytics, SpeedInsights]) => {
      setWidgets(
        <>
          <Analytics />
          <SpeedInsights />
        </>
      );
    });
  }, []);
  return <>{Widgets}</>;
}

const App: React.FC = () => (
  <LanguageProvider>
    <AuthProvider>
      <PlatformProvider>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading…</div>}>
          <AppContent />
        </Suspense>
        <VercelWidgets />
      </PlatformProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
