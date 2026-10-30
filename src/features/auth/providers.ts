/** A sign-in provider's name as people know it (`github` → GitHub). */
const NAMES: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  microsoft: 'Microsoft',
};

export const providerName = (provider: string) => NAMES[provider] ?? provider;
