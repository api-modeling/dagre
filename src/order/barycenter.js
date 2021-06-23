/** @typedef {import('@api-modeling/graphlib').Graph} Graph */
/** @typedef {import('@api-modeling/graphlib').NodeIdentifier} NodeIdentifier */
/** @typedef {import('../types').BaryCenter} BaryCenter */

/**
 * @param {Graph} g
 * @param {NodeIdentifier[]} movable
 * @returns {BaryCenter[]}
 */
export default function barycenter(g, movable) {
  return movable.map((v) => {
    const inV = g.inEdges(v);
    if (!inV.length) {
      return /** @type BaryCenter */ ({ v });
    }
    const result = inV.reduce((acc, e) => {
        const edge = g.edge(e);
        const nodeU = g.node(e.v);
        return {
          sum: acc.sum + edge.weight * nodeU.order,
          weight: acc.weight + edge.weight,
        };
      },
      { sum: 0, weight: 0 },
    );

    return /** @type BaryCenter */ ({
      v,
      barycenter: result.sum / result.weight,
      weight: result.weight,
    });
  });
}
