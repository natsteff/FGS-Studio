import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {lineSelection,previewTargetAt} from "../src/preview-navigation.mjs";

const layout={fits:true,editTargets:[
  {blockId:"header",field:"title",x:36,y:40,width:540,height:30},
  {blockId:"score",field:"score_rows",lineIndex:0,x:36,y:150,width:70,height:19},
],blockBounds:[{id:"score",x:36,y:100,width:540,height:300}]};

test("preview clicks prefer exact field regions and fall back to a section",()=>{
  assert.deepEqual(previewTargetAt(layout,50,50),layout.editTargets[0]);
  assert.deepEqual(previewTargetAt(layout,50,160),layout.editTargets[1]);
  assert.deepEqual(previewTargetAt(layout,200,160),{blockId:"score",field:"title"});
  assert.equal(previewTargetAt(layout,10,10),null);
  assert.equal(previewTargetAt({...layout,fits:false},50,160),null);
});

test("a clicked score label selects the matching textarea line",()=>{
  assert.deepEqual(lineSelection("1\n2\n3",0),{start:0,end:1});
  assert.deepEqual(lineSelection("1\n12\n3",1),{start:2,end:4});
  assert.deepEqual(lineSelection("1\n2",99),{start:2,end:3});
});

test("Studio preview click activates field focus",()=>{
  const editor=readFileSync(new URL("../src/editor.js",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(editor,/previewTargetAt\(latestPreviewLayout,point.x,point.y\)/);
  assert.match(editor,/input\.setSelectionRange\(start,end\)/);
  assert.match(editor,/selectedId=target.blockId/);
  assert.match(html,/Click a heading, table label, or list item/);
});
