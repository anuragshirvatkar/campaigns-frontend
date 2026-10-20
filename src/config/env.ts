// EXPO_PUBLIC_* values are inlined at build time. Set EXPO_PUBLIC_API_URL in .env.local to point
// the app at a local backend (e.g. http://192.168.1.5:4000/api); otherwise it uses the live API.
export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://campaign-one.64-227-171-165.sslip.io/api",
};
