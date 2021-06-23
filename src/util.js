/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
import { Graph } from '@api-modeling/graphlib';

/** @typedef {import('@api-modeling/graphlib').NodeIdentifier} NodeIdentifier */
/** @typedef {import('./types').DummyNodeAttributes} DummyNodeAttributes */

let idCounter = 0;
/**
 * Reads the minimum rank in the graph.
 * @param {Graph} g
 * @returns {number}
 */
export function minRank(g) {
  const nodes = g.nodes();
  if (!nodes) {
    return undefined;
  }
  let value = Number.POSITIVE_INFINITY;
  nodes.forEach((v) => {
    const { rank } = g.node(v);
    if (typeof rank === 'number' && rank < value) {
      value = rank;
    }
  });
  return value;
}
/**
 * @param {string=} prefix
 * @return {string} 
 */
export function uniqueId(prefix='') {
  const id = ++idCounter;
  return `${prefix}${id}`;
}

/**
 * Adds a dummy node to the graph and return v.
 * @param {Graph<DummyNodeAttributes, any>} g
 * @param {string} type
 * @param {DummyNodeAttributes} attrs
 * @param {string} name
 * @returns {NodeIdentifier}
 */
export function addDummyNode(g, type, attrs, name) {
  let v;
  do {
    v = uniqueId(name);
  } while (g.hasNode(v));

  attrs.dummy = type;
  g.setNode(v, attrs);
  return v;
}

/**
 * Returns a new graph with only simple edges. Handles aggregation of data
 * associated with multi-edges.
 * @param {Graph} g
 * @returns {Graph}
 */
export function simplify(g) {
  const simplified = new Graph().setGraph(g.graph());
  const nodes = g.nodes();
  if (nodes) {
    nodes.forEach((v) => {
      simplified.setNode(v, g.node(v));
    });
  }
  const edges = g.edges();
  if (edges) {
    edges.forEach((e) => {
      const simpleLabel = simplified.edge(e.v, e.w) || { weight: 0, minlen: 1 };
      const label = g.edge(e);
      simplified.setEdge(e.v, e.w, {
        weight: simpleLabel.weight + label.weight,
        minlen: Math.max(simpleLabel.minlen, label.minlen)
      });
    });
  }
  return simplified;
}

/**
 * @param {Graph} g
 * @returns {Graph}
 */
export function asNonCompoundGraph(g) {
  const simplified = new Graph({ multigraph: g.isMultigraph() }).setGraph(g.graph());
  const nodes = g.nodes();
  if (nodes) {
    nodes.forEach((v) => {
      simplified.setNode(v, g.node(v));
    });
  }
  const edges = g.edges();
  if (edges) {
    edges.forEach((e) => {
      simplified.setEdge(e, g.edge(e));
    });
  }
  return simplified;
}

/**
 * @param {Graph} g
 * @returns {*}
 */
export function successorWeights(g) {
  const nodes = g.nodes();
  const weightMap = [];
  if (nodes) {
    nodes.forEach((v) => {
      const successors = {};
      const edges = g.outEdges(v);
      if (edges) {
        edges.forEach((e) => {
          successors[e.w] = (successors[e.w] || 0) + g.edge(e).weight;
        });
      }
      weightMap.push(successors);
    });
  }
  const result = {};
  nodes.forEach((id, index) => {
    result[id] = weightMap[index];
  });
  return result;
}

/**
 * @param {Graph} g
 * @returns {*}
 */
export function predecessorWeights(g) {
  const nodes = g.nodes();
  const weightMap = [];
  if (nodes) {
    nodes.forEach((v) => {
      const predecessors = {};
      const edges = g.inEdges(v);
      if (edges) {
        edges.forEach((e) => {
          predecessors[e.v] = (predecessors[e.v] || 0) + g.edge(e).weight;
        });
      }
      weightMap.push(predecessors);
    });
  }
  const result = {};
  nodes.forEach((id, index) => {
    result[id] = weightMap[index];
  });
  return result;
}

/**
 * Finds where a line starting at point ({x, y}) would intersect a rectangle
 * ({x, y, width, height}) if it were pointing at the rectangle's center.
 * 
 * @param {{x: number, y: number, width: number, height: number}} rect
 * @param {{x: number, y: number}} point
 * @returns {{x: number, y: number}}
 */
export function intersectRect(rect, point) {
  const { x, y } = rect;

  // Rectangle intersection algorithm from:
  // http://math.stackexchange.com/questions/108113/find-edge-between-two-boxes
  const dx = point.x - x;
  const dy = point.y - y;
  let w = rect.width / 2;
  let h = rect.height / 2;

  if (!dx && !dy) {
    throw new Error("Not possible to find intersection inside of the rectangle");
  }

  let sx; let sy;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    // Intersection is top or bottom of rect.
    if (dy < 0) {
      h = -h;
    }
    sx = h * dx / dy;
    sy = h;
  } else {
    // Intersection is left or right of rect.
    if (dx < 0) {
      w = -w;
    }
    sx = w;
    sy = w * dy / dx;
  }

  return { x: x + sx, y: y + sy };
}

/**
 * @param {Graph} g
 */
export function maxRank(g) {
  const nodes = g.nodes();
  let max = Number.NEGATIVE_INFINITY;
  if (nodes) {
    nodes.forEach((v) => {
      const { rank } = g.node(v);
      if (typeof rank !== 'undefined') {
        if (rank > max) {
          max = rank;
        }
      }
    });
  }
  return max;
}

/**
 * Given a DAG with each node assigned "rank" and "order" properties, this
 * function will produce a matrix with the ids of each node.
 * 
 * @param {Graph} g
 * @returns {NodeIdentifier[][]}
 */
export function buildLayerMatrix(g) {
  const maxRankValue = maxRank(g);
  const layering = new Array(maxRankValue + 1).fill(0).map(() => ([]));
  (g.nodes() || []).forEach((v) => {
    const node = g.node(v);
    const { rank } = node;
    if (typeof rank !== 'undefined') {
      layering[rank][node.order] = v;
    }
  });
  return layering;
}

/**
 * Adjusts the ranks for all nodes in the graph such that all nodes v have
 * rank(v) >= 0 and at least one node w has rank(w) = 0.
 * 
 * @param {Graph} g
 */
export function normalizeRanks(g) {
  const value = minRank(g);
  if (typeof value !== 'number') {
    return;
  }
  const nodes = g.nodes();
  nodes.forEach((v) => {
    const node = g.node(v);
    const hasRank = Object.prototype.hasOwnProperty.call(node, 'rank');
    if (hasRank) {
      node.rank -= value;
    }
  });
}

/**
 * @param {Graph} g
 */
export function removeEmptyRanks(g) {
  // Ranks may not start at 0, so we need to offset them
  const offset = minRank(g) || 0;
  const nodes = g.nodes();
  if (!nodes) {
    return;
  }
  const layers = [];
  nodes.forEach((v) => {
    const rank = g.node(v).rank - offset;
    if (!layers[rank]) {
      layers[rank] = [];
    }
    layers[rank].push(v);
  });
  let delta = 0;
  const { nodeRankFactor } = g.graph();
  layers.forEach((vs, i) => {
    if (typeof vs === 'undefined' && i % nodeRankFactor !== 0) {
      --delta;
    } else if (delta && Array.isArray(vs)) {
      vs.forEach((v) => {
        g.node(v).rank += delta;
      });
    }
  });
}

/**
 * @param {Graph} g
 * @param {any} prefix
 * @param {number=} rank
 * @param {number=} order
 * @returns {NodeIdentifier} 
 */
export function addBorderNode(g, prefix, rank, order) {
  const node = /** @type DummyNodeAttributes */ ({
    width: 0,
    height: 0
  });
  if (arguments.length >= 4) {
    node.rank = rank;
    node.order = order;
  }
  return addDummyNode(g, "border", node, prefix);
}

/**
 * Partition a collection into two groups: `lhs` and `rhs`. If the supplied
 * function returns true for an entry it goes into `lhs`. Otherwise it goes
 * into `rhs.
 * 
 * @template T
 * @param {T[]} collection
 * @param {(entry: T) => boolean} fn
 * @returns {{lhs: T[], rhs: T[]}}
 */
export function partition(collection, fn) {
  const result = { lhs: [], rhs: [] };
  if (Array.isArray(collection)) {
    collection.forEach((value) => {
      if (fn(value)) {
        result.lhs.push(value);
      } else {
        result.rhs.push(value);
      }
    });
  }
  return result;
}

/**
 * Returns a new function that wraps `fn` with a timer. The wrapper logs the
 * time it takes to execute the function.
 * 
 * @param {string} name The name of the timer
 * @param {Function} fn a function to call.
 */
export function time(name, fn) {
  const start = Date.now();
  try {
    return fn();
  } finally {
    // eslint-disable-next-line no-console
    console.log(`${name} time: ${Date.now() - start}ms`);
  }
}

/**
 * Dummy `time()` function.
 * 
 * @param {string} name The name of the timer
 * @param {Function} fn a function to call.
 */
export function notime(name, fn) {
  return fn();
}

/**
 * @param {number} start
 * @param {number=} end
 * @param {number=} step
 * @returns {number[]} 
 */
export function flatRange(start, end, step = 1) {
  if (typeof end !== 'number') {
    end = start;
    start = 0;
  }
  let len = Math.max(end - start, 0);
  let index = -1;
  /** @type number[] */
  const range = Array(len);
  while (len--) {
    range[++index] = start;
    start += step;
  }
  return range;
}
