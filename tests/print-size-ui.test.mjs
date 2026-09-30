import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const editor=readFileSync(new URL("../src/editor.js",import.meta.url),"utf8");

test("Studio offers finished print sizes and a separate copy-layout step",()=>{
  for(const choice of ["full","half","poker","bridge","custom"])
    assert.match(html,new RegExp(`<option value="${choice}">`));
  assert.match(html,/id="print-sheet-dialog"/);
  assert.match(html,/<button id="export-print-sheet"[^>]*>Create print sheet<\/button>/);
  assert.match(html,/id="export-print-sheet"[^>]*hidden/);
  assert.match(html,/<h2>Create print sheet<\/h2>/);
  assert.match(html,/id="print-copies"[^>]*value="1"/);
  assert.match(html,/id="print-note-full"/);
  assert.match(html,/id="print-note-compact" hidden/);
  assert.doesNotMatch(html,/Create print sheet…/);
  assert.match(editor,/printSheet\.classList\.toggle\("secondary",!compact\)/);
  assert.match(editor,/insertBefore\(printSheet,pdf\)/);
  assert.match(editor,/printSheet\.hidden=!compact/);
  assert.match(editor,/byId\("print-note-full"\)\.hidden=compact/);
  assert.match(editor,/byId\("print-note-compact"\)\.hidden=!compact/);
  assert.match(editor,/byId\("print-copies"\)\.value="1"/);
  assert.match(editor,/byId\("print-copies"\)\.value=byId\("borderless"\)\.checked\?"2":"1"/);
  assert.match(editor,/copiesManuallyEdited=true/);
  assert.match(html,/id="print-plan"/);
  assert.match(html,/Actual size \/ 100%/);
  assert.match(html,/id="borderless"/);
  assert.match(html,/not saved in \.fgs/);
  assert.match(editor,/engine\.layout\(documentModel,printSizeSelection\(\)\)/);
  assert.match(editor,/engine\.toPrintSheetPdf\(layout,documentModel\.title,printSheetOptions\(\)\)/);
  assert.match(editor,/resetPrintSize\(\)/);
});
