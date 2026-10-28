// Fast image previews for Cloudinary images.
// The server asks Cloudinary to build this exact copy when an image is uploaded or generated
// (see PREVIEW_TRANSFORMATION in the backend), so the first view doesn't wait for it to be made.
// Keep the two in sync.
export const PREVIEW_TRANSFORMATION = "c_limit,w_1080,q_auto,f_jpg";

// Photos the user just uploaded from this phone: shown from the phone itself, no download needed
const localCopies = new Map<string, string>();
export const rememberLocalCopy = (url: string, localUri: string) => localCopies.set(url, localUri);
export const localCopy = (url: string) => localCopies.get(url);

/** A Cloudinary image resized for the screen (the same link everywhere, so the phone caches it once). */
export function previewUrl(url: string) {
  const marker = "/image/upload/";
  if (!url.includes("res.cloudinary.com") || !url.includes(marker)) return url;
  const [head, tail] = url.split(marker);
  // Already transformed (a segment like "w_400,c_fill/") → leave it alone
  if (/^[a-z]{1,3}_[^/]*\//.test(tail)) return url;
  // Cloudinary names the pre-built JPG copy with a .jpg ending
  return `${head}${marker}${PREVIEW_TRANSFORMATION}/${tail.replace(/\.[a-z0-9]+$/i, ".jpg")}`;
}
