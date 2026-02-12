import React, { lazy, Suspense } from 'react';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlatformProvider } from './contexts/PlatformContext';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const AppContent = lazy(() => import('./AppContent'));

const App: React.FC = () => (
  <LanguageProvider>
    <AuthProvider>
      <PlatformProvider>
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading…</div>}>
          <AppContent />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </PlatformProvider>
    </AuthProvider>
  </LanguageProvider>
);

export default App;
