// Native Google sign-in. The module isn't in Expo Go, so it's loaded lazily: Expo Go keeps
// working and the button explains it needs the installed app.
import type * as GoogleSignInModule from "@react-native-google-signin/google-signin";
import Constants, { ExecutionEnvironment } from "expo-constants";

// OAuth web client from google-services.json (client_type 3); the backend checks tokens against it
const WEB_CLIENT_ID = "13841307072-9v9qr1c0bonfm8lqt5a4g4eiuu5ku41h.apps.googleusercontent.com";

let mod: typeof GoogleSignInModule | null | undefined;

function load() {
  if (mod === undefined) {
    // Expo Go has no native module; even a caught require would show a red error in development
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return (mod = null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy on purpose (see top)
      mod = require("@react-native-google-signin/google-signin") as typeof GoogleSignInModule;
      mod.GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
    } catch {
      mod = null;
    }
  }
  return mod;
}

export class GoogleSignInError extends Error {}

/** Opens Google's account picker. Resolves to an ID token, or null if the user backed out. */
export async function getGoogleIdToken(): Promise<string | null> {
  const g = load();
  if (!g) throw new GoogleSignInError("Google sign-in works in the installed app, not in Expo Go.");
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = g;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (isCancelledResponse(res)) return null;
    if (!res.data.idToken) throw new GoogleSignInError("Google didn't return an account. Please try again.");
    return res.data.idToken;
  } catch (err) {
    if (err instanceof GoogleSignInError) throw err;
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) return null;
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new GoogleSignInError("Google Play services is needed for Google sign-in.");
      }
    }
    if (__DEV__) console.warn("Google sign-in failed", err);
    throw new GoogleSignInError("Google sign-in failed. Please try again.");
  }
}

/** Forget the chosen Google account, so the next sign-in shows the picker again. */
export function signOutOfGoogle() {
  const g = load();
  g?.GoogleSignin.signOut().catch(() => {});
}
