import { supabase } from "../supabase-client.js";
import { setStatus } from "./generic-crud.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** results is stored as jsonb [{value,suffix,label}] — edited as one "value|suffix|label" per line. */
function resultsToLines(results) {
  return (results || []).map((r) => `${r.value}|${r.suffix || ""}|${r.label}`).join("\n");
}
function linesToResults(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, suffix, ...labelParts] = line.split("|");
      return { value: Number(value) || 0, suffix: suffix || "", label: labelParts.join("|").trim() };
    });
}

/** Bootstrap's native checkbox-toggle-button pattern: visually-hidden input + a <label> styled as a btn. */
function techChipsHtml(allTech, selectedIds) {
  return allTech
    .map(
      (t) => `
        <input type="checkbox" class="btn-check" value="${t.id}" data-tech-checkbox id="tech-chip-${t.id}" autocomplete="off" ${selectedIds.has(t.id) ? "checked" : ""} />
        <label class="btn btn-outline-secondary btn-sm rounded-pill" for="tech-chip-${t.id}">${escapeHtml(t.name)}</label>`
    )
    .join("");
}

function projectFormHtml(project, allTech, selectedTechIds) {
  const p = project || {
    slug: "",
    title: "",
    category: "",
    duration: "",
    role: "",
    summary: "",
    problem: "",
    approach: [],
    role_detail: "",
    impact: "",
    results: [],
    links: {},
    featured: false,
    home_blurb: "",
    sort_order: 0,
  };
  return `
    <div class="row g-3">
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Slug (URL id, unique)</label><input data-f="slug" class="form-control" value="${escapeHtml(p.slug)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Title</label><input data-f="title" class="form-control" value="${escapeHtml(p.title)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Category</label><input data-f="category" class="form-control" value="${escapeHtml(p.category)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Duration</label><input data-f="duration" class="form-control" value="${escapeHtml(p.duration)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Role</label><input data-f="role" class="form-control" value="${escapeHtml(p.role)}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Sort order</label><input data-f="sort_order" type="number" class="form-control" value="${p.sort_order ?? 0}" /></div>
    </div>
    <div class="mt-3"><label class="form-label admin-field-label">Summary</label><textarea data-f="summary" class="form-control">${escapeHtml(p.summary)}</textarea></div>
    <div class="mt-3"><label class="form-label admin-field-label">Problem</label><textarea data-f="problem" class="form-control">${escapeHtml(p.problem)}</textarea></div>
    <div class="mt-3"><label class="form-label admin-field-label">Approach (one step per line)</label><textarea data-f="approach" data-type="lines" class="form-control">${escapeHtml((p.approach || []).join("\n"))}</textarea></div>
    <div class="mt-3"><label class="form-label admin-field-label">Role detail</label><textarea data-f="role_detail" class="form-control">${escapeHtml(p.role_detail)}</textarea></div>
    <div class="mt-3"><label class="form-label admin-field-label">Impact</label><textarea data-f="impact" class="form-control">${escapeHtml(p.impact)}</textarea></div>
    <div class="mt-3">
      <label class="form-label admin-field-label">Results — one per line, format: value|suffix|label</label>
      <textarea data-f="results" data-type="results" class="form-control" placeholder="12|+|Form patterns unified">${escapeHtml(resultsToLines(p.results))}</textarea>
    </div>
    <div class="mt-3 row g-3">
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Live link</label><input data-f="links.live" class="form-control" value="${escapeHtml(p.links?.live || "")}" /></div>
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Repo link</label><input data-f="links.repo" class="form-control" value="${escapeHtml(p.links?.repo || "")}" /></div>
    </div>
    <div class="mt-3 row g-3 align-items-end">
      <div class="col-12 col-sm-6"><label class="form-label admin-field-label">Home teaser blurb (shown only if featured)</label><textarea data-f="home_blurb" class="form-control">${escapeHtml(p.home_blurb)}</textarea></div>
      <div class="col-12 col-sm-6">
        <div class="form-check form-switch">
          <input data-f="featured" data-type="boolean" class="form-check-input" type="checkbox" role="switch" id="f-featured" ${p.featured ? "checked" : ""} />
          <label class="form-check-label" for="f-featured">Featured on home page</label>
        </div>
      </div>
    </div>
    <div class="mt-3">
      <label class="form-label admin-field-label">Technologies</label>
      <div class="d-flex flex-wrap gap-2">${techChipsHtml(allTech, selectedTechIds)}</div>
    </div>
  `;
}

function readProjectForm(form) {
  const values = { links: {} };
  form.querySelectorAll("[data-f]").forEach((el) => {
    const key = el.dataset.f;
    let value;
    if (el.dataset.type === "boolean") value = el.checked;
    else if (el.dataset.type === "lines") value = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
    else if (el.dataset.type === "results") value = linesToResults(el.value);
    else if (el.tagName === "INPUT" && el.type === "number") value = Number(el.value);
    else value = el.value;

    if (key.startsWith("links.")) values.links[key.split(".")[1]] = value;
    else values[key] = value;
  });
  const techIds = Array.from(form.querySelectorAll("[data-tech-checkbox]:checked")).map((el) => el.value);
  return { values, techIds };
}

async function saveProjectTech(projectId, techIds) {
  await supabase.from("project_technologies").delete().eq("project_id", projectId);
  if (techIds.length) {
    await supabase.from("project_technologies").insert(techIds.map((technology_id) => ({ project_id: projectId, technology_id })));
  }
}

function projectRowHtml(p) {
  return `
    <tr data-row data-id="${p.id}">
      <td>${escapeHtml(p.title || "—")}</td>
      <td>${escapeHtml(p.category || "—")}</td>
      <td>${p.featured ? "Yes" : "No"}</td>
      <td>${p.sort_order ?? 0}</td>
      <td>
        <div class="d-flex align-items-center gap-1">
          <button type="button" data-action="edit" class="btn btn-outline-secondary btn-sm">Edit</button>
          <button type="button" data-action="delete" class="btn btn-outline-danger btn-sm">Delete</button>
        </div>
      </td>
    </tr>`;
}

const EMPTY_PROJECTS_ROW = `<tr><td class="admin-table-empty" colspan="5">No projects yet — use the form above to add one.</td></tr>`;

export async function renderProjectsEditor(container) {
  container.innerHTML = `<p class="text-body-secondary">Loading…</p>`;

  const [{ data: projects, error: pErr }, { data: allTech, error: tErr }, { data: joins, error: jErr }] = await Promise.all([
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("technologies").select("*").order("name"),
    supabase.from("project_technologies").select("*"),
  ]);
  if (pErr || tErr || jErr) {
    container.innerHTML = `<p class="text-danger">Failed to load projects: ${(pErr || tErr || jErr).message}</p>`;
    return;
  }

  const techByProject = new Map();
  for (const j of joins) {
    if (!techByProject.has(j.project_id)) techByProject.set(j.project_id, new Set());
    techByProject.get(j.project_id).add(j.technology_id);
  }

  container.innerHTML = `
    <h2 class="fw-bold fs-4">Projects</h2>
    <p class="mt-1 text-body-secondary">Case studies shown on the Projects page; check "Featured" to also surface one on the home page teaser grid.</p>

    <div class="card border-dashed mt-4" data-form-card>
      <div class="card-body">
        <p class="admin-field-label mb-2" data-form-heading>Add new project</p>
        <div data-project-form></div>
        <div class="mt-3 d-flex gap-2">
          <button type="button" data-action="save" class="btn btn-primary btn-sm">Add project</button>
          <button type="button" data-action="cancel" class="btn btn-outline-secondary btn-sm d-none">Cancel</button>
        </div>
        <p data-form-status class="admin-status mt-2"></p>
      </div>
    </div>

    <p class="admin-field-label mt-4 mb-2">Existing (${projects.length})</p>
    <div class="table-responsive">
      <table class="table table-hover align-middle">
        <thead><tr><th>Title</th><th>Category</th><th>Featured</th><th>Sort order</th><th>Actions</th></tr></thead>
        <tbody data-rows>${projects.length ? projects.map(projectRowHtml).join("") : EMPTY_PROJECTS_ROW}</tbody>
      </table>
    </div>
  `;

  const formCard = container.querySelector("[data-form-card]");
  const formEl = container.querySelector("[data-project-form]");
  const formHeading = container.querySelector("[data-form-heading]");
  const saveBtn = container.querySelector('[data-action="save"]');
  const cancelBtn = container.querySelector('[data-action="cancel"]');
  const formStatus = container.querySelector("[data-form-status]");
  let editingId = null;

  function paintForm(project) {
    formEl.innerHTML = projectFormHtml(project, allTech, project ? techByProject.get(project.id) || new Set() : new Set());
  }

  function enterEdit(project) {
    editingId = project.id;
    formHeading.textContent = `Editing "${project.title}"`;
    saveBtn.textContent = "Save";
    cancelBtn.classList.remove("d-none");
    formCard.classList.remove("border-dashed");
    formCard.classList.add("admin-form-editing");
    setStatus(formStatus, "");
    paintForm(project);
    formCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function exitEdit() {
    editingId = null;
    formHeading.textContent = "Add new project";
    saveBtn.textContent = "Add project";
    cancelBtn.classList.add("d-none");
    formCard.classList.add("border-dashed");
    formCard.classList.remove("admin-form-editing");
    setStatus(formStatus, "");
    paintForm(null);
  }

  paintForm(null);
  cancelBtn.addEventListener("click", exitEdit);

  saveBtn.addEventListener("click", async () => {
    const { values, techIds } = readProjectForm(formEl);
    saveBtn.disabled = true;
    try {
      if (editingId == null) {
        setStatus(formStatus, "Creating…", "pending");
        const { data: inserted, error } = await supabase.from("projects").insert(values).select().single();
        if (error) {
          setStatus(formStatus, `Error: ${error.message}`, "error");
          return;
        }
        await saveProjectTech(inserted.id, techIds);
      } else {
        setStatus(formStatus, "Saving…", "pending");
        const { error } = await supabase.from("projects").update(values).eq("id", editingId);
        if (error) {
          setStatus(formStatus, `Error: ${error.message}`, "error");
          return;
        }
        await saveProjectTech(editingId, techIds);
      }
      renderProjectsEditor(container);
    } finally {
      saveBtn.disabled = false;
    }
  });

  container.querySelectorAll("[data-row]").forEach((tr) => {
    const id = tr.dataset.id;

    tr.querySelector('[data-action="edit"]').addEventListener("click", () => {
      enterEdit(projects.find((p) => String(p.id) === String(id)));
    });

    tr.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Delete this project?")) return;
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
      renderProjectsEditor(container);
    });
  });
}
