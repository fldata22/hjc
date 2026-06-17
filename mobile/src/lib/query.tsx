import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React from 'react';

const DAY = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Keep results in cache long enough to be worth persisting for offline use.
      gcTime: DAY,
      refetchOnWindowFocus: false,
    },
  },
});

// Persist the query cache to AsyncStorage so last-known data is available offline
// and across app restarts (read-only offline; writes still require connectivity).
const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'hjc-query-cache',
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: DAY }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
