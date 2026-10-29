import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';

import { API_URL } from '@/api/public-api';
import { session } from '@/api/session';

/**
 * An image the API serves only to a signed-in caller (an avatar:
 * `/v1/people/{id}/avatar?v=…`): loaded with the access token, cached by
 * its path (a new picture has a new path).
 */
export function ApiImage({
  path,
  ...props
}: Omit<ImageProps, 'source'> & { path: string }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    void session.accessToken().then(
      (value) => current && setToken(value),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [path]);
  if (!token) {
    return null;
  }
  return (
    <Image
      {...props}
      source={{
        uri: `${API_URL}${path}`,
        headers: { Authorization: `Bearer ${token}` },
        cacheKey: path,
      }}
      cachePolicy="memory-disk"
    />
  );
}
