import test from "node:test";
import assert from "node:assert/strict";
import {createEditHistory} from "../src/history.js";

test("one typing session is one undo step and redo restores it", () => {
  const history = createEditHistory();
  const state = {document:{title:"A"},selectedId:"header"};
  history.begin(state);
  state.document.title = "AB";
  history.begin(state);
  state.document.title = "ABC";
  history.finish(state);
  assert.equal(history.canUndo, true);
  assert.equal(history.canRedo, false);
  const before = history.undo(state);
  assert.equal(before.document.title, "A");
  assert.equal(history.canRedo, true);
  assert.equal(history.redo(before).document.title, "ABC");
});

test("a new edit invalidates redo, but selection and no-op changes do not", () => {
  const history = createEditHistory();
  const initial = {document:{title:"A"},selectedId:"header"};
  const edited = {document:{title:"B"},selectedId:"header"};
  history.record(initial, edited);
  const restored = history.undo(edited);
  history.record(restored, restored);
  assert.equal(history.canRedo, true);
  history.record(restored, {document:{title:"C"},selectedId:"header"});
  assert.equal(history.canRedo, false);
  history.clear();
  assert.equal(history.canUndo, false);
  assert.equal(history.canRedo, false);
});

test("history is bounded and resets when another document opens", () => {
  const history = createEditHistory(2);
  for(let i=0;i<3;i++) history.record({document:{title:String(i)},selectedId:"a"},{document:{title:String(i+1)},selectedId:"a"});
  let state={document:{title:"3"},selectedId:"a"};
  state=history.undo(state);
  assert.equal(state.document.title,"2");
  state=history.undo(state);
  assert.equal(state.document.title,"1");
  assert.equal(history.undo(state),null);
  history.clear();
  assert.equal(history.undo({document:{title:"Another sheet"},selectedId:"b"}),null);
});
