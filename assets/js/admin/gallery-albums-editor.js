import { supabase } from "../supabase-client.js";
import { setStatus } from "./generic-crud.js";
import { uploadMedia, readImageDimensions } from "./upload.js";

/**
 * Google-Photos-style album editor: create an album, then drag-and-drop
 * photos onto it (either its card in the grid, or the big dropzone inside
 * it) to link them — each dropped file is uploaded and inserted as its own
 * gallery_images row with album_id set, no per-photo form needed. Plain
 * (unalbumed) photos and fine-grained per-photo edits (alt/caption/active)
 * still go through the separate "Gallery Images" list section.
 */

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function fetchAlbumsAndImages() {
  const [{ data: albums, error: aErr }, { data: images, error: iErr }] = await Promise.all([
    supabase.from("gallery_albums").select("*").order("sort_order"),
    supabase.from("gallery_images").select("*").order("sort_order"),
  ]);
  return { albums: albums || [], images: images || [], error: aErr || iErr };
}

function albumCardHtml(album, albumImages) {
  const cover = album.cover_image || albumImages[0]?.src || "";
  return `
    <div class="col-12 col-sm-6 col-lg-4" data-album-card data-album-id="${album.id}">
      <div class="card admin-album-card h-100">
        ${cover ? `<img src="${cover}" alt="" class="card-img-top" style="height:9rem;object-fit:cover" />` : `<div class="card-img-top d-flex align-items-center justify-content-center text-body-secondary" style="height:9rem;background:var(--bs-secondary-bg)">No photos yet</div>`}
        <div class="card-body">
          <p class="fw-semibold mb-1">${escapeHtml(album.title)}</p>
          <p class="text-body-secondary small mb-3">${albumImages.length} photo${albumImages.length === 1 ? "" : "s"}${album.active ? "" : " · hidden"}</p>
          <div class="d-flex gap-2">
            <button type="button" data-action="open" class="btn btn-outline-secondary btn-sm flex-fill">Open</button>
            <button type="button" data-action="delete" class="btn btn-outline-danger btn-sm">Delete</button>
          </div>
        </div>
      </div>
    </div>`;
}

function photoThumbHtml(img) {
  return `
    <div class="col-6 col-sm-4 col-md-3" data-photo-id="${img.id}">
      <img src="${img.src}" alt="${escapeHtml(img.alt || "")}" class="rounded w-100" style="height:8rem;object-fit:cover" />
      <div class="d-flex gap-1 mt-1">
        <button type="button" data-action="unlink" class="btn btn-outline-secondary btn-sm flex-fill" title="Remove from album, keep the photo">Remove</button>
        <button type="button" data-action="delete" class="btn btn-outline-danger btn-sm" title="Delete this photo entirely">&times;</button>
      </div>
    </div>`;
}

/** A selectable thumbnail for the "add existing photos" picker — tagged with its current album (if any), so re-assigning one away from another album is an informed choice, not a surprise. */
function pickerThumbHtml(img, albumTitleById) {
  const currentAlbumTitle = img.album_id ? albumTitleById.get(img.album_id) : null;
  return `
    <div class="col-6 col-sm-4 col-md-3">
      <label class="admin-picker-thumb position-relative d-block rounded overflow-hidden">
        <input type="checkbox" class="form-check-input position-absolute top-0 start-0 m-2" data-picker-checkbox value="${img.id}" />
        <img src="${img.src}" alt="${escapeHtml(img.alt || "")}" class="w-100 d-block" style="height:6rem;object-fit:cover" />
        ${currentAlbumTitle ? `<span class="badge text-bg-dark position-absolute bottom-0 end-0 m-1 opacity-75">${escapeHtml(currentAlbumTitle)}</span>` : ""}
      </label>
    </div>`;
}

/** Wires drag-and-drop (plus click-to-browse) on `el`, calling onFiles(FileList) for whatever's dropped/picked. */
function wireDropzone(el, fileInput, onFiles) {
  el.addEventListener("click", (e) => {
    if (e.target !== fileInput) fileInput.click();
  });
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length) onFiles(fileInput.files);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach((evt) =>
    el.addEventListener(evt, (e) => {
      e.preventDefault();
      el.classList.add("admin-dropzone-active");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    el.addEventListener(evt, (e) => {
      e.preventDefault();
      el.classList.remove("admin-dropzone-active");
    })
  );
  el.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
  });
}

export async function renderGalleryAlbumsEditor(container) {
  container.innerHTML = `<p class="text-body-secondary">Loading…</p>`;

  const { albums, images, error } = await fetchAlbumsAndImages();
  if (error) {
    container.innerHTML = `<p class="text-danger">Failed to load albums: ${error.message}</p>`;
    return;
  }

  const imagesFor = (albumId) => images.filter((img) => img.album_id === albumId);

  /** Re-fetches from Supabase and re-renders — the detail view for `openAlbumId` if it's still there, otherwise the grid. */
  async function reload(openAlbumId) {
    const fresh = await fetchAlbumsAndImages();
    if (fresh.error) {
      alert(`Error: ${fresh.error.message}`);
      return;
    }
    albums.length = 0;
    albums.push(...fresh.albums);
    images.length = 0;
    images.push(...fresh.images);
    const album = openAlbumId && albums.find((a) => a.id === openAlbumId);
    album ? renderDetail(album) : renderList();
  }

  /** Uploads each file, inserting it as a gallery_images row linked to `album`. Reports progress via onProgress(doneCount, total). */
  async function addFilesToAlbum(fileList, album, onProgress) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    let added = 0;
    for (const file of files) {
      onProgress?.(added, files.length);
      try {
        const [url, dims] = await Promise.all([uploadMedia(file, "gallery"), readImageDimensions(file).catch(() => null)]);
        const { error: insertErr } = await supabase.from("gallery_images").insert({
          src: url,
          width: dims?.width || 1600,
          height: dims?.height || 1000,
          alt: file.name.replace(/\.[^.]+$/, ""),
          caption: "",
          active: true,
          album_id: album.id,
          sort_order: imagesFor(album.id).length + added,
        });
        if (insertErr) throw insertErr;
        added++;
      } catch (err) {
        console.error(`Failed to add "${file.name}" to album:`, err);
      }
    }
    onProgress?.(added, files.length);
    return { added, total: files.length };
  }

  function renderList() {
    container.innerHTML = `
      <h2 class="fw-bold fs-4">Gallery Albums</h2>
      <p class="mt-1 text-body-secondary">Group related photos into an album, like a Google Photos album — create one, then drag photos onto it (either here or inside it) to add them.</p>

      <div class="card border-dashed mt-4">
        <div class="card-body">
          <p class="admin-field-label mb-2">Create new album</p>
          <div class="row g-2">
            <div class="col-12 col-sm-8"><input data-new-album-title class="form-control" placeholder="Album title" /></div>
            <div class="col-12 col-sm-4"><button type="button" data-action="create-album" class="btn btn-primary btn-sm w-100">Create album</button></div>
          </div>
          <p data-new-album-status class="admin-status mt-2"></p>
        </div>
      </div>

      <p class="admin-field-label mt-4 mb-2">Existing (${albums.length})</p>
      <div class="row g-3" data-album-grid>
        ${albums.length ? albums.map((a) => albumCardHtml(a, imagesFor(a.id))).join("") : `<div class="col-12"><p class="admin-table-empty">No albums yet — create one above.</p></div>`}
      </div>
    `;

    const titleInput = container.querySelector("[data-new-album-title]");
    const newAlbumStatus = container.querySelector("[data-new-album-status]");
    container.querySelector('[data-action="create-album"]').addEventListener("click", async () => {
      const title = titleInput.value.trim();
      if (!title) {
        setStatus(newAlbumStatus, "Title required.", "error");
        return;
      }
      setStatus(newAlbumStatus, "Creating…", "pending");
      const { data, error: err } = await supabase
        .from("gallery_albums")
        .insert({ title, sort_order: albums.length, active: true })
        .select()
        .single();
      if (err) {
        setStatus(newAlbumStatus, `Error: ${err.message}`, "error");
        return;
      }
      albums.push(data);
      renderDetail(data);
    });
    titleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") container.querySelector('[data-action="create-album"]').click();
    });

    container.querySelectorAll("[data-album-card]").forEach((card) => {
      const id = card.dataset.albumId;
      const album = albums.find((a) => a.id === id);
      const cardBody = card.querySelector(".admin-album-card");

      card.querySelector('[data-action="open"]').addEventListener("click", () => renderDetail(album));
      card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        if (!confirm(`Delete "${album.title}"? Its photos become unassigned, not deleted.`)) return;
        const { error: err } = await supabase.from("gallery_albums").delete().eq("id", id);
        if (err) {
          alert(`Error: ${err.message}`);
          return;
        }
        reload();
      });

      // Drop photos straight onto the card, without opening the album first.
      ["dragenter", "dragover"].forEach((evt) =>
        cardBody.addEventListener(evt, (e) => {
          e.preventDefault();
          cardBody.classList.add("admin-dropzone-active");
        })
      );
      ["dragleave"].forEach((evt) => cardBody.addEventListener(evt, () => cardBody.classList.remove("admin-dropzone-active")));
      cardBody.addEventListener("drop", async (e) => {
        e.preventDefault();
        cardBody.classList.remove("admin-dropzone-active");
        if (!e.dataTransfer.files.length) return;
        cardBody.style.opacity = "0.5";
        await addFilesToAlbum(e.dataTransfer.files, album);
        reload();
      });
    });
  }

  function renderDetail(album) {
    const albumImages = imagesFor(album.id);
    const albumTitleById = new Map(albums.map((a) => [a.id, a.title]));
    const pickable = images.filter((img) => img.album_id !== album.id);
    container.innerHTML = `
      <button type="button" data-action="back" class="btn btn-outline-secondary btn-sm mb-3">&larr; All albums</button>

      <div class="card">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-12 col-sm-8"><label class="form-label admin-field-label">Title</label><input data-f="title" class="form-control" value="${escapeHtml(album.title)}" /></div>
            <div class="col-12 col-sm-4"><label class="form-label admin-field-label">Sort order</label><input data-f="sort_order" type="number" class="form-control" value="${album.sort_order ?? 0}" /></div>
            <div class="col-12"><label class="form-label admin-field-label">Description</label><textarea data-f="description" class="form-control">${escapeHtml(album.description || "")}</textarea></div>
            <div class="col-12">
              <div class="form-check form-switch">
                <input data-f="active" type="checkbox" role="switch" class="form-check-input" id="album-active" ${album.active ? "checked" : ""} />
                <label class="form-check-label" for="album-active">Active (visible on the public gallery page)</label>
              </div>
            </div>
          </div>
          <div class="mt-3 d-flex gap-2">
            <button type="button" data-action="save-details" class="btn btn-primary btn-sm">Save details</button>
            <button type="button" data-action="delete-album" class="btn btn-outline-danger btn-sm">Delete album</button>
          </div>
          <p data-details-status class="admin-status mt-2"></p>
        </div>
      </div>

      <div class="admin-dropzone mt-4" data-dropzone tabindex="0" role="button" aria-label="Add photos to this album">
        <input type="file" accept="image/*" multiple data-file-input class="d-none" />
        <p class="mb-0 fw-semibold">Drag and drop photos here</p>
        <p class="mb-0 text-body-secondary small">or click to browse — select as many as you like</p>
      </div>
      <p data-upload-status class="admin-status mt-2"></p>

      ${
        pickable.length
          ? `
      <details class="mt-4" data-picker>
        <summary class="admin-field-label" style="cursor:pointer">+ Add existing photos (no re-upload needed)</summary>
        <p class="mt-2 text-body-secondary small">Already-uploaded photos not in this album — tick the ones to add. Photos tagged with another album's name will be moved here.</p>
        <div class="row g-2 mt-1" data-picker-grid>
          ${pickable.map((img) => pickerThumbHtml(img, albumTitleById)).join("")}
        </div>
        <div class="mt-3 d-flex align-items-center gap-2">
          <button type="button" data-action="add-existing" class="btn btn-primary btn-sm" disabled>Add selected to album</button>
          <p data-picker-status class="admin-status mb-0"></p>
        </div>
      </details>
      `
          : ""
      }

      <p class="admin-field-label mt-4 mb-2">Photos in this album (${albumImages.length})</p>
      <div class="row g-3" data-album-photos>
        ${albumImages.length ? albumImages.map(photoThumbHtml).join("") : `<div class="col-12"><p class="admin-table-empty">No photos yet — drag some in above.</p></div>`}
      </div>
    `;

    container.querySelector('[data-action="back"]').addEventListener("click", renderList);

    const detailsStatus = container.querySelector("[data-details-status]");
    container.querySelector('[data-action="save-details"]').addEventListener("click", async () => {
      const title = container.querySelector('[data-f="title"]').value.trim();
      const description = container.querySelector('[data-f="description"]').value;
      const sort_order = Number(container.querySelector('[data-f="sort_order"]').value);
      const active = container.querySelector('[data-f="active"]').checked;
      setStatus(detailsStatus, "Saving…", "pending");
      const { error: err } = await supabase.from("gallery_albums").update({ title, description, sort_order, active }).eq("id", album.id);
      if (err) {
        setStatus(detailsStatus, `Error: ${err.message}`, "error");
        return;
      }
      setStatus(detailsStatus, "Saved.", "success");
      reload(album.id);
    });

    container.querySelector('[data-action="delete-album"]').addEventListener("click", async () => {
      if (!confirm(`Delete "${album.title}"? Its photos become unassigned, not deleted.`)) return;
      const { error: err } = await supabase.from("gallery_albums").delete().eq("id", album.id);
      if (err) {
        alert(`Error: ${err.message}`);
        return;
      }
      reload();
    });

    const dropzone = container.querySelector("[data-dropzone]");
    const fileInput = container.querySelector("[data-file-input]");
    const uploadStatus = container.querySelector("[data-upload-status]");
    wireDropzone(dropzone, fileInput, async (fileList) => {
      const result = await addFilesToAlbum(fileList, album, (done, total) => {
        setStatus(uploadStatus, `Uploading ${done + 1} of ${total}…`, "pending");
      });
      setStatus(
        uploadStatus,
        `Added ${result.added} of ${result.total} photo${result.total === 1 ? "" : "s"}.`,
        result.added === result.total ? "success" : "error"
      );
      reload(album.id);
    });

    const addExistingBtn = container.querySelector('[data-action="add-existing"]');
    if (addExistingBtn) {
      const pickerStatus = container.querySelector("[data-picker-status]");
      const checkboxes = container.querySelectorAll("[data-picker-checkbox]");
      checkboxes.forEach((cb) =>
        cb.addEventListener("change", () => {
          const checked = container.querySelectorAll("[data-picker-checkbox]:checked").length;
          addExistingBtn.disabled = checked === 0;
          addExistingBtn.textContent = checked ? `Add ${checked} selected to album` : "Add selected to album";
        })
      );
      addExistingBtn.addEventListener("click", async () => {
        const ids = Array.from(container.querySelectorAll("[data-picker-checkbox]:checked")).map((cb) => cb.value);
        if (!ids.length) return;
        addExistingBtn.disabled = true;
        setStatus(pickerStatus, "Adding…", "pending");
        const { error: err } = await supabase.from("gallery_images").update({ album_id: album.id }).in("id", ids);
        if (err) {
          setStatus(pickerStatus, `Error: ${err.message}`, "error");
          addExistingBtn.disabled = false;
          return;
        }
        reload(album.id);
      });
    }

    container.querySelectorAll("[data-photo-id]").forEach((el) => {
      const photoId = el.dataset.photoId;
      el.querySelector('[data-action="unlink"]').addEventListener("click", async () => {
        const { error: err } = await supabase.from("gallery_images").update({ album_id: null }).eq("id", photoId);
        if (err) {
          alert(`Error: ${err.message}`);
          return;
        }
        reload(album.id);
      });
      el.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        if (!confirm("Delete this photo entirely? This can't be undone.")) return;
        const { error: err } = await supabase.from("gallery_images").delete().eq("id", photoId);
        if (err) {
          alert(`Error: ${err.message}`);
          return;
        }
        reload(album.id);
      });
    });
  }

  renderList();
}
