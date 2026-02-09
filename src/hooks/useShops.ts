/**
 * Hook for managing Shopify shop connections
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@src/contexts/AuthContext';
import { shopifyApi, type Shop } from '@src/lib/api';
import { useToastStore } from '@src/lib/store';

export function useShops() {
  const { session } = useAuth();
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();

  // Fetch connected shops
  const {
    data: shopsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['shops'],
    queryFn: async () => {
      const response = await shopifyApi.getShops();
      return response.shops;
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  // Connect shop mutation
  const connectShopMutation = useMutation({
    mutationFn: async (shopDomain: string) => {
      const response = await shopifyApi.startOAuth(shopDomain);
      return response;
    },
    onSuccess: (data) => {
      // Redirect to Shopify OAuth
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Verbindung fehlgeschlagen',
        description: error.message,
      });
    },
  });

  // Disconnect shop mutation
  const disconnectShopMutation = useMutation({
    mutationFn: async (shopId: string) => {
      await shopifyApi.disconnectShop(shopId);
      return shopId;
    },
    onSuccess: (shopId) => {
      queryClient.setQueryData<Shop[]>(['shops'], (old) =>
        old?.filter((s) => s.id !== shopId) || []
      );
      addToast({
        type: 'success',
        title: 'Shop getrennt',
        description: 'Die Verbindung wurde erfolgreich getrennt.',
      });
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Fehler',
        description: error.message,
      });
    },
  });

  // Sync shop mutation
  const syncShopMutation = useMutation({
    mutationFn: async (shopId: string) => {
      await shopifyApi.syncShop(shopId);
      return shopId;
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Sync gestartet',
        description: 'Die Synchronisierung wurde gestartet.',
      });
      refetch();
    },
    onError: (error: Error) => {
      addToast({
        type: 'error',
        title: 'Sync fehlgeschlagen',
        description: error.message,
      });
    },
  });

  return {
    shops: shopsData || [],
    isLoading,
    error,
    refetch,
    connectShop: connectShopMutation.mutate,
    isConnecting: connectShopMutation.isPending,
    disconnectShop: disconnectShopMutation.mutate,
    isDisconnecting: disconnectShopMutation.isPending,
    syncShop: syncShopMutation.mutate,
    isSyncing: syncShopMutation.isPending,
  };
}

export default useShops;
