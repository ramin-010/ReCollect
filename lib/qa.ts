/**
 * QA-only parts of the web app (the phone world's "Compare with design"): on in development and in a QA build
 * (NEXT_PUBLIC_RC_QA=1), never in production. The approved mock-up they compare against lives outside the app
 * (mockups/phone-app/) and is not deployed.
 */
export const qaEnabled = (): boolean => process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_RC_QA === '1';

/** The mock-up's screen for a phone route (its address takes #screen=…&theme=…&mode=…). */
export function designScreenOf(pathname: string): string {
  const name = pathname.replace(/^\/m\/?/, '').split('/')[0] || 'today';
  return ['today', 'buddy', 'library', 'you', 'settings', 'look'].includes(name) ? name : 'today';
}

/** The approved mock-up at a screen, in a look (served at /qa/design by its route, QA only). */
export const designUrl = (screen: string, theme: string, mode: string): string => `/qa/design/index.html#screen=${screen}&theme=${theme}&mode=${mode}`;
