
export const GoogleSignin = {
  configure: () => {},
  signIn: async () => { throw new Error('Google Sign-In not available on web'); },
  signOut: async () => {},
  isSignedIn: async () => false,
  getCurrentUser: async () => null,
  hasPlayServices: async () => false,
};
export const GoogleSigninButton = () => null;
export const statusCodes = { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED', IN_PROGRESS: 'IN_PROGRESS', PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE' };
export default GoogleSignin;
