import axiosInstance from '@/lib/utils/axios';

/** EASY_SETUP_PLAN §3.2: a computer signing in by approval (`npx kaaga-setup`): what the page shows, and the answer. */
export interface PcSignIn {
  /** "BCDF-GHJK": the code the terminal shows. */
  code: string;
  /** What the computer calls itself (its name and system). */
  device: string;
  createdAt: string;
  expiresAt: string;
  /** waiting: theirs to answer; approved / denied: answered; used: the computer has its sign-in; expired: ran out. */
  status: 'waiting' | 'approved' | 'denied' | 'used' | 'expired';
}

export const setupApi = {
  async request(code: string): Promise<PcSignIn> {
    return (await axiosInstance.get('/api/setup/request', { params: { code } })).data.data;
  },
  async answer(code: string, allow: boolean): Promise<PcSignIn> {
    return (await axiosInstance.post('/api/setup/answer', { code, allow })).data.data;
  },
};
