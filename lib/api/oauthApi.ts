import axiosInstance from '@/lib/utils/axios';

/** An app's sign-in to Recollect (ALWAYS_ON_SPEC 6.5): what the consent page shows, and his answer. */

export interface ConsentInfo {
  client: { name: string; kind: 'dcr' | 'cimd' | string; redirectHost: string };
  scopes: string[];
}

export const oauthApi = {
  async request(request: string): Promise<ConsentInfo> {
    return (await axiosInstance.get('/api/oauth/request', { params: { request } })).data.data;
  },
  /** His answer; the address to send the browser back to (the app's callback). */
  async answer(request: string, allow: boolean): Promise<string> {
    return (await axiosInstance.post('/api/oauth/consent', { request, allow })).data.data.redirect;
  },
};
