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
 * Wires a file input + preview + hidden URL field: on file selection,
 * uploads immediately and fills `urlInput.value` with the resulting public
 * URL, so the surrounding form just reads `urlInput.value` on submit like
 * any other text field.
 */
export function initImageUploadField(container, { pathPrefix, onStatus }) {
  const fileInput = container.querySelector("[data-upload-file]");
  const urlInput = container.querySelector("[data-upload-url]");
  const preview = container.querySelector("[data-upload-preview]");

  const syncPreview = () => {
    if (preview) preview.src = urlInput.value || "";
    if (preview) preview.classList.toggle("hidden", !urlInput.value);
  };
  syncPreview();

  fileInput?.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    onStatus?.("Uploading…");
    try {
      const url = await uploadMedia(file, pathPrefix);
      urlInput.value = url;
      syncPreview();
      onStatus?.("Uploaded.");
    } catch (err) {
      console.error("Upload failed:", err);
      onStatus?.("Upload failed — see console.");
    }
  });
}
