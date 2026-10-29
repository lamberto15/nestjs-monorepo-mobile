import { ApiError } from '@/api/client';
import { API_URL, appFetch } from '@/api/public-api';
import { session } from '@/api/session';

/**
 * The signed link an authenticated download route redirects to (files,
 * thumbnails, PDFs: `GET /v1/attachments/{id}/download`). The route needs
 * the access token; the signed link needs nothing for a few minutes, so a
 * browser, an image or the share sheet can use it. Read without following
 * the redirect: following it would download the whole file here.
 */
export async function signedLink(path: `/v1/${string}`): Promise<string> {
  const token = await session.accessToken();
  const response = await appFetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: 'manual',
  });
  const location = response.headers.get('Location');
  if (response.status >= 300 && response.status < 400 && location) {
    return new URL(location, API_URL).toString();
  }
  if (response.ok) {
    // A runtime that followed it anyway: the final address is the link.
    return response.url;
  }
  const problem = await response.json().catch(() => ({}));
  throw new ApiError({ status: response.status, ...problem });
}
