import { supabase } from "../supabase-client.js";
import { initImageUploadField } from "./upload.js";

/**
 * Data-driven CRUD renderer used for every "simple" table (flat columns,
 * no join tables) — nav_links, socials, linkedin_posts, testimonials,
 * stats, technologies, philosophy_items, skills, experience, awards,
 * gallery_images, tags. Projects and blog_posts have their own editors
 * (join tables + jsonb sub-structures don't fit this shape).
 *
 * Each section renders as one form (add new / edit existing, never both
 * at once) followed by a listing table with Edit/Delete actions. Built on
 * Bootstrap components only (form-control, form-switch, table, card, btn).
 *
 * A field config is `{ key, label, type, options? }` where type is one of:
 * text | textarea | number | boolean | select | lines | image | relation.
 *  - "lines": a jsonb text[] edited as one item per line in a textarea.
 *  - "image": a Storage-backed upload widget that writes a public URL into
 *    a plain text column. Pass `dimensionFields: { width, height }` to
 *    auto-fill those two other fields from the uploaded file's real pixel
 *    size instead of asking the admin to type it in.
 *  - "number" fields can set `readonly: true` (used for the width/height
 *    fields above) so they still display but can't be hand-edited.
 *  - "relation": a <select> populated from another table's rows (e.g.
 *    gallery_albums), storing the related row's id (or null for "none").
 *    Config: `{ table, optionLabel, emptyLabel? }`.
 */

function fieldToHtml(field, value, idx) {
  const id = `f-${field.key}-${idx}`;
  const label = `<label class="form-label admin-field-label" for="${id}">${field.label}</label>`;

  switch (field.type) {
    case "textarea":
      return `${label}<textarea id="${id}" data-field="${field.key}" class="form-control">${escapeHtml(value ?? "")}</textarea>`;
    case "lines":
      return `${label}<textarea id="${id}" data-field="${field.key}" data-type="lines" class="form-control" placeholder="One per line">${escapeHtml((value || []).join("\n"))}</textarea>`;
    case "number":
      return `${label}<input id="${id}" data-field="${field.key}" type="number" class="form-control${field.readonly ? " bg-body-secondary" : ""}" value="${value ?? 0}" ${field.readonly ? "readonly" : ""} />`;
    case "boolean":
      return `
        <div class="form-check form-switch">
          <input id="${id}" data-field="${field.key}" data-type="boolean" class="form-check-input" type="checkbox" role="switch" ${value ? "checked" : ""} />
          <label class="form-check-label" for="${id}">${field.label}</label>
        </div>`;
    case "select":
      return `${label}<select id="${id}" data-field="${field.key}" class="form-select">${field.options
        .map((o) => `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`)
        .join("")}</select>`;
    case "relation": {
      const options = field.options || [];
      const optionsHtml = [`<option value="">${escapeHtml(field.emptyLabel || "— None —")}</option>`]
        .concat(options.map((o) => `<option value="${o.value}" ${o.value === value ? "selected" : ""}>${escapeHtml(o.label)}</option>`))
        .join("");
      return `${label}<select id="${id}" data-field="${field.key}" data-type="relation" class="form-select">${optionsHtml}</select>`;
    }
    case "image":
      return `
        ${label}
        <div data-upload-field data-upload-field-key="${field.key}" data-path-prefix="${field.uploadPath}">
          <img data-upload-preview src="${value || ""}" alt="" class="img-fluid rounded mb-2 ${value ? "" : "d-none"}" style="height:6rem;width:100%;object-fit:cover" />
          <input type="file" accept="image/*" data-upload-file class="form-control" />
          <input type="hidden" data-field="${field.key}" data-upload-url value="${value || ""}" />
          <p data-upload-status class="admin-status mt-1"></p>
        </div>`;
    case "text":
    default:
      return `${label}<input id="${id}" data-field="${field.key}" type="text" class="form-control" value="${escapeHtml(value ?? "")}" />`;
  }
}

/** Multi-line/media fields get the full row instead of squeezing into one column of the 2-col grid. */
function fieldColClass(field) {
  return field.type === "textarea" || field.type === "lines" || field.type === "image" ? "col-12" : "col-12 col-sm-6";
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
    else if (field.type === "relation") out[field.key] = el.value || null;
    else out[field.key] = el.value;
  }
  return out;
}

/** Fetches `{ value, label }` options for every "relation" field and caches them on the field config for this render pass. */
async function loadRelationOptions(fields) {
  const relationFields = fields.filter((f) => f.type === "relation");
  await Promise.all(
    relationFields.map(async (field) => {
      const { data, error } = await supabase.from(field.table).select(`id, ${field.optionLabel}`).order(field.optionLabel);
      if (error) {
        console.error(`Failed to load relation options for ${field.table}:`, error);
        field.options = [];
        return;
      }
      field.options = data.map((row) => ({ value: row.id, label: row[field.optionLabel] }));
    })
  );
}

function wireUploads(scopeEl, fields) {
  scopeEl.querySelectorAll("[data-upload-field]").forEach((el) => {
    const field = fields?.find((f) => f.key === el.dataset.uploadFieldKey);
    const dims = field?.dimensionFields;
    initImageUploadField(el, {
      pathPrefix: el.dataset.pathPrefix,
      onStatus: (msg) => {
        el.querySelector("[data-upload-status]").textContent = msg;
      },
      onDimensions: dims
        ? (width, height) => {
            const widthEl = scopeEl.querySelector(`[data-field="${dims.width}"]`);
            const heightEl = scopeEl.querySelector(`[data-field="${dims.height}"]`);
            if (widthEl) widthEl.value = width;
            if (heightEl) heightEl.value = height;
          }
        : undefined,
    });
  });
}

/** Sets status text plus a Bootstrap text-color class (pending/success/error) on a `.admin-status` element. */
export function setStatus(el, text, kind) {
  el.textContent = text;
  el.classList.remove("text-body-secondary", "text-success", "text-danger");
  const cls = { pending: "text-body-secondary", success: "text-success", error: "text-danger" }[kind] || "text-body-secondary";
  el.classList.add(cls);
}

function formatFieldValue(field, value) {
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "lines") {
    const joined = escapeHtml((value || []).join(", "));
    return joined || "—";
  }
  if (field.type === "image") return value ? `<img src="${value}" alt="" class="rounded" style="height:2rem;width:3rem;object-fit:cover" />` : "—";
  if (field.type === "relation") {
    const opt = (field.options || []).find((o) => o.value === value);
    return opt ? escapeHtml(opt.label) : "—";
  }
  if (value === null || value === undefined || value === "") return "—";
  const str = escapeHtml(String(value));
  return str.length > 60 ? `${str.slice(0, 57)}…` : str;
}

function rowHtml(config, row, idx, total) {
  const cells = config.fields.map((f) => `<td>${formatFieldValue(f, row[f.key])}</td>`).join("");
  return `
    <tr data-row data-id="${row.id}">
      ${cells}
      <td>
        <div class="d-flex align-items-center gap-1">
          <button type="button" data-action="up" class="btn btn-outline-secondary btn-sm" aria-label="Move up" ${idx === 0 ? "disabled" : ""}>&uarr;</button>
          <button type="button" data-action="down" class="btn btn-outline-secondary btn-sm" aria-label="Move down" ${idx === total - 1 ? "disabled" : ""}>&darr;</button>
          <button type="button" data-action="edit" class="btn btn-outline-secondary btn-sm">Edit</button>
          <button type="button" data-action="delete" class="btn btn-outline-danger btn-sm">Delete</button>
        </div>
      </td>
    </tr>`;
}

export async function renderListCrud(container, config) {
  container.innerHTML = `<p class="text-body-secondary">Loading…</p>`;

  let query = supabase.from(config.table).select("*").order(config.orderBy || "sort_order");
  if (config.filter) query = query.eq(config.filter.column, config.filter.value);
  const [{ data: rows, error }] = await Promise.all([query, loadRelationOptions(config.fields)]);
  if (error) {
    container.innerHTML = `<p class="text-danger">Failed to load ${config.table}: ${error.message}</p>`;
    return;
  }

  const emptyRow = `<tr><td class="admin-table-empty" colspan="${config.fields.length + 1}">No entries yet — use the form above to add one.</td></tr>`;

  container.innerHTML = `
    <h2 class="fw-bold fs-4">${config.title}</h2>
    ${config.description ? `<p class="mt-1 text-body-secondary">${config.description}</p>` : ""}

    <div class="card border-dashed mt-4" data-form-card>
      <div class="card-body">
        <p class="admin-field-label mb-2" data-form-heading>Add new</p>
        <div data-row-form></div>
        <div class="mt-3 d-flex gap-2">
          <button type="button" data-action="save" class="btn btn-primary btn-sm">Add</button>
          <button type="button" data-action="cancel" class="btn btn-outline-secondary btn-sm d-none">Cancel</button>
        </div>
        <p data-form-status class="admin-status mt-2"></p>
      </div>
    </div>

    <p class="admin-field-label mt-4 mb-2">Existing (${rows.length})</p>
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead><tr>${config.fields.map((f) => `<th>${f.label}</th>`).join("")}<th>Actions</th></tr></thead>
        <tbody data-rows>${rows.length ? rows.map((row, i) => rowHtml(config, row, i, rows.length)).join("") : emptyRow}</tbody>
      </table>
    </div>
  `;

  const formCard = container.querySelector("[data-form-card]");
  const rowFormEl = container.querySelector("[data-row-form]");
  const formHeading = container.querySelector("[data-form-heading]");
  const saveBtn = container.querySelector('[data-action="save"]');
  const cancelBtn = container.querySelector('[data-action="cancel"]');
  const formStatus = container.querySelector("[data-form-status]");
  let editingId = null;

  function paintForm(row) {
    rowFormEl.innerHTML = `<div class="row g-3">${config.fields
      .map((f) => `<div class="${fieldColClass(f)}">${fieldToHtml(f, row ? row[f.key] : f.default ?? "", row ? row.id : "new")}</div>`)
      .join("")}</div>`;
    wireUploads(rowFormEl, config.fields);
  }

  function enterEdit(row) {
    editingId = row.id;
    formHeading.textContent = `Editing "${config.title}"`;
    saveBtn.textContent = "Save";
    cancelBtn.classList.remove("d-none");
    formCard.classList.remove("border-dashed");
    formCard.classList.add("admin-form-editing");
    setStatus(formStatus, "");
    paintForm(row);
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exitEdit() {
    editingId = null;
    formHeading.textContent = "Add new";
    saveBtn.textContent = "Add";
    cancelBtn.classList.add("d-none");
    formCard.classList.add("border-dashed");
    formCard.classList.remove("admin-form-editing");
    setStatus(formStatus, "");
    paintForm(null);
  }

  paintForm(null);
  cancelBtn.addEventListener("click", exitEdit);

  saveBtn.addEventListener("click", async () => {
    const values = readFieldsFromForm(rowFormEl, config.fields);
    saveBtn.disabled = true;
    try {
      if (editingId == null) {
        if (!values.sort_order && config.fields.some((f) => f.key === "sort_order")) {
          values.sort_order = rows.length;
        }
        if (config.filter) values[config.filter.column] = config.filter.value;
        setStatus(formStatus, "Creating…", "pending");
        const { error: err } = await supabase.from(config.table).insert(values);
        if (err) {
          setStatus(formStatus, `Error: ${err.message}`, "error");
          return;
        }
      } else {
        setStatus(formStatus, "Saving…", "pending");
        const { error: err } = await supabase.from(config.table).update(values).eq("id", editingId);
        if (err) {
          setStatus(formStatus, `Error: ${err.message}`, "error");
          return;
        }
      }
      renderListCrud(container, config);
    } finally {
      saveBtn.disabled = false;
    }
  });

  container.querySelectorAll("[data-row]").forEach((tr, idx) => {
    const id = tr.dataset.id;

    tr.querySelector('[data-action="edit"]').addEventListener("click", () => {
      enterEdit(rows.find((r) => String(r.id) === String(id)));
    });

    tr.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm(`Delete this ${config.title.toLowerCase()} row?`)) return;
      const { error: err } = await supabase.from(config.table).delete().eq("id", id);
      if (err) {
        alert(`Error: ${err.message}`);
        return;
      }
      renderListCrud(container, config);
    });

    const neighborBtn = (action, offset) => {
      const btn = tr.querySelector(`[data-action="${action}"]`);
      btn?.addEventListener("click", async () => {
        const neighbor = rows[idx + offset];
        if (!neighbor) return;
        const a = rows[idx].sort_order ?? idx;
        const b = neighbor.sort_order ?? idx + offset;
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
}

/** Singleton tables (id boolean primary key) — one row, edit + save only. */
export async function renderSingletonForm(container, config) {
  container.innerHTML = `<p class="text-body-secondary">Loading…</p>`;

  const { data: row, error } = await supabase.from(config.table).select("*").eq("id", true).single();
  if (error) {
    container.innerHTML = `<p class="text-danger">Failed to load ${config.table}: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h2 class="fw-bold fs-4">${config.title}</h2>
    ${config.description ? `<p class="mt-1 text-body-secondary">${config.description}</p>` : ""}
    <div class="card mt-4">
      <div class="card-body" data-row-form>
        <div class="row g-3">
          ${config.fields.map((f) => `<div class="${fieldColClass(f)}">${fieldToHtml(f, row[f.key], "singleton")}</div>`).join("")}
        </div>
        <button type="button" data-action="save" class="btn btn-primary btn-sm mt-3">Save</button>
        <p data-row-status class="admin-status mt-2"></p>
      </div>
    </div>
  `;

  const form = container.querySelector("[data-row-form]");
  wireUploads(form, config.fields);
  const statusEl = form.querySelector("[data-row-status]");
  const saveBtn = form.querySelector('[data-action="save"]');
  saveBtn.addEventListener("click", async () => {
    const values = readFieldsFromForm(form, config.fields);
    saveBtn.disabled = true;
    setStatus(statusEl, "Saving…", "pending");
    const { error: err } = await supabase.from(config.table).update(values).eq("id", true);
    saveBtn.disabled = false;
    setStatus(statusEl, err ? `Error: ${err.message}` : "Saved.", err ? "error" : "success");
  });
}

/**
 * Fixed-key-set tables (page_intros) — known rows, edit only, no add/delete.
 * Pass `keyValue` to show just the one row relevant to the current tab
 * (e.g. page_intros where page = 'blog') instead of every row in the table.
 */
export async function renderFixedRowsForm(container, config) {
  container.innerHTML = `<p class="text-body-secondary">Loading…</p>`;

  let query = supabase.from(config.table).select("*").order(config.keyField);
  if (config.keyValue) query = query.eq(config.keyField, config.keyValue);
  const { data: rows, error } = await query;
  if (error) {
    container.innerHTML = `<p class="text-danger">Failed to load ${config.table}: ${error.message}</p>`;
    return;
  }

  container.innerHTML = `
    <h2 class="fw-bold fs-4">${config.title}</h2>
    ${config.description ? `<p class="mt-1 text-body-secondary">${config.description}</p>` : ""}
    <div class="mt-4 d-flex flex-column gap-3">
      ${rows
        .map(
          (row) => `
            <div class="card" data-row-form data-key="${row[config.keyField]}">
              <div class="card-body">
                <p class="admin-field-label mb-2">${row[config.keyField]}</p>
                <div class="row g-3">
                  ${config.fields.map((f) => `<div class="${fieldColClass(f)}">${fieldToHtml(f, row[f.key], row[config.keyField])}</div>`).join("")}
                </div>
                <button type="button" data-action="save" class="btn btn-primary btn-sm mt-3">Save</button>
                <p data-row-status class="admin-status mt-2"></p>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll("[data-row-form]").forEach((form) => {
    const key = form.dataset.key;
    const statusEl = form.querySelector("[data-row-status]");
    const saveBtn = form.querySelector('[data-action="save"]');
    saveBtn.addEventListener("click", async () => {
      const values = readFieldsFromForm(form, config.fields);
      saveBtn.disabled = true;
      setStatus(statusEl, "Saving…", "pending");
      const { error: err } = await supabase.from(config.table).update(values).eq(config.keyField, key);
      saveBtn.disabled = false;
      setStatus(statusEl, err ? `Error: ${err.message}` : "Saved.", err ? "error" : "success");
    });
  });
}
