/**
 * Global offline sync hook — used in Layout to provide app-wide
 * offline/sync state without duplicating logic per page.
 */
import { useOfflineSync } from '@/components/useOfflineSync';
import { useQueryClient } from '@tanstack/react-query';

export function useGlobalOfflineSync() {
  const queryClient = useQueryClient();

  return useOfflineSync({
    onSyncComplete: () => {
      // Invalidate any task-related queries on all pages after sync
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['focusSessionTasks'] });
    },
  });
}