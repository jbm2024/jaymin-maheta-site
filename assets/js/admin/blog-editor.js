import { supabase } from "../supabase-client.js";
import { initImageUploadField } from "./upload.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function tagChipsHtml(allTags, selectedIds) {
  return allTags
    .map(
      (t) => `
        <label class="admin-checkbox-chip">
          <input type="checkbox" value="${t.id}" data-tag-checkbox ${selectedIds.has(t.id) ? "checked" : ""} />
          ${t.name}
        </label>`
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
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><label class="admin-field-label">Slug (URL id, unique)</label><input data-f="slug" class="admin-input" value="${escapeHtml(p.slug)}" /></div>
      <div><label class="admin-field-label">Title</label><input data-f="title" class="admin-input" value="${escapeHtml(p.title)}" /></div>
      <div><label class="admin-field-label">Published date</label><input data-f="published_date" type="date" class="admin-input" value="${p.published_date}" /></div>
      <div><label class="admin-field-label">Read time (e.g. "6 min read")</label><input data-f="read_time" class="admin-input" value="${escapeHtml(p.read_time)}" /></div>
      <div><label class="admin-field-label">Author name</label><input data-f="author_name" class="admin-input" value="${escapeHtml(p.author_name)}" /></div>
      <div><label class="admin-field-label">Author role</label><input data-f="author_role" class="admin-input" value="${escapeHtml(p.author_role)}" /></div>
      <div><label class="admin-field-label">Author initials</label><input data-f="author_initials" class="admin-input" value="${escapeHtml(p.author_initials)}" /></div>
      <div><label class="admin-field-label">Sort order</label><input data-f="sort_order" type="number" class="admin-input" value="${p.sort_order ?? 0}" /></div>
    </div>
    <div class="mt-3"><label class="admin-field-label">Excerpt</label><textarea data-f="excerpt" class="admin-textarea">${escapeHtml(p.excerpt)}</textarea></div>
    <div class="mt-3" data-upload-field data-path-prefix="blog">
      <label class="admin-field-label">Cover image</label>
      <img data-upload-preview src="${p.cover_image || ""}" alt="" class="mb-2 h-32 w-full rounded-[var(--radius-sm)] object-cover ${p.cover_image ? "" : "hidden"}" />
      <input type="file" accept="image/*" data-upload-file class="admin-input" />
      <input type="hidden" data-f="cover_image" data-upload-url value="${escapeHtml(p.cover_image)}" />
      <p data-upload-status class="mt-1 text-xs text-[var(--color-text-muted)]"></p>
    </div>
    <div class="mt-3">
      <label class="admin-field-label">Content (JSON block array)</label>
      <textarea data-f="content" data-type="json" class="admin-textarea" style="min-height:8rem" placeholder='${CONTENT_HINT}'>${escapeHtml(JSON.stringify(p.content, null, 2))}</textarea>
      <p class="mt-1 text-xs text-[var(--color-text-muted)]">Shape: ${CONTENT_HINT}</p>
    </div>
    <div class="mt-3 flex items-center gap-2">
      <label class="flex items-center gap-2 text-sm"><input data-f="visible" data-type="boolean" type="checkbox" ${p.visible ? "checked" : ""} /> Visible (published)</label>
    </div>
    <div class="mt-3">
      <label class="admin-field-label">Tags</label>
      <div class="flex flex-wrap gap-2">${tagChipsHtml(allTags, selectedTagIds)}</div>
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

export async function renderBlogEditor(container) {
  container.innerHTML = `<p class="text-sm text-[var(--color-text-muted)]">Loading…</p>`;

  const [{ data: posts, error: postErr }, { data: allTags, error: tagErr }, { data: joins, error: joinErr }] = await Promise.all([
    supabase.from("blog_posts").select("*").order("sort_order"),
    supabase.from("tags").select("*").order("name"),
    supabase.from("blog_post_tags").select("*"),
  ]);
  if (postErr || tagErr || joinErr) {
    container.innerHTML = `<p class="text-sm text-red-400">Failed to load blog posts: ${(postErr || tagErr || joinErr).message}</p>`;
    return;
  }

  const tagsByPost = new Map();
  for (const j of joins) {
    if (!tagsByPost.has(j.blog_post_id)) tagsByPost.set(j.blog_post_id, new Set());
    tagsByPost.get(j.blog_post_id).add(j.tag_id);
  }

  container.innerHTML = `
    <h2 class="font-heading text-lg font-bold">Blog Posts</h2>
    <p class="mt-1 text-sm text-[var(--color-text-muted)]">Uncheck "Visible" to keep a draft off the live site without deleting it.</p>

    <div class="mt-4 admin-row-card border-dashed">
      <p class="admin-field-label">Add new post</p>
      <div data-new-post-form>${postFormHtml(null, allTags, new Set())}</div>
      <button type="button" data-action="create" class="btn btn-primary mt-4 !px-4 !py-2 text-xs">Add post</button>
      <p data-new-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
    </div>

    <p class="admin-field-label mt-8">Existing (${posts.length})</p>
    <div data-posts-list class="mt-3 space-y-6"></div>
  `;

  const wireUpload = (form) => {
    const el = form.querySelector("[data-upload-field]");
    if (!el) return;
    initImageUploadField(el, {
      pathPrefix: el.dataset.pathPrefix,
      onStatus: (msg) => {
        el.querySelector("[data-upload-status]").textContent = msg;
      },
    });
  };

  const list = container.querySelector("[data-posts-list]");
  list.innerHTML = posts
    .map(
      (p) => `
        <div class="admin-row-card" data-post-form data-id="${p.id}">
          ${postFormHtml(p, allTags, tagsByPost.get(p.id) || new Set())}
          <div class="mt-4 flex justify-end gap-2">
            <button type="button" data-action="save" class="btn btn-secondary !px-4 !py-2 text-xs">Save</button>
            <button type="button" data-action="delete" class="btn btn-secondary !px-4 !py-2 text-xs !border-red-500/50 hover:!border-red-500">Delete</button>
          </div>
          <p data-row-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
        </div>
      `
    )
    .join("");

  list.querySelectorAll("[data-post-form]").forEach((form) => {
    wireUpload(form);
    const id = form.dataset.id;
    const statusEl = form.querySelector("[data-row-status]");
    form.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const { values, tagIds, jsonError } = readPostForm(form);
      if (jsonError) {
        statusEl.textContent = jsonError;
        return;
      }
      statusEl.textContent = "Saving…";
      const { error } = await supabase.from("blog_posts").update(values).eq("id", id);
      if (error) {
        statusEl.textContent = `Error: ${error.message}`;
        return;
      }
      await saveBlogTags(id, tagIds);
      statusEl.textContent = "Saved.";
    });
    form.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Delete this post?")) return;
      statusEl.textContent = "Deleting…";
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) {
        statusEl.textContent = `Error: ${error.message}`;
        return;
      }
      renderBlogEditor(container);
    });
  });

  const newForm = container.querySelector("[data-new-post-form]");
  wireUpload(newForm);
  const newStatus = container.querySelector("[data-new-status]");
  container.querySelector('[data-action="create"]').addEventListener("click", async () => {
    const { values, tagIds, jsonError } = readPostForm(newForm);
    if (jsonError) {
      newStatus.textContent = jsonError;
      return;
    }
    newStatus.textContent = "Creating…";
    const { data: inserted, error } = await supabase.from("blog_posts").insert(values).select().single();
    if (error) {
      newStatus.textContent = `Error: ${error.message}`;
      return;
    }
    await saveBlogTags(inserted.id, tagIds);
    renderBlogEditor(container);
  });
}
