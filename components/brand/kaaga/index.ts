// The Kaaga brand in the app (KAAGA_REBRAND_PLAN): the mark (with its states), the logo and the wordmark. The words and
// addresses live in lib/brand.ts (plain, so server files can import them too) and are re-exported here.
export { KaagaMark, KaagaIcon, sliceGap, type KaagaState, type KaagaMarkProps } from './KaagaMark';
export { KaagaLogo, KaagaWordmark, type KaagaLogoProps } from './KaagaLogo';
export { PRODUCT, DEFAULT_BUDDY_NAME, buddyName, isKaaga, SITE_URL } from '@/lib/brand';
