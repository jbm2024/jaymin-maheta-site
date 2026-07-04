import { supabase } from "../supabase-client.js";
import { initImageUploadField } from "./upload.js";

/**
 * Data-driven CRUD renderer used for every "simple" table (flat columns,
 * no join tables) — nav_links, socials, linkedin_posts, testimonials,
 * stats, technologies, philosophy_items, skills, experience, awards,
 * gallery_images, tags. Projects and blog_posts have their own editors
 * (join tables + jsonb sub-structures don't fit this shape).
 *
 * A field config is `{ key, label, type, options? }` where type is one of:
 * text | textarea | number | boolean | select | lines | image.
 *  - "lines": a jsonb text[] edited as one item per line in a textarea.
 *  - "image": a Storage-backed upload widget that writes a public URL into
 *    a plain text column.
 */

function fieldToHtml(field, value, idx) {
  const id = `f-${field.key}-${idx}`;
  const label = `<label class="admin-field-label" for="${id}">${field.label}</label>`;

  switch (field.type) {
    case "textarea":
      return `${label}<textarea id="${id}" data-field="${field.key}" class="admin-textarea">${escapeHtml(value ?? "")}</textarea>`;
    case "lines":
      return `${label}<textarea id="${id}" data-field="${field.key}" data-type="lines" class="admin-textarea" placeholder="One per line">${escapeHtml((value || []).join("\n"))}</textarea>`;
    case "number":
      return `${label}<input id="${id}" data-field="${field.key}" type="number" class="admin-input" value="${value ?? 0}" />`;
    case "boolean":
      return `<label class="flex items-center gap-2 text-sm"><input id="${id}" data-field="${field.key}" data-type="boolean" type="checkbox" ${value ? "checked" : ""} /> ${field.label}</label>`;
    case "select":
      return `${label}<select id="${id}" data-field="${field.key}" class="admin-select">${field.options
        .map((o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`)
        .join("")}</select>`;
    case "image":
      return `
        ${label}
        <div data-upload-field data-path-prefix="${field.uploadPath}">
          <img data-upload-preview src="${value || ""}" alt="" class="mb-2 h-24 w-full rounded-[var(--radius-sm)] object-cover ${value ? "" : "hidden"}" />
          <input type="file" accept="image/*" data-upload-file class="admin-input" />
          <input type="hidden" data-field="${field.key}" data-upload-url value="${value || ""}" />
          <p data-upload-status class="mt-1 text-xs text-[var(--color-text-muted)]"></p>
        </div>`;
    case "text":
    default:
      return `${label}<input id="${id}" data-field="${field.key}" type="text" class="admin-input" value="${escapeHtml(value ?? "")}" />`;
  }
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function readFieldsFromForm(form, fields) {
  const out = {};
  for (const field of fields) {
    const el = form.querySelector(`[data-field="${field.key}"]`);
    if (!el) continue;
    if (field.type === "boolean") out[field.key] = el.checked;
    else if (field.type === "number") out[field.key] = Number(el.value);
    else if (field.type === "lines") out[field.key] = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    else out[field.key] = el.value;
  }
  return out;
}

function rowCardHtml(config, row, idx, total) {
  const fieldsHtml = config.fields.map((f) => `<div>${fieldToHtml(f, row[f.key], row.id ?? idx)}</div>`).join("");
  return `
    <div class="admin-row-card" data-row-form data-id="${row.id}">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">${fieldsHtml}</div>
      <div class="mt-4 flex items-center justify-between gap-2">
        <div class="flex gap-1">
          <button type="button" data-action="up" class="admin-icon-btn" aria-label="Move up" ${idx === 0 ? "disabled" : ""}>&uarr;</button>
          <button type="button" data-action="down" class="admin-icon-btn" aria-label="Move down" ${idx === total - 1 ? "disabled" : ""}>&darr;</button>
        </div>
        <div class="flex gap-2">
          <button type="button" data-action="save" class="btn btn-secondary !px-4 !py-2 text-xs">Save</button>
          <button type="button" data-action="delete" class="btn btn-secondary !px-4 !py-2 text-xs !border-red-500/50 hover:!border-red-500">Delete</button>
        </div>
      </div>
      <p data-row-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
    </div>`;
}

export async function renderListCrud(container, config) {
  container.innerHTML = `<p class="text-sm text-[var(--color-text-muted)]">Loading…</p>`;

  let query = supabase.from(config.table).select("*").order(config.orderBy || "sort_order");
  if (config.filter) query = query.eq(config.filter.column, config.filter.value);
  const { data: rows, error } = await query;
  if (error) {
    container.innerHTML = `<p class="text-sm text-red-400">Failed to load ${config.table}: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h2 class="font-heading text-lg font-bold">${config.title}</h2>
    ${config.description ? `<p class="mt-1 text-sm text-[var(--color-text-muted)]">${config.description}</p>` : ""}

    <div class="mt-4 admin-row-card border-dashed">
      <p class="admin-field-label">Add new</p>
      <div data-new-row-form>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          ${config.fields.map((f) => `<div>${fieldToHtml(f, f.default ?? "", "new")}</div>`).join("")}
        </div>
        <button type="button" data-action="create" class="btn btn-primary mt-4 !px-4 !py-2 text-xs">Add</button>
        <p data-new-row-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
      </div>
    </div>

    <p class="admin-field-label mt-8">Existing (${rows.length})</p>
    <div data-rows class="mt-3 space-y-4">
      ${rows.map((row, i) => rowCardHtml(config, row, i, rows.length)).join("")}
    </div>
  `;

  container.querySelectorAll("[data-upload-field]").forEach((el) => {
    initImageUploadField(el, {
      pathPrefix: el.dataset.pathPrefix,
      onStatus: (msg) => {
        el.querySelector("[data-upload-status]").textContent = msg;
      },
    });
  });

  container.querySelectorAll("[data-row-form]").forEach((form, idx) => {
    const id = form.dataset.id;
    const statusEl = form.querySelector("[data-row-status]");

    form.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const values = readFieldsFromForm(form, config.fields);
      statusEl.textContent = "Saving…";
      const { error: err } = await supabase.from(config.table).update(values).eq("id", id);
      statusEl.textContent = err ? `Error: ${err.message}` : "Saved.";
    });

    form.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm(`Delete this ${config.title.toLowerCase()} row?`)) return;
      statusEl.textContent = "Deleting…";
      const { error: err } = await supabase.from(config.table).delete().eq("id", id);
      if (err) {
        statusEl.textContent = `Error: ${err.message}`;
        return;
      }
      renderListCrud(container, config);
    });

    const neighborBtn = (action, offset) => {
      const btn = form.querySelector(`[data-action="${action}"]`);
      btn?.addEventListener("click", async () => {
        const neighbor = rows[idx + offset];
        if (!neighbor) return;
        const a = rows[idx].sort_order ?? idx;
        const b = neighbor.sort_order ?? idx + offset;
        statusEl.textContent = "Reordering…";
        await Promise.all([
          supabase.from(config.table).update({ sort_order: b }).eq("id", rows[idx].id),
          supabase.from(config.table).update({ sort_order: a }).eq("id", neighbor.id),
        ]);
        renderListCrud(container, config);
      });
    };
    neighborBtn("up", -1);
    neighborBtn("down", 1);
  });

  const newForm = container.querySelector("[data-new-row-form]");
  const newStatus = container.querySelector("[data-new-row-status]");
  newForm.querySelector('[data-action="create"]').addEventListener("click", async () => {
    const values = readFieldsFromForm(newForm, config.fields);
    if (!values.sort_order && config.fields.some((f) => f.key === "sort_order")) {
      values.sort_order = rows.length;
    }
    if (config.filter) values[config.filter.column] = config.filter.value;
    newStatus.textContent = "Creating…";
    const { error: err } = await supabase.from(config.table).insert(values);
    if (err) {
      newStatus.textContent = `Error: ${err.message}`;
      return;
    }
    renderListCrud(container, config);
  });
}

/** Singleton tables (id boolean primary key) — one row, edit + save only. */
export async function renderSingletonForm(container, config) {
  container.innerHTML = `<p class="text-sm text-[var(--color-text-muted)]">Loading…</p>`;

  const { data: row, error } = await supabase.from(config.table).select("*").eq("id", true).single();
  if (error) {
    container.innerHTML = `<p class="text-sm text-red-400">Failed to load ${config.table}: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h2 class="font-heading text-lg font-bold">${config.title}</h2>
    ${config.description ? `<p class="mt-1 text-sm text-[var(--color-text-muted)]">${config.description}</p>` : ""}
    <div data-row-form class="admin-row-card mt-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        ${config.fields.map((f) => `<div>${fieldToHtml(f, row[f.key], "singleton")}</div>`).join("")}
      </div>
      <button type="button" data-action="save" class="btn btn-primary mt-4 !px-4 !py-2 text-xs">Save</button>
      <p data-row-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
    </div>
  `;

  const form = container.querySelector("[data-row-form]");
  container.querySelectorAll("[data-upload-field]").forEach((el) => {
    initImageUploadField(el, {
      pathPrefix: el.dataset.pathPrefix,
      onStatus: (msg) => {
        el.querySelector("[data-upload-status]").textContent = msg;
      },
    });
  });
  const statusEl = form.querySelector("[data-row-status]");
  form.querySelector('[data-action="save"]').addEventListener("click", async () => {
    const values = readFieldsFromForm(form, config.fields);
    statusEl.textContent = "Saving…";
    const { error: err } = await supabase.from(config.table).update(values).eq("id", true);
    statusEl.textContent = err ? `Error: ${err.message}` : "Saved.";
  });
}

/**
 * Fixed-key-set tables (page_intros) — known rows, edit only, no add/delete.
 * Pass `keyValue` to show just the one row relevant to the current tab
 * (e.g. page_intros where page = 'blog') instead of every row in the table.
 */
export async function renderFixedRowsForm(container, config) {
  container.innerHTML = `<p class="text-sm text-[var(--color-text-muted)]">Loading…</p>`;

  let query = supabase.from(config.table).select("*").order(config.keyField);
  if (config.keyValue) query = query.eq(config.keyField, config.keyValue);
  const { data: rows, error } = await query;
  if (error) {
    container.innerHTML = `<p class="text-sm text-red-400">Failed to load ${config.table}: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h2 class="font-heading text-lg font-bold">${config.title}</h2>
    ${config.description ? `<p class="mt-1 text-sm text-[var(--color-text-muted)]">${config.description}</p>` : ""}
    <div class="mt-4 space-y-4">
      ${rows
        .map(
          (row) => `
            <div class="admin-row-card" data-row-form data-key="${row[config.keyField]}">
              <p class="admin-field-label">${row[config.keyField]}</p>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                ${config.fields.map((f) => `<div>${fieldToHtml(f, row[f.key], row[config.keyField])}</div>`).join("")}
              </div>
              <button type="button" data-action="save" class="btn btn-primary mt-4 !px-4 !py-2 text-xs">Save</button>
              <p data-row-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
            </div>
          `
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-row-form]").forEach((form) => {
    const key = form.dataset.key;
    const statusEl = form.querySelector("[data-row-status]");
    form.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const values = readFieldsFromForm(form, config.fields);
      statusEl.textContent = "Saving…";
      const { error: err } = await supabase.from(config.table).update(values).eq(config.keyField, key);
      statusEl.textContent = err ? `Error: ${err.message}` : "Saved.";
    });
  });
}
