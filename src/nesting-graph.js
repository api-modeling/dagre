import { addDummyNode, addBorderNode } from './util.js';

/** @typedef {import('@api-modeling/graphlib').Graph} Graph */
/** @typedef {import('@api-modeling/graphlib').NodeIdentifier} NodeIdentifier */
/** @typedef {import('./types').GraphLabel} GraphLabel */
/** @typedef {import('./types').NestedGraphNodeConfig} NestedGraphNodeConfig */
/** @typedef {import('./types').EdgeConfig} EdgeConfig */

/**
 * @param {Graph} g
 * @param {NodeIdentifier} root
 * @param {number} nodeSep
 * @param {number} weight
 * @param {number} height
 * @param {Record<NodeIdentifier, number>} depths
 * @param {NodeIdentifier} v
 */
function dfs(g, root, nodeSep, weight, height, depths, v) {
  const children = g.children(v);
  if (!children || !children.length) {
    if (v !== root) {
      g.setEdge(root, v, { weight: 0, minlen: nodeSep });
    }
    return;
  }

  const top = addBorderNode(g, "_bt");
  const bottom = addBorderNode(g, "_bb");
  const label = /** @type NestedGraphNodeConfig */ (g.node(v));

  g.setParent(top, v);
  label.borderTop = top;
  g.setParent(bottom, v);
  label.borderBottom = bottom;

  children.forEach((child) => {
    dfs(g, root, nodeSep, weight, height, depths, child);

    const childNode = g.node(child);
    const childTop = childNode.borderTop ? childNode.borderTop : child;
    const childBottom = childNode.borderBottom ? childNode.borderBottom : child;
    const thisWeight = childNode.borderTop ? weight : 2 * weight;
    const minlen = childTop !== childBottom ? 1 : height - depths[v] + 1;

    g.setEdge(top, childTop, {
      weight: thisWeight,
      minlen,
      nestingEdge: true
    });

    g.setEdge(childBottom, bottom, {
      weight: thisWeight,
      minlen,
      nestingEdge: true
    });
  });

  if (!g.parent(v)) {
    g.setEdge(root, top, { weight: 0, minlen: height + depths[v] });
  }
}

/**
 * @param {Graph} g
 * @return {Record<NodeIdentifier, number>} 
 */
function treeDepths(g) {
  const depths = /** @type Record<NodeIdentifier, number> */ ({});
  /**
   * @param {NodeIdentifier} v
   * @param {number} depth
   */
  function callback(v, depth) {
    const children = g.children(v);
    if (children && children.length) {
      children.forEach((child) => {
        callback(child, depth + 1);
      });
    }
    depths[v] = depth;
  }
  const children = g.children();
  if (children) {
    children.forEach(v => callback(v, 1));
  }
  return depths;
}

/**
 * @param {Graph} g
 * @returns {Number} 
 */
function sumWeights(g) {
  const initial = 0;
  const edges = g.edges();
  if (Array.isArray(edges)) {
    return edges.reduce((acc, e) => acc + g.edge(e).weight, initial);
  }
  return initial;
}

/**
 * A nesting graph creates dummy nodes for the tops and bottoms of subgraphs,
 * adds appropriate edges to ensure that all cluster nodes are placed between
 * these boundaries, and ensures that the graph is connected.
 *
 * In addition we ensure, through the use of the minlen property, that nodes
 * and subgraph border nodes to not end up on the same rank.
 *
 * Preconditions:
 *
 *    1. Input graph is a DAG
 *    2. Nodes in the input graph has a minlen attribute
 *
 * Postconditions:
 *
 *    1. Input graph is connected.
 *    2. Dummy nodes are added for the tops and bottoms of subgraphs.
 *    3. The minlen attribute for nodes is adjusted to ensure nodes do not
 *       get placed on the same rank as subgraph border nodes.
 *
 * The nesting graph idea comes from Sander, "Layout of Compound Directed
 * Graphs."
 * 
 * @param {Graph} g
 */
export function run(g) {
  const root = addDummyNode(g, "root", {}, "_root");
  const depths = treeDepths(g);
  let maxValue = Number.NEGATIVE_INFINITY;
  Object.values(depths).forEach((value) => {
    if (value > maxValue) {
      maxValue = value;
    }
  });
  const height = maxValue - 1;
  const nodeSep = 2 * height + 1;

  const graph = g.graph();
  graph.nestingRoot = root;

  // Multiply minlen by nodeSep to align nodes on non-border ranks.
  const edges = g.edges();
  if (edges) {
    edges.forEach((e) => {
      const edge = g.edge(e);
      edge.minlen *= nodeSep;
    });
  }
  
  // Calculate a weight that is sufficient to keep subgraphs vertically compact
  const weight = sumWeights(g) + 1;

  // Create border nodes and link them up
  const children = g.children();
  if (children) {
    children.forEach((child) => {
      dfs(g, root, nodeSep, weight, height, depths, child);
    });
  }

  // Save the multiplier for node layers for later removal of empty border
  // layers.
  graph.nodeRankFactor = nodeSep;
}

/**
 * @param {Graph} g
 */
export function cleanup(g) {
  const graphLabel = g.graph();
  g.removeNode(graphLabel.nestingRoot);
  delete graphLabel.nestingRoot;
  const edges = g.edges();
  if (Array.isArray(edges)) {
    edges.forEach((e) => {
      const edge = g.edge(e);
      if (edge.nestingEdge) {
        g.removeEdge(e);
      }
    });
  } 
}
