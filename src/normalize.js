/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
import { addDummyNode } from './util.js';

/** @typedef {import('@api-modeling/graphlib').Graph} Graph */
/** @typedef {import('@api-modeling/graphlib').Edge} Edge */
/** @typedef {import('./types').DummyNodeAttributes} DummyNodeAttributes */
/** @typedef {import('./types').DummyEdge} DummyEdge */

/**
 * @param {Graph} g
 * @param {Edge} e
 */
function normalizeEdge(g, e) {
  let { v } = e;
  let vRank = /** @type number */ (g.node(v).rank);
  const { w, name } = e;
  const wRank = /** @type number */ (g.node(w).rank);
  const edgeLabel = g.edge(e);
  const { labelRank } = edgeLabel;

  if (wRank === vRank + 1) {
    return;
  }

  g.removeEdge(e);

  let dummy; 
  /** @type DummyNodeAttributes */
  let attrs; 
  let i;
  for (i = 0, ++vRank; vRank < wRank; ++i, ++vRank) {
    edgeLabel.points = [];
    attrs = {
      width: 0, 
      height: 0,
      edgeLabel, 
      edgeObj: e,
      rank: vRank,
      dummy: undefined,
      labelpos: undefined,
    };
    dummy = addDummyNode(g, "edge", attrs, "_d");
    if (vRank === labelRank) {
      attrs.width = edgeLabel.width;
      attrs.height = edgeLabel.height;
      attrs.dummy = "edge-label";
      attrs.labelpos = edgeLabel.labelpos;
    }
    g.setEdge(v, dummy, { weight: edgeLabel.weight }, name);
    if (i === 0) {
      g.graph().dummyChains.push(dummy);
    }
    v = dummy;
  }

  g.setEdge(v, w, { weight: edgeLabel.weight }, name);
}

/**
 * Breaks any long edges in the graph into short segments that span 1 layer
 * each. This operation is undoable with the denormalize function.
 *
 * Pre-conditions:
 *
 *    1. The input graph is a DAG.
 *    2. Each node in the graph has a "rank" property.
 *
 * Post-condition:
 *
 *    1. All edges in the graph have a length of 1.
 *    2. Dummy nodes are added where edges have been split into segments.
 *    3. The graph is augmented with a "dummyChains" attribute which contains
 *       the first dummy in each chain of dummy nodes produced.
 * @param {Graph} g
 */
export function run(g) {
  const graph = g.graph();
  graph.dummyChains = [];
  const edges = g.edges();
  if (edges) {
    edges.forEach((edge) => {
      normalizeEdge(g, edge);
    });
  }
}

/**
 * @param {Graph} g
 */
export function undo(g) {
  const graph = g.graph();
  const { dummyChains } = graph;
  if (!Array.isArray(dummyChains)) {
    return;
  }
  dummyChains.forEach((v) => {
    let node = g.node(v);
    const origLabel = node.edgeLabel;
    let w;
    g.setEdge(node.edgeObj, origLabel);
    while (node.dummy) {
      [w] = g.successors(v);
      g.removeNode(v);
      origLabel.points.push({ x: node.x, y: node.y });
      if (node.dummy === "edge-label") {
        origLabel.x = node.x;
        origLabel.y = node.y;
        origLabel.width = node.width;
        origLabel.height = node.height;
      }
      v = w;
      node = g.node(v);
    }
  });
}
