// Pick photos/videos from the library and upload them through the backend (which stores them on Cloudinary).
import * as ImagePicker from "expo-image-picker";
import { platformApi, type UploadPurpose } from "@/api/platform";
import { rememberLocalCopy } from "./image-preview";

export type PickKind = "images" | "videos";

export async function pickMedia(kinds: PickKind[] = ["images"]) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kinds,
    quality: 0.85, // re-encode large photos so uploads stay quick on slow connections
    allowsEditing: false,
    videoMaxDuration: 60,
  });
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

export async function uploadAsset(asset: ImagePicker.ImagePickerAsset, purpose: UploadPurpose) {
  const up = await sendAsset(asset, purpose);
  if (up.type === "image") rememberLocalCopy(up.url, asset.uri);
  return up;
}

function sendAsset(asset: ImagePicker.ImagePickerAsset, purpose: UploadPurpose) {
  const isVideo = asset.type === "video";
  const type = asset.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg");
  const ext = type.split("/")[1]?.replace("quicktime", "mov").replace("jpeg", "jpg") ?? (isVideo ? "mp4" : "jpg");
  return platformApi.upload({ uri: asset.uri, name: asset.fileName ?? `${purpose}.${ext}`, type }, purpose);
}

/** One step: pick, then upload. Returns null if the user cancels. */
export async function pickAndUpload(purpose: UploadPurpose, kinds: PickKind[] = ["images"]) {
  const asset = await pickMedia(kinds);
  if (!asset) return null;
  return uploadAsset(asset, purpose);
}
