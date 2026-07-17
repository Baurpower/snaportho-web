import { safeRedirectPath } from '@/lib/auth/redirects';

export const APP_ROUTES = {
  home: '/',
  broBot: {
    home: '/brobot',
    workspace: '/brobot/chat',
    newConversation: '/brobot/chat',
    info: '/brobot/landing',
  },
  auth: {
    signIn: '/auth/sign-in',
  },
  pricing: '/brobot/pricing',
  upgrade: '/account/billing',
} as const;

export function loginWithReturnUrl(returnTo: string = APP_ROUTES.broBot.workspace) {
  const safeReturnTo = safeRedirectPath(returnTo, APP_ROUTES.broBot.workspace);
  return `${APP_ROUTES.auth.signIn}?redirectTo=${encodeURIComponent(safeReturnTo)}`;
}
