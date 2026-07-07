import { supabase } from "../supabase-client.js";
import { initImageUploadField } from "./upload.js";
import { setStatus } from "./generic-crud.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Bootstrap's native checkbox-toggle-button pattern: visually-hidden input + a <label> styled as a btn. */
function tagChipsHtml(allTags, selectedIds) {
  return allTags
    .map(
      (t) => `
        <input type="checkbox" class="btn-check" value="${t.id}" data-tag-checkbox id="tag-chip-${t.id}" autocomplete="off" ${selectedIds.has(t.id) ? "checked" : ""} />
        <label class="btn btn-outline-secondary btn-sm rounded-pill" for="tag-chip-${t.id}">${escapeHtml(t.name)}</label>`
    )
    .join("");
}

const CONTENT_HINT = `[{"type":"paragraph","text":"..."},{"type":"heading","text":"..."},{"type":"quote","text":"..."},{"type":"list","items":["..."]}]`;

function postFormHtml(post, allTags, selectedTagIds) {
  const p = post || {
    slug: "",
    title: "",
    excerpt: "",
    cover_image: "",
    author_name: "Jaymin Maheta",
    author_role: "Senior UI Developer",
    author_initials: "JM",
    published_date: new Date().toISOString().slice(0, 10),
    read_time: "",
    content: [],
    visible: true,
    sort_order: 0,
  };
  return `
    <div class="row g-3">
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Slug (URL id, unique)</label><input data-f="slug" class="form-control" value="${escapeHtml(p.slug)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Title</label><input data-f="title" class="form-control" value="${escapeHtml(p.title)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Published date</label><input data-f="published_date" type="date" class="form-control" value="${p.published_date}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Read time (e.g. "6 min read")</label><input data-f="read_time" class="form-control" value="${escapeHtml(p.read_time)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Author name</label><input data-f="author_name" class="form-control" value="${escapeHtml(p.author_name)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Author role</label><input data-f="author_role" class="form-control" value="${escapeHtml(p.author_role)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Author initials</label><input data-f="author_initials" class="form-control" value="${escapeHtml(p.author_initials)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Sort order</label><input data-f="sort_order" type="number" class="form-control" value="${p.sort_order ?? 0}" /></div>
    </div>
    <div class="mt-3"><label class="form-label admin-field-label">Excerpt</label><textarea data-f="excerpt" class="form-control">${escapeHtml(p.excerpt)}</textarea></div>
    <div class="mt-3" data-upload-field data-path-prefix="blog">
      <label class="form-label admin-field-label">Cover image</label>
      <img data-upload-preview src="${p.cover_image || ""}" alt="" class="img-fluid rounded mb-2 ${p.cover_image ? "" : "d-none"}" style="height:8rem;width:100%;object-fit:cover" />
      <input type="file" accept="image/*" data-upload-file class="form-control" />
      <input type="hidden" data-f="cover_image" data-upload-url value="${escapeHtml(p.cover_image)}" />
      <p data-upload-status class="admin-status mt-1"></p>
    </div>
    <div class="mt-3">
      <label class="form-label admin-field-label">Content (JSON block array)</label>
      <textarea data-f="content" data-type="json" class="form-control" style="min-height:8rem" placeholder='${CONTENT_HINT}'>${escapeHtml(JSON.stringify(p.content, null, 2))}</textarea>
      <p class="mt-1 admin-field-label text-wrap">Shape: ${CONTENT_HINT}</p>
    </div>
    <div class="mt-3">
      <div class="form-check form-switch">
        <input data-f="visible" data-type="boolean" class="form-check-input" type="checkbox" role="switch" id="f-visible" ${p.visible ? "checked" : ""} />
        <label class="form-check-label" for="f-visible">Visible (published)</label>
      </div>
    </div>
    <div class="mt-3">
      <label class="form-label admin-field-label">Tags</label>
      <div class="d-flex flex-wrap gap-2">${tagChipsHtml(allTags, selectedTagIds)}</div>
    </div>
  `;
}

function readPostForm(form) {
  const values = {};
  let jsonError = null;
  form.querySelectorAll("[data-f]").forEach((el) => {
    const key = el.dataset.f;
    if (el.dataset.type === "boolean") values[key] = el.checked;
    else if (el.dataset.type === "json") {
      try {
        values[key] = JSON.parse(el.value || "[]");
      } catch (e) {
        jsonError = `Content isn't valid JSON: ${e.message}`;
      }
    } else if (el.type === "number") values[key] = Number(el.value);
    else values[key] = el.value;
  });
  const tagIds = Array.from(form.querySelectorAll("[data-tag-checkbox]:checked")).map((el) => el.value);
  return { values, tagIds, jsonError };
}

async function saveBlogTags(postId, tagIds) {
  await supabase.from("blog_post_tags").delete().eq("blog_post_id", postId);
  if (tagIds.length) {
    await supabase.from("blog_post_tags").insert(tagIds.map((tag_id) => ({ blog_post_id: postId, tag_id })));
  }
}

function postRowHtml(p) {
  return `
    <tr data-row data-id="${p.id}">
      <td>${escapeHtml(p.title || "—")}</td>
      <td>${escapeHtml(p.published_date || "—")}</td>
      <td>${p.visible ? "Yes" : "No"}</td>
      <td>${p.sort_order ?? 0}</td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <button type="button" data-action="edit" class="btn btn-outline-secondary btn-sm">Edit</button>
          <button type="button" data-action="delete" class="btn btn-outline-danger btn-sm">Delete</button>
        </div>
      </td>
    </tr>`;
}

const EMPTY_POSTS_ROW = `<tr><td class="admin-table-empty" colspan="5">No posts yet — use the form above to add one.</td></tr>`;

export async function renderBlogEditor(container) {
  container.innerHTML = `<p class="text-body-secondary">Loading…</p>`;

  const [{ data: posts, error: postErr }, { data: allTags, error: tagErr }, { data: joins, error: joinErr }] = await Promise.all([
    supabase.from("blog_posts").select("*").order("sort_order"),
    supabase.from("tags").select("*").order("name"),
    supabase.from("blog_post_tags").select("*"),
  ]);
  if (postErr || tagErr || joinErr) {
    container.innerHTML = `<p class="text-danger">Failed to load blog posts: ${(postErr || tagErr || joinErr).message}</p>`;
    return;
  }

  const tagsByPost = new Map();
  for (const j of joins) {
    if (!tagsByPost.has(j.blog_post_id)) tagsByPost.set(j.blog_post_id, new Set());
    tagsByPost.get(j.blog_post_id).add(j.tag_id);
  }

  container.innerHTML = `
    <h2 class="fw-bold fs-4">Blog Posts</h2>
    <p class="mt-1 text-body-secondary">Uncheck "Visible" to keep a draft off the live site without deleting it.</p>

    <div class="card border-dashed mt-4" data-form-card>
      <div class="card-body">
        <p class="admin-field-label mb-2" data-form-heading>Add new post</p>
        <div data-post-form></div>
        <div class="mt-3 d-flex gap-2">
          <button type="button" data-action="save" class="btn btn-primary btn-sm">Add post</button>
          <button type="button" data-action="cancel" class="btn btn-outline-secondary btn-sm d-none">Cancel</button>
        </div>
        <p data-form-status class="admin-status mt-2"></p>
      </div>
    </div>

    <p class="admin-field-label mt-4 mb-2">Existing (${posts.length})</p>
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead><tr><th>Title</th><th>Published</th><th>Visible</th><th>Sort order</th><th>Actions</th></tr></thead>
        <tbody data-rows>${posts.length ? posts.map(postRowHtml).join("") : EMPTY_POSTS_ROW}</tbody>
      </table>
    </div>
  `;

  const formCard = container.querySelector("[data-form-card]");
  const formEl = container.querySelector("[data-post-form]");
  const formHeading = container.querySelector("[data-form-heading]");
  const saveBtn = container.querySelector('[data-action="save"]');
  const cancelBtn = container.querySelector('[data-action="cancel"]');
  const formStatus = container.querySelector("[data-form-status]");
  let editingId = null;

  const wireUpload = () => {
    const el = formEl.querySelector("[data-upload-field]");
    if (!el) return;
    initImageUploadField(el, {
      pathPrefix: el.dataset.pathPrefix,
      onStatus: (msg) => {
        el.querySelector("[data-upload-status]").textContent = msg;
      },
    });
  };

  function paintForm(post) {
    formEl.innerHTML = postFormHtml(post, allTags, post ? tagsByPost.get(post.id) || new Set() : new Set());
    wireUpload();
  }

  function enterEdit(post) {
    editingId = post.id;
    formHeading.textContent = `Editing "${post.title}"`;
    saveBtn.textContent = "Save";
    cancelBtn.classList.remove("d-none");
    formCard.classList.remove("border-dashed");
    formCard.classList.add("admin-form-editing");
    setStatus(formStatus, "");
    paintForm(post);
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exitEdit() {
    editingId = null;
    formHeading.textContent = "Add new post";
    saveBtn.textContent = "Add post";
    cancelBtn.classList.add("d-none");
    formCard.classList.add("border-dashed");
    formCard.classList.remove("admin-form-editing");
    setStatus(formStatus, "");
    paintForm(null);
  }

  paintForm(null);
  cancelBtn.addEventListener("click", exitEdit);

  saveBtn.addEventListener("click", async () => {
    const { values, tagIds, jsonError } = readPostForm(formEl);
    if (jsonError) {
      setStatus(formStatus, jsonError, "error");
      return;
    }
    saveBtn.disabled = true;
    try {
      if (editingId == null) {
        setStatus(formStatus, "Creating…", "pending");
        const { data: inserted, error } = await supabase.from("blog_posts").insert(values).select().single();
        if (error) {
          setStatus(formStatus, `Error: ${error.message}`, "error");
          return;
        }
        await saveBlogTags(inserted.id, tagIds);
      } else {
        setStatus(formStatus, "Saving…", "pending");
        const { error } = await supabase.from("blog_posts").update(values).eq("id", editingId);
        if (error) {
          setStatus(formStatus, `Error: ${error.message}`, "error");
          return;
        }
        await saveBlogTags(editingId, tagIds);
      }
      renderBlogEditor(container);
    } finally {
      saveBtn.disabled = false;
    }
  });

  container.querySelectorAll("[data-row]").forEach((tr) => {
    const id = tr.dataset.id;

    tr.querySelector('[data-action="edit"]').addEventListener("click", () => {
      enterEdit(posts.find((p) => String(p.id) === String(id)));
    });

    tr.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Delete this post?")) return;
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
      renderBlogEditor(container);
    });
  });
}
