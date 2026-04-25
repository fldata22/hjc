import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';

export function MaybeMobileRedirect({ children }: { children: React.ReactNode }) {
  const [shouldRedirect] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  if (shouldRedirect) return <Navigate to="/m/" replace />;
  return <>{children}</>;
}
