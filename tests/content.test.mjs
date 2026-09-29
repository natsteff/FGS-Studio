import test from "node:test";
import assert from "node:assert/strict";
import {newDocument,addRow,parse,validate} from "../src/fgs.js";
import {applyPaperTemplate,PATTERNS} from "../vendor/fgs-renderer/browser.mjs";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

test("New always starts at Score sheet after choosing or canceling another template",()=>{
  const script=readFileSync(new URL("../src/editor.js",import.meta.url),"utf8");
  const handler=script.split('byId("new").addEventListener("click", () => {')[1].split('\n});')[0];
  const controls={"new-template":{value:"music_staff"},"new-dialog":{showModal(){assert.equal(controls["new-template"].value,"score_sheet");}}};
  const context={byId:id=>controls[id]};
  for(const previous of ["music_staff","hex_grid","score_sheet"]){controls["new-template"].value=previous;runInNewContext(handler,context);assert.equal(controls["new-template"].value,"score_sheet");}
});

test("last section deletion has an explanation independent of paper sizing",()=>{
  const script=readFileSync(new URL("../src/editor.js",import.meta.url),"utf8");
  assert.ok(script.includes('if (documentModel.rows.length === 1 && row.blocks.length === 1) {'));
  assert.ok(script.includes('className:"section-notice"'));
  assert.ok(script.includes('notice.setAttribute("role", "note")'));
  assert.ok(script.includes("This is the only section. Add another section before deleting it."));
  const d=newDocument();d.rows=[];assert.throws(()=>validate(d));
});

test("new content promotes to 1.3 and survives JSON round trip",()=>{
  const d=newDocument();addRow(d,"tracker");addRow(d,"paper_pattern");
  assert.equal(d.format_version,"1.3");assert.deepEqual(parse(JSON.stringify(d)),d);
  d.rows.at(-1).blocks[0].sizing={mode:"fill_remaining"};validate(d);
  addRow(d,"notes");assert.throws(()=>validate(d),/last full-width/);
});
test("paper starters use one full-page block and preserve document metadata",()=>{
  for(const pattern of [...Object.keys(PATTERNS),"piano"]){const d=newDocument();d.designer_notes="Keep for later";let index=0;applyPaperTemplate(d,pattern,()=>"id"+index++);validate(d);assert.deepEqual(parse(JSON.stringify(d)),d);assert.equal(d.rows.length,1);assert.equal(d.rows[0].blocks.length,1);assert.equal(d.designer_notes,"Keep for later");assert.equal(d.format_version,"1.3");}
});
test("old readers cannot accept new blocks and play data is not accepted",()=>{
  const d=newDocument();addRow(d,"tracker");d.format_version="1.2";assert.throws(()=>validate(d));
  d.format_version="1.3";d.rows.at(-1).blocks[0].value=3;assert.throws(()=>validate(d),/unknown/i);
});
