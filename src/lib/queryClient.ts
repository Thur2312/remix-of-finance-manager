// src/lib/queryClient.ts

import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,       
      gcTime: 1000 * 60 * 60 * 24,    
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "seller-finance-cache",
  throttleTime: 1000,
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // expira após 24h
  buster: "v1",                 // mude para "v2" se alterar estrutura de dados
});