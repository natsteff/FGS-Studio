// Browser-tab-only edit history. Call begin/finish around a focused input
// session so typing is one undo step, and record for discrete actions.
export function createEditHistory(limit = 50) {
  const past = [];
  const future = [];
  let pending = null;
  const copy = (state) => structuredClone(state);
  const changed = (before, after) => JSON.stringify(before) !== JSON.stringify(after);
  const push = (before, after) => {
    if (!changed(before, after)) return;
    past.push(before);
    if (past.length > limit) past.shift();
    future.length = 0;
  };
  return {
    get canUndo() { return past.length > 0 || pending !== null; },
    get canRedo() { return future.length > 0; },
    begin(state) { if (pending === null) pending = copy(state); },
    finish(state) {
      if (pending === null) return;
      push(pending, state);
      pending = null;
    },
    record(before, after) { push(copy(before), after); },
    undo(state) {
      this.finish(state);
      if (!past.length) return null;
      future.push(copy(state));
      return past.pop();
    },
    redo(state) {
      this.finish(state);
      if (!future.length) return null;
      past.push(copy(state));
      if (past.length > limit) past.shift();
      return future.pop();
    },
    clear() { past.length = 0; future.length = 0; pending = null; },
  };
}
