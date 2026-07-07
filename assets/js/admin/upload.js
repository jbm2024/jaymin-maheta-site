import { supabase } from "../supabase-client.js";

/**
 * Uploads a file to the public "media" storage bucket under the given path
 * prefix (e.g. "gallery", "blog", "projects") and returns its public URL.
 * Bucket RLS (see assets/supabase/005_storage.sql) only allows this to
 * succeed for an authenticated admin.
 */
export async function uploadMedia(file, pathPrefix) {
  const ext = file.name.split(".").pop();
  const key = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("media").upload(key, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from("media").getPublicUrl(key);
  return data.publicUrl;
}

/**
 * Reads a local image file's real pixel dimensions (via a throwaway
 * object URL) so callers never have to ask the admin to type width/height
 * by hand — whatever the uploaded file actually is, is what gets stored.
 */
export function readImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = objectUrl;
  });
}

/**
 * Wires a file input + preview + hidden URL field: on file selection,
 * uploads immediately and fills `urlInput.value` with the resulting public
 * URL, so the surrounding form just reads `urlInput.value` on submit like
 * any other text field. When `onDimensions` is passed, the file's actual
 * pixel width/height are detected client-side and handed back so callers
 * (e.g. the gallery's width/height columns) never need manual entry.
 */
export function initImageUploadField(container, { pathPrefix, onStatus, onDimensions }) {
  const fileInput = container.querySelector("[data-upload-file]");
  const urlInput = container.querySelector("[data-upload-url]");
  const preview = container.querySelector("[data-upload-preview]");

  const syncPreview = () => {
    if (preview) preview.src = urlInput.value || "";
    if (preview) preview.classList.toggle("d-none", !urlInput.value);
  };
  syncPreview();

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    onStatus?.("Uploading…");
    try {
      const [url, dimensions] = await Promise.all([
        uploadMedia(file, pathPrefix),
        onDimensions ? readImageDimensions(file).catch(() => null) : Promise.resolve(null),
      ]);
      urlInput.value = url;
      syncPreview();
      if (dimensions) onDimensions(dimensions.width, dimensions.height);
      onStatus?.("Uploaded.");
    } catch (err) {
      console.error("Upload failed:", err);
      onStatus?.("Upload failed — see console.");
    }
  });
}
