import { supabase } from "../supabase-client.js";

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

function techChipsHtml(allTech, selectedIds) {
  return allTech
    .map(
      (t) => `
        <label class="admin-checkbox-chip">
          <input type="checkbox" value="${t.id}" data-tech-checkbox ${selectedIds.has(t.id) ? "checked" : ""} />
          ${t.name}
        </label>`
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
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><label class="admin-field-label">Slug (URL id, unique)</label><input data-f="slug" class="admin-input" value="${escapeHtml(p.slug)}" /></div>
      <div><label class="admin-field-label">Title</label><input data-f="title" class="admin-input" value="${escapeHtml(p.title)}" /></div>
      <div><label class="admin-field-label">Category</label><input data-f="category" class="admin-input" value="${escapeHtml(p.category)}" /></div>
      <div><label class="admin-field-label">Duration</label><input data-f="duration" class="admin-input" value="${escapeHtml(p.duration)}" /></div>
      <div><label class="admin-field-label">Role</label><input data-f="role" class="admin-input" value="${escapeHtml(p.role)}" /></div>
      <div><label class="admin-field-label">Sort order</label><input data-f="sort_order" type="number" class="admin-input" value="${p.sort_order ?? 0}" /></div>
    </div>
    <div class="mt-3"><label class="admin-field-label">Summary</label><textarea data-f="summary" class="admin-textarea">${escapeHtml(p.summary)}</textarea></div>
    <div class="mt-3"><label class="admin-field-label">Problem</label><textarea data-f="problem" class="admin-textarea">${escapeHtml(p.problem)}</textarea></div>
    <div class="mt-3"><label class="admin-field-label">Approach (one step per line)</label><textarea data-f="approach" data-type="lines" class="admin-textarea">${escapeHtml((p.approach || []).join("\n"))}</textarea></div>
    <div class="mt-3"><label class="admin-field-label">Role detail</label><textarea data-f="role_detail" class="admin-textarea">${escapeHtml(p.role_detail)}</textarea></div>
    <div class="mt-3"><label class="admin-field-label">Impact</label><textarea data-f="impact" class="admin-textarea">${escapeHtml(p.impact)}</textarea></div>
    <div class="mt-3">
      <label class="admin-field-label">Results — one per line, format: value|suffix|label</label>
      <textarea data-f="results" data-type="results" class="admin-textarea" placeholder="12|+|Form patterns unified">${escapeHtml(resultsToLines(p.results))}</textarea>
    </div>
    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><label class="admin-field-label">Live link</label><input data-f="links.live" class="admin-input" value="${escapeHtml(p.links?.live || "")}" /></div>
      <div><label class="admin-field-label">Repo link</label><input data-f="links.repo" class="admin-input" value="${escapeHtml(p.links?.repo || "")}" /></div>
    </div>
    <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><label class="admin-field-label">Home teaser blurb (shown only if featured)</label><textarea data-f="home_blurb" class="admin-textarea">${escapeHtml(p.home_blurb)}</textarea></div>
      <div class="flex items-end pb-2"><label class="flex items-center gap-2 text-sm"><input data-f="featured" data-type="boolean" type="checkbox" ${p.featured ? "checked" : ""} /> Featured on home page</label></div>
    </div>
    <div class="mt-3">
      <label class="admin-field-label">Technologies</label>
      <div class="flex flex-wrap gap-2">${techChipsHtml(allTech, selectedTechIds)}</div>
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

export async function renderProjectsEditor(container) {
  container.innerHTML = `<p class="text-sm text-[var(--color-text-muted)]">Loading…</p>`;

  const [{ data: projects, error: pErr }, { data: allTech, error: tErr }, { data: joins, error: jErr }] = await Promise.all([
    supabase.from("projects").select("*").order("sort_order"),
    supabase.from("technologies").select("*").order("name"),
    supabase.from("project_technologies").select("*"),
  ]);
  if (pErr || tErr || jErr) {
    container.innerHTML = `<p class="text-sm text-red-400">Failed to load projects: ${(pErr || tErr || jErr).message}</p>`;
    return;
  }

  const techByProject = new Map();
  for (const j of joins) {
    if (!techByProject.has(j.project_id)) techByProject.set(j.project_id, new Set());
    techByProject.get(j.project_id).add(j.technology_id);
  }

  container.innerHTML = `
    <h2 class="font-heading text-lg font-bold">Projects</h2>
    <p class="mt-1 text-sm text-[var(--color-text-muted)]">Case studies shown on the Projects page; check "Featured" to also surface one on the home page teaser grid.</p>

    <div class="mt-4 admin-row-card border-dashed">
      <p class="admin-field-label">Add new project</p>
      <div data-new-project-form>${projectFormHtml(null, allTech, new Set())}</div>
      <button type="button" data-action="create" class="btn btn-primary mt-4 !px-4 !py-2 text-xs">Add project</button>
      <p data-new-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
    </div>

    <p class="admin-field-label mt-8">Existing (${projects.length})</p>
    <div data-projects-list class="mt-3 space-y-6"></div>
  `;

  const list = container.querySelector("[data-projects-list]");
  list.innerHTML = projects
    .map(
      (p) => `
        <div class="admin-row-card" data-project-form data-id="${p.id}">
          ${projectFormHtml(p, allTech, techByProject.get(p.id) || new Set())}
          <div class="mt-4 flex justify-end gap-2">
            <button type="button" data-action="save" class="btn btn-secondary !px-4 !py-2 text-xs">Save</button>
            <button type="button" data-action="delete" class="btn btn-secondary !px-4 !py-2 text-xs !border-red-500/50 hover:!border-red-500">Delete</button>
          </div>
          <p data-row-status class="mt-2 min-h-[1rem] text-xs text-[var(--color-text-muted)]"></p>
        </div>
      `
    )
    .join("");

  list.querySelectorAll("[data-project-form]").forEach((form) => {
    const id = form.dataset.id;
    const statusEl = form.querySelector("[data-row-status]");
    form.querySelector('[data-action="save"]').addEventListener("click", async () => {
      const { values, techIds } = readProjectForm(form);
      statusEl.textContent = "Saving…";
      const { error } = await supabase.from("projects").update(values).eq("id", id);
      if (error) {
        statusEl.textContent = `Error: ${error.message}`;
        return;
      }
      await saveProjectTech(id, techIds);
      statusEl.textContent = "Saved.";
    });
    form.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Delete this project?")) return;
      statusEl.textContent = "Deleting…";
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        statusEl.textContent = `Error: ${error.message}`;
        return;
      }
      renderProjectsEditor(container);
    });
  });

  const newForm = container.querySelector("[data-new-project-form]");
  const newStatus = container.querySelector("[data-new-status]");
  container.querySelector('[data-action="create"]').addEventListener("click", async () => {
    const { values, techIds } = readProjectForm(newForm);
    newStatus.textContent = "Creating…";
    const { data: inserted, error } = await supabase.from("projects").insert(values).select().single();
    if (error) {
      newStatus.textContent = `Error: ${error.message}`;
      return;
    }
    await saveProjectTech(inserted.id, techIds);
    renderProjectsEditor(container);
  });
}
