/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
import { Graph } from '@api-modeling/graphlib';
import * as acyclic from "./acyclic.js";
import * as normalize from "./normalize.js";
import rank from "./rank/index.js";
import { normalizeRanks, removeEmptyRanks, asNonCompoundGraph, addDummyNode, intersectRect, buildLayerMatrix, time } from "./util.js";
import parentDummyChains from "./parent-dummy-chains.js";
import * as nestingGraph from "./nesting-graph.js";
import addBorderSegments from "./add-border-segments.js";
import * as coordinateSystem from "./coordinate-system.js";
import order from "./order/index.js";
import position from "./position/index.js";

/** @typedef {import('./types').LayoutOptions} LayoutOptions */

/**
 * This idea comes from the Gansner paper: to account for edge labels in our
 * layout we split each rank in half by doubling minlen and halving ranksep.
 * Then we can place labels at these mid-points between nodes.
 *
 * We also add some minimal padding to the width to push the label for the edge
 * away from the edge itself a bit.
 * 
 * @param {Graph} g
 */
function makeSpaceForEdgeLabels(g) {
  const graph = g.graph();
  graph.ranksep /= 2;
  (g.edges() || []).forEach((e) => {
    const edge = g.edge(e);
    edge.minlen *= 2;
    if (edge.labelpos.toLowerCase() !== "c") {
      if (graph.rankdir === "TB" || graph.rankdir === "BT") {
        edge.width += edge.labeloffset;
      } else {
        edge.height += edge.labeloffset;
      }
    }
  });
}

/**
 * @param {Graph} g
 */
function removeSelfEdges(g) {
  (g.edges() || []).forEach((e) => {
    if (e.v === e.w) {
      const node = g.node(e.v);
      if (!node.selfEdges) {
        node.selfEdges = [];
      }
      node.selfEdges.push({ e, label: g.edge(e) });
      g.removeEdge(e);
    }
  });
}

/**
 * Creates temporary dummy nodes that capture the rank in which each edge's
 * label is going to, if it has one of non-zero width and height. We do this
 * so that we can safely remove empty ranks while preserving balance for the
 * label's position.
 * @param {Graph} g
 */
function injectEdgeLabelProxies(g) {
  (g.edges() || []).forEach((e) => {
    const edge = g.edge(e);
    if (edge.width && edge.height) {
      const v = g.node(e.v);
      const w = g.node(e.w);
      const label = { rank: (w.rank - v.rank) / 2 + v.rank, e };
      addDummyNode(g, "edge-proxy", label, "_ep");
    }
  });
}

/**
 * @param {Graph} g
 */
function assignRankMinMax(g) {
  let maxRank = 0;
  (g.nodes() || []).forEach((v) => {
    const node = g.node(v);
    if (node.borderTop) {
      node.minRank = g.node(node.borderTop).rank || 0;
      node.maxRank = g.node(node.borderBottom).rank || 0;
      maxRank = Math.max(maxRank, node.maxRank);
    }
  });
  g.graph().maxRank = maxRank;
}

/**
 * @param {Graph} g
 */
function removeEdgeLabelProxies(g) {
  (g.nodes() || []).forEach((v) => {
    const node = g.node(v);
    if (node.dummy === "edge-proxy") {
      g.edge(node.e).labelRank = node.rank;
      g.removeNode(v);
    }
  });
}

/**
 * @param {Graph} g
 */
function insertSelfEdges(g) {
  const layers = buildLayerMatrix(g);
  layers.forEach((layer) => {
    let orderShift = 0;
    layer.forEach((v, i) => {
      const node = g.node(v);
      node.order = i + orderShift;
      (node.selfEdges || []).forEach((selfEdge) => {
        addDummyNode(g, "selfedge", {
          width: selfEdge.label.width,
          height: selfEdge.label.height,
          rank: node.rank,
          order: i + (++orderShift),
          e: selfEdge.e,
          label: selfEdge.label,
        }, "_se");
      });
      delete node.selfEdges;
    });
  });
}

/**
 * @param {Graph} g
 */
function positionSelfEdges(g) {
  (g.nodes() || []).forEach((v) => {
    const node = g.node(v);
    if (node.dummy === "selfedge") {
      const selfNode = g.node(node.e.v);
      const x = selfNode.x + selfNode.width / 2;
      const {y} = selfNode;
      const dx = node.x - x;
      const dy = selfNode.height / 2;
      g.setEdge(node.e, node.label);
      g.removeNode(v);
      node.label.points = [
        { x: x + 2 * dx / 3, y: y - dy },
        { x: x + 5 * dx / 6, y: y - dy },
        { x: x +     dx    , y },
        { x: x + 5 * dx / 6, y: y + dy },
        { x: x + 2 * dx / 3, y: y + dy }
      ];
      node.label.x = node.x;
      node.label.y = node.y;
    }
  });
}

/**
 * @param {Graph} g
 */
function removeBorderNodes(g) {
  (g.nodes() || []).forEach((v) => {
    const children = g.children(v);
    if (children && children.length) {
      const node = g.node(v);
      const t = g.node(node.borderTop);
      const b = g.node(node.borderBottom);
      const l = g.node(node.borderLeft[node.borderLeft.length - 1]);
      const r = g.node(node.borderRight[node.borderRight.length - 1]);
      node.width = Math.abs(r.x - l.x);
      node.height = Math.abs(b.y - t.y);
      node.x = l.x + node.width / 2;
      node.y = t.y + node.height / 2;
    }
  });

  (g.nodes() || []).forEach((v) => {
    if (g.node(v).dummy === "border") {
      g.removeNode(v);
    }
  });
}

/**
 * @param {Graph} g
 */
function fixupEdgeLabelCoords(g) {
  (g.edges() || []).forEach((e) => {
    const edge = g.edge(e);
    if (typeof edge.x  === 'number') {
      if (edge.labelpos === "l" || edge.labelpos === "r") {
        edge.width -= edge.labeloffset;
      }
      switch (edge.labelpos) {
        case "l": edge.x -= edge.width / 2 + edge.labeloffset; break;
        case "r": edge.x += edge.width / 2 + edge.labeloffset; break;
        default:
      }
    }
  });
}

/**
 * @param {Graph} g
 */
function translateGraph(g) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = 0;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = 0;
  const graphLabel = g.graph();
  const marginX = graphLabel.marginx || 0;
  const marginY = graphLabel.marginy || 0;

  function getExtremes(attrs) {
    const {x, y} = attrs;
    const w = attrs.width;
    const h = attrs.height;
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2);
    maxY = Math.max(maxY, y + h / 2);
  }

  (g.nodes() || []).forEach((v) => { getExtremes(g.node(v)); });
  (g.edges() || []).forEach((e) => {
    const edge = g.edge(e);
    if (typeof edge.x === 'number') {
      getExtremes(edge);
    }
  });

  minX -= marginX;
  minY -= marginY;

  (g.nodes() || []).forEach((v) => {
    const node = g.node(v);
    node.x -= minX;
    node.y -= minY;
  });

  (g.edges() || []).forEach((e) => {
    const edge = g.edge(e);
    (edge.points || []).forEach((p) => {
      p.x -= minX;
      p.y -= minY;
    });
    if (typeof edge.x === 'number') { edge.x -= minX; }
    if (typeof edge.y === 'number') { edge.y -= minY; }
  });

  graphLabel.width = maxX - minX + marginX;
  graphLabel.height = maxY - minY + marginY;
}

/**
 * @param {Graph} g
 */
function assignNodeIntersects(g) {
  (g.edges() || []).forEach((e) => {
    const edge = g.edge(e);
    const nodeV = g.node(e.v);
    const nodeW = g.node(e.w);
    let p1; 
    let p2;
    if (!edge.points) {
      edge.points = [];
      p1 = nodeW;
      p2 = nodeV;
    } else {
      [p1] = edge.points;
      p2 = edge.points[edge.points.length - 1];
    }
    edge.points.unshift(intersectRect(nodeV, p1));
    edge.points.push(intersectRect(nodeW, p2));
  });
}

/**
 * @param {Graph} g
 */
function reversePointsForReversedEdges(g) {
  (g.edges() || []).forEach((e) => {
    const edge = g.edge(e);
    if (edge.reversed) {
      edge.points.reverse();
    }
  });
}

/**
 * @param {Graph} g
 * @param {Function} timeFn
 */
function runLayoutTime(g, timeFn) {
  timeFn("    makeSpaceForEdgeLabels", () => { makeSpaceForEdgeLabels(g); });
  timeFn("    removeSelfEdges",        () => { removeSelfEdges(g); });
  timeFn("    acyclic",                () => { acyclic.run(g); });
  timeFn("    nestingGraph.run",       () => { nestingGraph.run(g); });
  timeFn("    rank",                   () => { rank(asNonCompoundGraph(g)); });
  timeFn("    injectEdgeLabelProxies", () => { injectEdgeLabelProxies(g); });
  timeFn("    removeEmptyRanks",       () => { removeEmptyRanks(g); });
  timeFn("    nestingGraph.cleanup",   () => { nestingGraph.cleanup(g); });
  timeFn("    normalizeRanks",         () => { normalizeRanks(g); });
  timeFn("    assignRankMinMax",       () => { assignRankMinMax(g); });
  timeFn("    removeEdgeLabelProxies", () => { removeEdgeLabelProxies(g); });
  timeFn("    normalize.run",          () => { normalize.run(g); });
  timeFn("    parentDummyChains",      () => { parentDummyChains(g); });
  timeFn("    addBorderSegments",      () => { addBorderSegments(g); });
  timeFn("    order",                  () => { order(g); });
  timeFn("    insertSelfEdges",        () => { insertSelfEdges(g); });
  timeFn("    adjustCoordinateSystem", () => { coordinateSystem.adjust(g); });
  timeFn("    position",               () => { position(g); });
  timeFn("    positionSelfEdges",      () => { positionSelfEdges(g); });
  timeFn("    removeBorderNodes",      () => { removeBorderNodes(g); });
  timeFn("    normalize.undo",         () => { normalize.undo(g); });
  timeFn("    fixupEdgeLabelCoords",   () => { fixupEdgeLabelCoords(g); });
  timeFn("    undoCoordinateSystem",   () => { coordinateSystem.undo(g); });
  timeFn("    translateGraph",         () => { translateGraph(g); });
  timeFn("    assignNodeIntersects",   () => { assignNodeIntersects(g); });
  timeFn("    reversePoints",          () => { reversePointsForReversedEdges(g); });
  timeFn("    acyclic.undo",           () => { acyclic.undo(g); });
}
/**
 * @param {Graph} g
 */
function runLayout(g) {
  makeSpaceForEdgeLabels(g);
  removeSelfEdges(g);
  acyclic.run(g);
  nestingGraph.run(g);
  rank(asNonCompoundGraph(g));
  injectEdgeLabelProxies(g);
  removeEmptyRanks(g);
  nestingGraph.cleanup(g);
  normalizeRanks(g);
  assignRankMinMax(g);
  removeEdgeLabelProxies(g);
  normalize.run(g);
  parentDummyChains(g);
  addBorderSegments(g);
  order(g);
  insertSelfEdges(g);
  coordinateSystem.adjust(g);
  position(g);
  positionSelfEdges(g);
  removeBorderNodes(g);
  normalize.undo(g);
  fixupEdgeLabelCoords(g);
  coordinateSystem.undo(g);
  translateGraph(g);
  assignNodeIntersects(g);
  reversePointsForReversedEdges(g);
  acyclic.undo(g);
}

/**
 * Copies final layout information from the layout graph back to the input
 * graph. This process only copies whitelisted attributes from the layout graph
 * to the input graph, so it serves as a good place to determine what
 * attributes can influence layout.
 * 
 * @param {Graph} inputGraph
 * @param {Graph} layoutGraph
 */
function updateInputGraph(inputGraph, layoutGraph) {
  const nodes = inputGraph.nodes() || [];
  nodes.forEach((v) => {
    const inputLabel = inputGraph.node(v);
    const layoutLabel = layoutGraph.node(v);

    if (inputLabel) {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;

      if (layoutGraph.children(v).length) {
        inputLabel.width = layoutLabel.width;
        inputLabel.height = layoutLabel.height;
      }
    }
  });
  const edges = inputGraph.edges() || [];
  edges.forEach((e) => {
    const inputLabel = inputGraph.edge(e);
    const layoutLabel = layoutGraph.edge(e);

    inputLabel.points = layoutLabel.points;
    if (typeof layoutLabel.x === 'number') {
      inputLabel.x = layoutLabel.x;
      inputLabel.y = layoutLabel.y;
    }
  });

  inputGraph.graph().width = layoutGraph.graph().width;
  inputGraph.graph().height = layoutGraph.graph().height;
}

const graphNumAttrs = ["nodesep", "edgesep", "ranksep", "marginx", "marginy"];
const graphDefaults = { ranksep: 50, edgesep: 20, nodesep: 50, rankdir: "tb" };
const graphAttrs = ["acyclicer", "ranker", "rankdir", "align"];
const nodeNumAttrs = ["width", "height"];
const nodeDefaults = { width: 0, height: 0 };
const edgeNumAttrs = ["minlen", "weight", "width", "height", "labeloffset"];
const edgeDefaults = {
  minlen: 1, 
  weight: 1, 
  width: 0, 
  height: 0,
  labeloffset: 10, 
  labelpos: "r",
};
const edgeAttrs = ["labelpos"];

function canonicalize(attrs={}) {
  const newAttrs = {};
  for (const [k, v] of Object.entries(attrs)) {
    newAttrs[k.toLowerCase()] = v;
  }
  return newAttrs;
}

/**
 * @param {object} obj
 * @param {string[]} attrs
 * @returns {any} 
 */
function selectNumberAttrs(obj, attrs) {
  const picked = {};
  attrs.forEach((k) => {
    if (typeof obj[k] === 'number' || !!obj[k]) {
      picked[k] = Number(obj[k]);
    }
  });
  return picked;
}

/**
 * Constructs a new graph from the input graph, which can be used for layout.
 * This process copies only whitelisted attributes from the input graph to the
 * layout graph. Thus this function serves as a good place to determine what
 * attributes can influence layout.
 * 
 * @param {Graph} inputGraph
 */
function buildLayoutGraph(inputGraph) {
  const g = new Graph({ multigraph: true, compound: true });
  const graph = canonicalize(inputGraph.graph());

  const ga = {};
  graphAttrs.forEach((k) => {
    if (typeof graph[k] !== 'undefined' && graph[k] !== null) {
      ga[k] = graph[k];
    }
  });
  g.setGraph({
    ...graphDefaults,
    ...selectNumberAttrs(graph, graphNumAttrs),
    ...ga,
  });
  const nodes = inputGraph.nodes() || [];
  nodes.forEach((v) => {
    const node = canonicalize(inputGraph.node(v));
    const na = selectNumberAttrs(node, nodeNumAttrs);
    const value = {
      ...na,
    };
    Object.keys(nodeDefaults).forEach((k) => {
      if (typeof value[k] === 'undefined') {
        value[k] = nodeDefaults[k];
      }
    });
    g.setNode(v, value);
    g.setParent(v, inputGraph.parent(v));
  });

  const edges = inputGraph.edges() || [];
  edges.forEach((e) => {
    const edge = canonicalize(inputGraph.edge(e));
    const ea = {};
    edgeAttrs.forEach((k) => {
      if (typeof edge[k] !== 'undefined' && edge[k] !== null) {
        ea[k] = edge[k];
      }
    });
    const value = {
      ...edgeDefaults,
      ...selectNumberAttrs(edge, edgeNumAttrs),
      ...ea,
    };
    g.setEdge(e, value);
  });

  return g;
}

/**
 * @param {Graph} g
 */
function layoutTiming(g) {
  time("layout", () => {
    const layoutGraph = time("  buildLayoutGraph", () => buildLayoutGraph(g));
    time("  runLayout",        () => { runLayoutTime(layoutGraph, time); });
    time("  updateInputGraph", () => { updateInputGraph(g, layoutGraph); });
  });
}

/**
 * @param {Graph} g
 * @param {LayoutOptions=} opts
 */
export default function layout(g, opts={}) {
  if (opts.debugTiming) {
    layoutTiming(g);
  }
  const layoutGraph = buildLayoutGraph(g);
  runLayout(layoutGraph);
  updateInputGraph(g, layoutGraph);
}
