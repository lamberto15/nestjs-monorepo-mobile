import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

import { api } from '@/api/api';
import { unwrap, type GetResponse } from '@/api/client';

export type Present =
  GetResponse<'/v1/presence/{subject}/{recordId}'>['items'][number];

const BEAT_MS = 15_000;

/**
 * Who else is on a record (backend `work-surfaces`, presence): a beat every
 * 15 seconds while the screen is focused and the app in front, gone when
 * either stops (the API drops a person 45 s after their last beat). Only
 * the mode is sent, never what is typed. Advisory: saving is still guarded
 * by the ETag.
 */
export function usePresence(
  subject: string,
  recordId: string,
  mode: 'viewing' | 'editing',
): Present[] {
  const [others, setOthers] = useState<Present[]>([]);

  useFocusEffect(
    useCallback(() => {
      const path = { params: { path: { subject, recordId } } };
      let timer: ReturnType<typeof setInterval> | null = null;

      const beat = () =>
        unwrap(
          api.PUT('/v1/presence/{subject}/{recordId}', {
            ...path,
            body: { mode },
          }),
        )
          .then((answer) =>
            setOthers(answer.items.filter((person) => !person.self)),
          )
          .catch(() => undefined); // advisory: a missed beat changes nothing
      const start = () => {
        if (!timer) {
          void beat();
          timer = setInterval(beat, BEAT_MS);
        }
      };
      const stop = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        void api
          .DELETE('/v1/presence/{subject}/{recordId}', path)
          .catch(() => undefined);
      };

      start();
      const appState = AppState.addEventListener('change', (state) =>
        state === 'active' ? start() : stop(),
      );
      return () => {
        appState.remove();
        stop();
        setOthers([]);
      };
    }, [subject, recordId, mode]),
  );

  return others;
}
