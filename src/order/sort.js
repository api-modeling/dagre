/* eslint-disable no-plusplus */
/* eslint-disable no-cond-assign */
/* eslint-disable no-param-reassign */
import { partition } from "../util.js";

/** @typedef {import('@api-modeling/graphlib').NodeIdentifier} NodeIdentifier */
/** @typedef {import('../types').ConflictResolutionResult} ConflictResolutionResult */
/** @typedef {import('../types').SortResult} SortResult */

/**
 * @param {NodeIdentifier[][]} vs
 * @param {ConflictResolutionResult[]} unsortable
 * @param {number} index
 * @returns {number} 
 */
function consumeUnsortable(vs, unsortable, index) {
  let last;
  while (unsortable.length && (last = unsortable[unsortable.length - 1]).i <= index) {
    unsortable.pop();
    vs.push(last.vs);
    index++;
  }
  return index;
}

/**
 * @param {boolean} bias
 * @returns {(entryV: ConflictResolutionResult, entryW: ConflictResolutionResult) => number} 
 */
function compareWithBias(bias) {
  /** 
   * @param {ConflictResolutionResult} entryV
   * @param {ConflictResolutionResult} entryW
   * @returns {number}
   */
  return (entryV, entryW) => {
    if (entryV.barycenter < entryW.barycenter) {
      return -1;
    } if (entryV.barycenter > entryW.barycenter) {
      return 1;
    }

    return !bias ? entryV.i - entryW.i : entryW.i - entryV.i;
  };
}

/**
 * @param {ConflictResolutionResult[]} entries
 * @param {boolean=} biasRight
 * @returns {SortResult} 
 */
export default function sort(entries, biasRight=false) {
  const parts = partition(entries, entry => typeof entry.barycenter === 'number');
  const sortable = parts.lhs;
  const unsortable = [...parts.rhs].sort((a, b) => -a.i + b.i);
  // const unsortable = _.sortBy(parts.rhs, entry => -entry.i);
  const vs = /** @type NodeIdentifier[][] */ ([]);
  let sum = 0;
  let weight = 0;
  let vsIndex = 0;

  sortable.sort(compareWithBias(!!biasRight));

  vsIndex = consumeUnsortable(vs, unsortable, vsIndex);

  sortable.forEach((entry) => {
    vsIndex += entry.vs.length;
    vs.push(entry.vs);
    sum += entry.barycenter * entry.weight;
    weight += entry.weight;
    vsIndex = consumeUnsortable(vs, unsortable, vsIndex);
  });

  const result = /** @type SortResult */ ({ vs: vs.flat() });
  if (weight) {
    result.barycenter = sum / weight;
    result.weight = weight;
  }
  return result;
}
