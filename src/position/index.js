/* eslint-disable no-param-reassign */
import { positionX } from "./bk.js";
import { asNonCompoundGraph, buildLayerMatrix } from "../util.js";

/** @typedef {import('@api-modeling/graphlib').Graph} Graph */

/**
 * @param {Graph} g
 */
function positionY(g) {
  const layering = buildLayerMatrix(g);
  const rankSep = g.graph().ranksep;
  let prevY = 0;
  (layering || []).forEach((layer) => {
    const heights = /** @type number[] */ (layer.map(v => g.node(v).height));
    const maxHeight = Math.max(...heights);
    layer.forEach((v) => {
      g.node(v).y = prevY + maxHeight / 2;
    });
    prevY += maxHeight + rankSep;
  });
}

/**
 * @param {Graph} g
 */
export default function position(g) {
  const graph = asNonCompoundGraph(g);

  positionY(graph);
  Object.entries(positionX(g)).forEach(([v, x]) => {
    g.node(v).x = x;
  });
}
