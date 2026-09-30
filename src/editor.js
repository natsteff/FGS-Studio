import {addRow, fileStem, newBlock, newDocument, parse, validate, verifyLogoImages} from "./fgs.js?v=15";
import {createEditHistory} from "./history.js";
import {loadPrintEngine, prepareHeaderLogo,contentControls,validateFill,applyPaperTemplate} from "../vendor/fgs-renderer/browser.mjs?profile=fgs-page-1.3&layout=6";

let documentModel = newDocument();
let selectedId = documentModel.rows[0].blocks[0].id;
const byId = (name) => document.getElementById(name);
const preview = byId("preview");
const sectionRoot = byId("sections");
const printEngine = loadPrintEngine(new URL("../vendor/fgs-renderer/", import.meta.url));
let previewRevision = 0;
let printPlanRevision = 0;
function printSizeSelection() {
  const selection={preset:byId("print-size").value};
  if(selection.preset==="custom")Object.assign(selection,{width:byId("custom-width").value,height:byId("custom-height").value,unit:byId("custom-unit").value});
  return selection;
}
function syncCustomBounds(){const cm=byId("custom-unit").value==="cm";for(const id of ["custom-width","custom-height"]){byId(id).min=cm?"1.27":"0.5";byId(id).max=cm?"35.56":"14";}}
function printSheetOptions(){return {paper:byId("print-paper").value,copies:Number(byId("print-copies").value),cutGuides:byId("cut-guides").checked,borderless:byId("borderless").checked};}
async function updatePrintPlan(){
  const revision=++printPlanRevision;
  const eligible=byId("print-size").value==="half"&&byId("print-paper").value===documentModel.page.size;
  byId("borderless").disabled=!eligible;
  if(!eligible)byId("borderless").checked=false;
  try {
    const engine=await printEngine;
    const layout=engine.layout(documentModel,printSizeSelection());
    if(!layout.fits)throw new Error(layout.reason || `“${layout.overflow}” does not fit at the selected print size.`);
    const plan=engine.printSheetPlan(layout,printSheetOptions());
    if(revision!==printPlanRevision)return;
    const counts=plan.pages.map(page=>page.length).join(" + ");
    byId("print-plan").textContent=`Output: ${plan.paper.toUpperCase()} ${plan.orientation} PDF; ${plan.capacity} ${plan.capacity===1?"copy":"copies"} per page. ${plan.pages.length} ${plan.pages.length===1?"page":"pages"} (${counts}). Preview shows page 1. ${plan.borderless?"Edge-to-edge printing required.":"0.5-inch printable margin, including cut guides."}`;
    byId("print-sheet-preview").innerHTML=engine.toPrintSheetSvg(layout,printSheetOptions());
  }catch(error){if(revision===printPlanRevision){byId("print-plan").textContent=error.message;byId("print-sheet-preview").innerHTML="";}}
}
function updatePrintControls(){
  const preset=byId("print-size").value,compact=preset!=="full";
  const pdf=byId("export-pdf"),printSheet=byId("export-print-sheet");
  pdf.classList.toggle("secondary",compact);
  printSheet.classList.toggle("secondary",!compact);
  if(compact)pdf.parentElement.insertBefore(printSheet,pdf);
  else pdf.parentElement.insertBefore(pdf,printSheet);
  byId("custom-size").hidden=preset!=="custom";
  printSheet.disabled=!compact;
  printSheet.title=compact?"":"Full Page already occupies the printer sheet; use Download PDF.";
  refreshPreview();
}
function resetPrintSize(){byId("print-size").value="full";updatePrintControls();}
const history = createEditHistory();
const snapshot = () => ({document: documentModel, selectedId});
function historyButtons() {
  byId("undo").disabled = !history.canUndo;
  byId("redo").disabled = !history.canRedo;
}
function edit(change) {
  history.finish(snapshot());
  const before = structuredClone(snapshot());
  try {change();validateFill(documentModel);} catch(error){documentModel=before.document;selectedId=before.selectedId;refresh();status(error.message,true);return;}
  history.record(before, snapshot());
  historyButtons();
}
function focusedEdit(input, eventName, change) {
  const apply = () => {
    history.begin(snapshot());
    change(input);
    refreshPreview();
    historyButtons();
  };
  input.addEventListener(eventName, apply);
  input.addEventListener("change", () => {
    if (eventName !== "change") apply();
    history.finish(snapshot());
    historyButtons();
  });
  input.addEventListener("blur", () => {
    history.finish(snapshot());
    historyButtons();
  });
}
function restore(state) {
  if (!state) return;
  documentModel = state.document;
  selectedId = state.selectedId;
  refresh();
}

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
  focusedEdit(input, options.multiline ? "change" : "input", () => update(input.value));
  wrapper.append(input);
  return wrapper;
}
function check(label, value, update) {
  const wrapper = element("label", {text:label,className:"check-label"});
  const input = element("input");
  input.type = "checkbox"; input.checked = value;
  input.addEventListener("change", () => {edit(() => update(input.checked));refreshPreview();});
  wrapper.prepend(input);
  return wrapper;
}
function lines(value) { return value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean); }
function blockEditor(block, row, rowIndex, blockIndex) {
  const card = element("div", {className:"block-card"});
  const fields = element("div", {className:"block-fields"});
  fields.append(field(block.type === "score_table" ? "Score table title" : "Heading", block.title, (value) => {block.title=value;refreshSections();}, {max:160}));
  if (block.type === "score_table") fields.append(field("First column heading", block.first_column_heading ?? "Category", (value) => {
    const heading = value.trim() || "Category";
    if (heading === "Category") delete block.first_column_heading;
    else {if(documentModel.format_version!=="1.3")documentModel.format_version="1.2";block.first_column_heading=heading;}
  }, {max:80}));
  if (block.type === "header") {
    fields.append(field("Subtitle", block.subtitle, (value) => {block.subtitle=value;}, {max:240}));
    const upload = element("input");
    upload.type="file";upload.accept="image/png,image/jpeg";upload.hidden=true;
    const uploadControl=element("div",{className:"logo-upload"});
    uploadControl.append(element("span",{text:"Header logo (PNG or JPEG)"}));
    uploadControl.append(button("Choose logo",()=>upload.click(),"secondary"));
    uploadControl.append(upload);
    uploadControl.append(element("small",{text:block.logo?"Current logo attached":"No logo selected"}));
    fields.append(uploadControl);
    fields.append(field("Logo description (blank if decorative)",block.logo?.alt||"",(value)=>{
      if (block.logo) {block.logo.alt=value.trim();block.logo.decorative=!block.logo.alt;}
    },{max:120}));
    upload.addEventListener("change",async()=>{
      if (!upload.files[0]) return;
      try {
        const alt=fields.querySelector('input[maxlength="120"]').value.trim();
        const logo=await prepareHeaderLogo(upload.files[0],alt,!alt);
        edit(()=>{if(documentModel.format_version==="1.0") documentModel.format_version="1.1";documentModel.rows.flatMap((row)=>row.blocks).forEach((item)=>{if(item.id!==block.id) delete item.logo;});block.logo=logo;});
        refreshProperties();refreshPreview();
      } catch(error) {status(error.message,true);}
    });
    if (block.logo) fields.append(button("Remove logo",()=>{edit(()=>{delete block.logo;});refreshProperties();refreshPreview();}));
  }
  if (block.type === "score_table") {
    fields.append(field("Players — one per line (1–12)", block.players.join("\n"), (value) => {block.players=lines(value);}, {multiline:true}));
    fields.append(field("Score rows — one per line (1–30)", block.score_rows.join("\n"), (value) => {block.score_rows=lines(value);}, {multiline:true}));
    fields.append(check("Include legacy summary row", block.show_total, (value) => {block.show_total=value;refreshProperties();}));
    if (block.show_total) fields.append(field("Summary label", block.total_label, (value) => {block.total_label=value;}, {max:80}));
  }
  if (block.type === "reference" || block.type === "checklist") fields.append(field("Items — one per line (1–30)", block.items.join("\n"), (value) => {block.items=lines(value);}, {multiline:true}));
  if (block.type === "notes") fields.append(field("Writing lines (1–20)", block.lines, (value) => {block.lines=Number(value);}, {type:"number",min:1,high:20}));
  if(["tracker","paper_pattern"].includes(block.type))fields.append(contentControls(block,{canFill:row.blocks.length===1&&rowIndex===documentModel.rows.length-1,change:next=>edit(()=>{row.blocks[row.blocks.indexOf(block)]=next;refresh();}),onError:error=>status(error,true)}));
  card.append(fields);
  return card;
}
function refreshSections() {
  sectionRoot.replaceChildren();
  documentModel.rows.forEach((row, index) => {
    row.blocks.forEach((block) => {
      const item = element("div", {className:`structure-item${selectedId === block.id ? " is-selected" : ""}`});
      const select = button(`⠿  ${block.title || block.type.replace("_", " ")}`, () => {selectedId=block.id;refreshSections();refreshProperties();}, "section-select");
      select.setAttribute("aria-pressed", selectedId === block.id);
      item.append(select);
      const actions = element("div", {className:"mini-actions"});
      if (index > 0) actions.append(button("↑", () => edit(() => { [documentModel.rows[index-1],documentModel.rows[index]]=[documentModel.rows[index],documentModel.rows[index-1]];refresh(); }), "secondary"));
      if (index < documentModel.rows.length - 1) actions.append(button("↓", () => edit(() => { [documentModel.rows[index+1],documentModel.rows[index]]=[documentModel.rows[index],documentModel.rows[index+1]];refresh(); }), "secondary"));
      item.append(actions);sectionRoot.append(item);
    });
  });
}
function refreshProperties() {
  const properties = byId("properties");
  properties.replaceChildren();
  for (const [rowIndex, row] of documentModel.rows.entries()) {
    const blockIndex = row.blocks.findIndex((block) => block.id === selectedId);
    if (blockIndex < 0) continue;
    const block = row.blocks[blockIndex];
    byId("properties-title").textContent = block.type.replace("_", " ");
    properties.append(blockEditor(block, row, rowIndex, blockIndex));
    const actions = element("div", {className:"property-actions"});
    actions.append(button("Duplicate", () => edit(() => {
      if (documentModel.rows.length >= 30) return status("FGS v1 allows at most 30 rows.", true);
      const copy = structuredClone(block);
      copy.id = `block-${crypto.randomUUID()}`;
      delete copy.logo;
      documentModel.rows.splice(rowIndex + 1, 0, {id:`row-${crypto.randomUUID()}`,blocks:[copy]});
      selectedId = copy.id;refresh();
    }), "secondary"));
    if (row.blocks.length === 1 && rowIndex < documentModel.rows.length - 1 && documentModel.rows[rowIndex + 1].blocks.length === 1) {
      actions.append(button("Pair with next", () => edit(() => {
        row.blocks.push(documentModel.rows[rowIndex + 1].blocks[0]);
        documentModel.rows.splice(rowIndex + 1, 1);refresh();
      }), "secondary"));
    }
    if (row.blocks.length === 2) actions.append(button("Use full width", () => edit(() => {
      const second = row.blocks.pop();
      documentModel.rows.splice(rowIndex + 1, 0, {id:`row-${crypto.randomUUID()}`,blocks:[second]});
      refresh();
    }), "secondary"));
    if (documentModel.rows.length > 1 || row.blocks.length > 1) actions.append(button("Delete", () => edit(() => {
      row.blocks.splice(blockIndex, 1);
      if (!row.blocks.length) documentModel.rows.splice(rowIndex, 1);
      selectedId = documentModel.rows[Math.min(rowIndex, documentModel.rows.length - 1)].blocks[0].id;
      refresh();
    }), "secondary danger"));
    properties.append(actions);
    if (documentModel.rows.length === 1 && row.blocks.length === 1) {
      const notice = element("div", {className:"section-notice"});
      notice.setAttribute("role", "note");
      notice.append(element("strong", {text:"Section cannot be deleted"}), element("span", {text:"This is the only section. Add another section before deleting it."}));
      properties.append(notice);
    }
    return;
  }
  byId("properties-title").textContent = "Section";
  properties.append(element("p", {text:"Select a section to edit it."}));
}
async function refreshPreview() {
  const revision = ++previewRevision;
  try {
    validate(documentModel);
    const engine = await printEngine;
    const layout = engine.layout(documentModel,printSizeSelection());
    if (revision !== previewRevision) return;
    preview.innerHTML = engine.toSvg(layout);
    preview.style.width=layout.fitScale===undefined?"":`${Math.round(layout.width*96/72)}px`;
    if(layout.fits&&layout.fitScale!==undefined){
      const measured=documentModel.rows.some(row=>row.blocks.some(block=>block.type==="paper_pattern"||block.type==="tracker"));
      byId("fit").textContent=`Fitted at ${Math.round(layout.fitScale*100)}%; body text approximately ${layout.effectiveBodySize.toFixed(1)} pt. Review at finished size.${measured&&layout.fitScale<1?" Pattern spacing and tracker marks also shrink physically.":""}`;
    }else byId("fit").textContent = layout.fits ? "Fits selected size" : (layout.reason || `“${layout.overflow}” does not fit at the selected print size`);
    byId("fit").style.color = layout.fits ? "#645f55" : "#b2211e";
    status("");
  } catch (error) {
    if (revision !== previewRevision) return;
    byId("fit").textContent = error.message;
    status(error.message, true);
  }
}
function refresh() {
  byId("title").value = documentModel.title;
  byId("page-size").value = documentModel.page.size;
  byId("orientation").value = documentModel.page.orientation;
  byId("accent").value = documentModel.theme.accent;
  byId("footer").value = documentModel.footer || "";
  byId("designer-notes").value = documentModel.designer_notes || "";
  historyButtons();
  refreshSections(); refreshProperties(); refreshPreview();
}
function download(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}

focusedEdit(byId("title"), "input", (input) => {documentModel.title=input.value;});
byId("page-size").addEventListener("change", (event) => {edit(() => {documentModel.page.size=event.target.value;});refreshPreview();});
byId("orientation").addEventListener("change", (event) => {edit(() => {documentModel.page.orientation=event.target.value;});refreshPreview();});
byId("print-size").addEventListener("change",updatePrintControls);
["custom-width","custom-height","custom-unit"].forEach(id=>byId(id).addEventListener("change",()=>{syncCustomBounds();refreshPreview();}));
syncCustomBounds();
byId("export-print-sheet").disabled=true;
focusedEdit(byId("accent"), "input", (input) => {documentModel.theme.accent=input.value;});
focusedEdit(byId("footer"), "change", (input) => {
  const footer = input.value.trim();
  if (footer) {if(documentModel.format_version==="1.0") documentModel.format_version="1.1";documentModel.footer=footer;}
  else delete documentModel.footer;
});
focusedEdit(byId("designer-notes"), "input", (input) => {
  if (input.value) {if(documentModel.format_version!=="1.3")documentModel.format_version="1.2";documentModel.designer_notes=input.value;}
  else delete documentModel.designer_notes;
});
byId("undo").addEventListener("click", () => restore(history.undo(snapshot())));
byId("redo").addEventListener("click", () => restore(history.redo(snapshot())));
byId("add").addEventListener("click", () => {
  if (documentModel.rows.length >= 30) return status("FGS v1 allows at most 30 rows.", true);
  edit(() => {addRow(documentModel, byId("block-type").value); selectedId=documentModel.rows.at(-1).blocks[0].id;refresh();});
});
byId("new").addEventListener("click", () => {
  byId("new-template").value = "score_sheet";
  byId("new-dialog").showModal();
});
byId("cancel-new").addEventListener("click",()=>byId("new-dialog").close());
byId("new-form").addEventListener("submit",event=>{
  event.preventDefault();
  if(!confirm("Start a new sheet? Download your current FGS first if you want to keep it."))return;
  documentModel=applyPaperTemplate(newDocument(),byId("new-template").value,prefix=>prefix+"-"+crypto.randomUUID());
  resetPrintSize();
  selectedId=documentModel.rows[0].blocks[0].id;history.clear();refresh();byId("new-dialog").close();
});
byId("import").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 256 * 1024) throw new Error("FGS exceeds 256 KiB");
    const imported = parse(await file.text());
    await verifyLogoImages(imported);
    documentModel = imported; selectedId=imported.rows[0].blocks[0].id;history.clear();resetPrintSize();refresh(); status(`Imported ${file.name}.`);
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
    validate(documentModel);
    const engine = await printEngine;
    const layout = engine.layout(documentModel,printSizeSelection());
    if(!layout.fits)throw new Error(layout.reason || `“${layout.overflow}” does not fit at the selected print size.`);
    const pdf = await engine.toPdf(layout, documentModel.title);
    download(new Blob([pdf], {type:"application/pdf"}), `${fileStem(documentModel.title)}.pdf`);
    status("PDF downloaded.");
  } catch (error) {status(error.message, true);}
});
byId("export-print-sheet").addEventListener("click",()=>{
  byId("print-paper").value=documentModel.page.size;
  byId("borderless").checked=false;
  byId("print-sheet-dialog").showModal();
  updatePrintPlan();
});
for(const id of ["print-paper","print-copies","cut-guides","borderless"])byId(id).addEventListener("change",updatePrintPlan);
byId("print-copies").addEventListener("input",updatePrintPlan);
byId("cancel-print-sheet").addEventListener("click",()=>byId("print-sheet-dialog").close());
byId("print-sheet-form").addEventListener("submit",async(event)=>{
  event.preventDefault();
  try {
    validate(documentModel);
    const engine=await printEngine;
    const layout=engine.layout(documentModel,printSizeSelection());
    if(!layout.fits)throw new Error(layout.reason || `“${layout.overflow}” does not fit at the selected print size.`);
    const pdf=await engine.toPrintSheetPdf(layout,documentModel.title,printSheetOptions());
    download(new Blob([pdf],{type:"application/pdf"}),`${fileStem(documentModel.title)}-print-sheet.pdf`);
    byId("print-sheet-dialog").close();
    status("Print-sheet PDF downloaded.");
  }catch(error){status(error.message,true);}
});
refresh();
