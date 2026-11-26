import axiosInstance from '@/lib/utils/axios';

/** Stage 11 (ECOSYSTEM_V2_PLAN §9.6 item 2): a new account's checklist on Home, and the buddy's first words. */

export type FirstRunStep = 'zone' | 'buddy' | 'connect' | 'import';

export interface FirstRun {
  show: boolean;
  steps: Array<{ id: FirstRunStep; done: boolean }>;
  zone: string;
  ai: boolean;
  /** The buddy's first words in Ask Kaaga, while the person has never talked to it. */
  opening: string | null;
}

const data = <T>(r: { data: { data?: T } }) => r.data.data as T;

export const firstRunApi = {
  async get(): Promise<FirstRun> {
    return data(await axiosInstance.get('/api/first-run'));
  },
  async update(patch: { zoneOk?: true; dismissed?: true }): Promise<FirstRun> {
    return data(await axiosInstance.patch('/api/first-run', patch));
  },
};
