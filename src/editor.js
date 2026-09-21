import {addRow, fileStem, newBlock, newDocument, parse, validate} from "./fgs.js";
import {downloadPdf, render} from "./render.js";

let documentModel = newDocument();
const byId = (name) => document.getElementById(name);
const preview = byId("preview");
const sectionRoot = byId("sections");

function status(message, error = false) {
  byId("status").textContent = message;
  byId("status").classList.toggle("error", error);
}
function element(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.text !== undefined) node.textContent = options.text;
  if (options.className) node.className = options.className;
  return node;
}
function button(label, action, className = "secondary") {
  const node = element("button", {text:label,className});
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}
function field(label, value, update, options = {}) {
  const wrapper = element("label", {text:label});
  const input = element(options.multiline ? "textarea" : "input");
  if (options.type) input.type = options.type;
  if (options.max) input.maxLength = options.max;
  if (options.min !== undefined) input.min = options.min;
  if (options.high !== undefined) input.max = options.high;
  input.value = value;
  input.addEventListener(options.multiline ? "change" : "input", () => { update(input.value); refreshPreview(); });
  wrapper.append(input);
  return wrapper;
}
function check(label, value, update) {
  const wrapper = element("label", {text:label,className:"check-label"});
  const input = element("input");
  input.type = "checkbox"; input.checked = value;
  input.addEventListener("change", () => {update(input.checked);refreshPreview();});
  wrapper.prepend(input);
  return wrapper;
}
function lines(value) { return value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean); }
function blockEditor(block, row, rowIndex, blockIndex) {
  const card = element("div", {className:"block-card"});
  const header = element("div", {className:"block-title"});
  header.append(element("h3", {text:block.type.replace("_", " ")}));
  const actions = element("div", {className:"block-actions"});
  actions.append(button("Remove", () => {
    if (row.blocks.length === 1 && documentModel.rows.length === 1) return status("A sheet needs at least one section.", true);
    row.blocks.splice(blockIndex, 1);
    if (!row.blocks.length) documentModel.rows.splice(rowIndex, 1);
    refresh();
  }));
  header.append(actions);card.append(header);
  const fields = element("div", {className:"block-fields"});
  fields.append(field("Heading", block.title, (value) => {block.title=value;}, {max:160}));
  if (block.type === "header") fields.append(field("Subtitle", block.subtitle, (value) => {block.subtitle=value;}, {max:240}));
  if (block.type === "score_table") {
    fields.append(field("Players — one per line (1–12)", block.players.join("\n"), (value) => {block.players=lines(value);}, {multiline:true}));
    fields.append(field("Score rows — one per line (1–30)", block.score_rows.join("\n"), (value) => {block.score_rows=lines(value);}, {multiline:true}));
    fields.append(check("Include legacy summary row", block.show_total, (value) => {block.show_total=value;refreshSections();}));
    if (block.show_total) fields.append(field("Summary label", block.total_label, (value) => {block.total_label=value;}, {max:80}));
  }
  if (block.type === "reference" || block.type === "checklist") fields.append(field("Items — one per line (1–30)", block.items.join("\n"), (value) => {block.items=lines(value);}, {multiline:true}));
  if (block.type === "notes") fields.append(field("Writing lines (1–20)", block.lines, (value) => {block.lines=Number(value);}, {type:"number",min:1,high:20}));
  card.append(fields);
  return card;
}
function refreshSections() {
  sectionRoot.replaceChildren();
  documentModel.rows.forEach((row, index) => {
    const wrapper = element("div", {className:"section-row"});
    const toolbar = element("div", {className:"row-toolbar"});
    toolbar.append(element("strong", {text:`Row ${index + 1}`}));
    const actions = element("div", {className:"mini-actions"});
    if (index > 0) actions.append(button("↑", () => { [documentModel.rows[index-1],documentModel.rows[index]]=[documentModel.rows[index],documentModel.rows[index-1]];refresh(); }));
    if (index < documentModel.rows.length - 1) actions.append(button("↓", () => { [documentModel.rows[index+1],documentModel.rows[index]]=[documentModel.rows[index],documentModel.rows[index+1]];refresh(); }));
    if (row.blocks.length === 1) actions.append(button("Add beside", () => {row.blocks.push(newBlock(byId("block-type").value));refresh();}));
    toolbar.append(actions);wrapper.append(toolbar);
    row.blocks.forEach((block, blockIndex) => wrapper.append(blockEditor(block,row,index,blockIndex)));
    sectionRoot.append(wrapper);
  });
}
function refreshPreview() {
  try {
    const outcome = render(documentModel, preview);
    byId("fit").textContent = outcome.fits ? "Fits one page" : `Overflow: ${outcome.overflow}`;
    byId("fit").style.color = outcome.fits ? "#256642" : "#b2211e";
    status("");
  } catch (error) {
    byId("fit").textContent = "Invalid draft";
    status(error.message, true);
  }
}
function refresh() {
  byId("title").value = documentModel.title;
  byId("page-size").value = documentModel.page.size;
  byId("orientation").value = documentModel.page.orientation;
  byId("accent").value = documentModel.theme.accent;
  refreshSections(); refreshPreview();
}
function download(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

byId("title").addEventListener("input", (event) => {documentModel.title=event.target.value;refreshPreview();});
byId("page-size").addEventListener("change", (event) => {documentModel.page.size=event.target.value;refreshPreview();});
byId("orientation").addEventListener("change", (event) => {documentModel.page.orientation=event.target.value;refreshPreview();});
byId("accent").addEventListener("input", (event) => {documentModel.theme.accent=event.target.value;refreshPreview();});
byId("add").addEventListener("click", () => {
  if (documentModel.rows.length >= 30) return status("FGS v1 allows at most 30 rows.", true);
  addRow(documentModel, byId("block-type").value); refresh();
});
byId("new").addEventListener("click", () => {
  if (!confirm("Start a new sheet? Download your current FGS first if you want to keep it.")) return;
  documentModel = newDocument(); refresh();
});
byId("import").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 256 * 1024) throw new Error("FGS exceeds 256 KiB");
    const imported = parse(await file.text());
    documentModel = imported; refresh(); status(`Imported ${file.name}.`);
  } catch (error) {status(error.message, true);}
  event.target.value = "";
});
byId("export-fgs").addEventListener("click", () => {
  try {
    validate(documentModel);
    download(new Blob([JSON.stringify(documentModel,null,2)+"\n"],{type:"application/vnd.forge-gamesheets+json"}), `${fileStem(documentModel.title)}.fgs`);
    status("FGS downloaded. Keep this file to edit the sheet later.");
  } catch (error) {status(error.message, true);}
});
byId("export-pdf").addEventListener("click", async () => {
  try {
    const pdf = await downloadPdf(documentModel, preview);
    download(pdf, `${fileStem(documentModel.title)}.pdf`);
    status("PDF downloaded.");
  } catch (error) {status(error.message, true);}
});
refresh();
