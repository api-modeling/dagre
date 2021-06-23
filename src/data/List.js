/* eslint-disable no-param-reassign */
function unlink(entry) {
  entry._prev._next = entry._next;
  entry._next._prev = entry._prev;
  delete entry._next;
  delete entry._prev;
}

function filterOutLinks(k, v) {
  if (k !== "_next" && k !== "_prev") {
    return v;
  }
  return undefined;
}

/*
 * Simple doubly linked list implementation derived from Cormen, et al.,
 * "Introduction to Algorithms".
 */
export class List {
  constructor() {
    const sentinel = {};
    sentinel._next = sentinel;
    sentinel._prev = sentinel;
    this._sentinel = sentinel;
  }

  dequeue() {
    const sentinel = this._sentinel;
    const entry = sentinel._prev;
    if (entry !== sentinel) {
      unlink(entry);
      return entry;
    }
    return undefined;
  }
  
  enqueue(entry) {
    const sentinel = this._sentinel;
    if (entry._prev && entry._next) {
      unlink(entry);
    }
    entry._next = sentinel._next;
    sentinel._next._prev = entry;
    sentinel._next = entry;
    entry._prev = sentinel;
  };
  
  toString() {
    const parts = [];
    const sentinel = this._sentinel;
    let curr = sentinel._prev;
    while (curr !== sentinel) {
      parts.push(JSON.stringify(curr, filterOutLinks));
      curr = curr._prev;
    }
    return `[${parts.join(", ")}]`;
  }
}
