/* eslint-disable no-cond-assign */
import { Graph } from '@api-modeling/graphlib';
import { uniqueId } from '../util.js';

/** @typedef {import('@api-modeling/graphlib').NodeIdentifier} NodeIdentifier */
/** @typedef {import('@api-modeling/graphlib').Edge} Edge */

/**
 * @param {Graph} g
 * @returns {NodeIdentifier} 
 */
function createRootNode(g) {
  let v;
  while (g.hasNode((v = uniqueId("_root"))));
  return v;
}

/**
 * Constructs a graph that can be used to sort a layer of nodes. The graph will
 * contain all base and subgraph nodes from the request layer in their original
 * hierarchy and any edges that are incident on these nodes and are of the type
 * requested by the "relationship" parameter.
 *
 * Nodes from the requested rank that do not have parents are assigned a root
 * node in the output graph, which is set in the root graph attribute. This
 * makes it easy to walk the hierarchy of movable nodes during ordering.
 *
 * Pre-conditions:
 *
 *    1. Input graph is a DAG
 *    2. Base nodes in the input graph have a rank attribute
 *    3. Subgraph nodes in the input graph has minRank and maxRank attributes
 *    4. Edges have an assigned weight
 *
 * Post-conditions:
 *
 *    1. Output graph has all nodes in the movable rank with preserved
 *       hierarchy.
 *    2. Root nodes in the movable layer are made children of the node
 *       indicated by the root attribute of the graph.
 *    3. Non-movable nodes incident on movable nodes, selected by the
 *       relationship parameter, are included in the graph (without hierarchy).
 *    4. Edges incident on movable nodes, selected by the relationship
 *       parameter, are added to the output graph.
 *    5. The weights for copied edges are aggregated as need, since the output
 *       graph is not a multi-graph.
 * 
 * @param {Graph} g
 * @param {number} rank
 * @param {'inEdges'|'outEdges'} relationship
 * @returns {Graph}
 */
export default function buildLayerGraph(g, rank, relationship) {
  const root = createRootNode(g);
  const result = new Graph({ compound: true }).setGraph({ root }).setDefaultNodeLabel(v => g.node(v));

  g.nodes().forEach((v) => {
    const node = g.node(v);
    const parent = g.parent(v);

    if (node.rank === rank || node.minRank <= rank && rank <= node.maxRank) {
      result.setNode(v);
      result.setParent(v, parent || root);

      // This assumes we have only short edges!
      const nodes = /** @type Edge[] */ (g[relationship](v));
      nodes.forEach((e) => {
        const u = e.v === v ? e.w : e.v;
        const edge = result.edge(u, v);
        const weight = edge ? edge.weight : 0;
        const graphEdge = g.edge(e);
        result.setEdge(u, v, { weight: (graphEdge && graphEdge.weight || 1) + weight });
      });

      if (typeof node.minRank === 'number') {
        result.setNode(v, {
          borderLeft: node.borderLeft[rank],
          borderRight: node.borderRight[rank]
        });
      }
    }
  });

  return result;
}
