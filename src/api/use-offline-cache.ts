import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { shouldKeep, startOfflineCache } from '@/api/offline-cache';
import { useMe } from '@/features/auth/hooks';

type Cache = Awaited<ReturnType<typeof startOfflineCache>>;

/**
 * Signed in: what was saved shows at once (offline too), and what may be
 * kept is saved as it changes. Once `me` says who this is, a cache of
 * anyone else (another person, another tenant) is deleted and dropped.
 */
export function useOfflineCache() {
  const queryClient = useQueryClient();
  const me = useMe();
  const owner = me.data
    ? `${me.data.user.id}:${me.data.tenant?.id ?? ''}`
    : null;
  const [cache, setCache] = useState<Cache>(null);

  useEffect(() => {
    let started: Cache = null;
    let left = false;
    void startOfflineCache(queryClient).then((next) => {
      if (left) {
        next?.stop();
      } else {
        started = next;
        setCache(next);
      }
    });
    return () => {
      left = true;
      started?.stop();
    };
  }, [queryClient]);

  useEffect(() => {
    if (cache && owner) {
      void cache.setOwner(owner).then((same) => {
        if (!same) {
          queryClient.removeQueries({ predicate: shouldKeep });
        }
      });
    }
  }, [cache, owner, queryClient]);
}
