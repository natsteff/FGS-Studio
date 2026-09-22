// Adapted from Forge GameSheets app/static/sheet-designer.js (AGPL-3.0-only).
// Keep the browser preview's markup and classes aligned with Forge's Designer.
import {validate} from "./fgs.js";

const escape = (value) => String(value).replace(/[&<>\"]/g, (character) => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[character]);
const calculationKind = (label) => {
  const normalized = String(label).trim().replace(/\s+/g, " ").toLowerCase();
  if (normalized === "grand total") return "grand-total";
  if (normalized === "total") return "total";
  return null;
};
const scoreLabels = (block) => block.show_total ? [...block.score_rows, block.total_label || "Total"] : block.score_rows;

function previewBlock(block) {
  if (block.type === "header") return `<section class="preview-header"><h2>${escape(block.title)}</h2><p>${escape(block.subtitle)}</p></section>`;
  if (block.type === "score_table") {
    const heads = block.players.map((player, index) => `<th>${escape(player || `Player ${index + 1}`)}</th>`).join("");
    const rows = scoreLabels(block).map((label) => {
      const kind = calculationKind(label);
      const marker = kind ? '<small class="preview-calculated">Calculated</small>' : "";
      return `<tr class="${kind || "score"}"><th>${escape(label)}${marker}</th>${block.players.map(() => "<td></td>").join("")}</tr>`;
    }).join("");
    return `<section><h3>${escape(block.title)}</h3><table><thead><tr><th>Category</th>${heads}</tr></thead><tbody>${rows}</tbody></table></section>`;
  }
  if (block.type === "notes") return `<section><h3>${escape(block.title)}</h3><div class="preview-note-lines">${Array.from({length: block.lines}, () => "<i></i>").join("")}</div></section>`;
  const items = block.items.map((item) => block.type === "checklist" ? `<li>□ ${escape(item)}</li>` : `<li>${escape(item)}</li>`).join("");
  return `<section><h3>${escape(block.title)}</h3><ul class="${block.type}">${items}</ul></section>`;
}

export function previewHtml(model) {
  validate(model);
  return model.rows.map((row) => `<div class="preview-row columns-${row.blocks.length}">${row.blocks.map(previewBlock).join("")}</div>`).join("");
}

export function renderForgePreview(model, page) {
  page.className = `sheet-preview page-${model.page.size} page-${model.page.orientation}`;
  page.innerHTML = previewHtml(model);
}
