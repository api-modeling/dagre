import _ from 'lodash-es';
import { expect } from '@esm-bundle/chai';
import { Graph } from '@api-modeling/graphlib';
import resolveConflicts from "../../src/order/resolve-conflicts.js";

describe("order/resolveConflicts", () => {
  /** @type Graph */
  let cg;

  beforeEach(() => {
    cg = new Graph();
  });

  it("returns back nodes unchanged when no constraints exist", () => {
    const input = [
      { v: "a", barycenter: 2, weight: 3 },
      { v: "b", barycenter: 1, weight: 2 }
    ];
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["a"], i: 0, barycenter: 2, weight: 3 },
      { vs: ["b"], i: 1, barycenter: 1, weight: 2 }
    ]);
  });

  it("returns back nodes unchanged when no conflicts exist", () => {
    const input = [
      { v: "a", barycenter: 2, weight: 3 },
      { v: "b", barycenter: 1, weight: 2 }
    ];
    cg.setEdge("b", "a");
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["a"], i: 0, barycenter: 2, weight: 3 },
      { vs: ["b"], i: 1, barycenter: 1, weight: 2 }
    ]);
  });

  it("coalesces nodes when there is a conflict", () => {
    const input = [
      { v: "a", barycenter: 2, weight: 3 },
      { v: "b", barycenter: 1, weight: 2 }
    ];
    cg.setEdge("a", "b");
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["a", "b"],
        i: 0,
        barycenter: (3 * 2 + 2 * 1) / (3 + 2),
        weight: 3 + 2
      }
    ]);
  });

  it("coalesces nodes when there is a conflict #2", () => {
    const input = [
      { v: "a", barycenter: 4, weight: 1 },
      { v: "b", barycenter: 3, weight: 1 },
      { v: "c", barycenter: 2, weight: 1 },
      { v: "d", barycenter: 1, weight: 1 }
    ];
    cg.setPath(["a", "b", "c", "d"]);
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["a", "b", "c", "d"],
        i: 0,
        barycenter: (4 + 3 + 2 + 1) / 4,
        weight: 4
      }
    ]);
  });

  it("works with multiple constraints for the same target #1", () => {
    const input = [
      { v: "a", barycenter: 4, weight: 1 },
      { v: "b", barycenter: 3, weight: 1 },
      { v: "c", barycenter: 2, weight: 1 },
    ];
    cg.setEdge("a", "c");
    cg.setEdge("b", "c");
    const results = resolveConflicts(input, cg);
    expect(results).to.have.length(1);
    expect(_.indexOf(results[0].vs, "c")).to.be.gt(_.indexOf(results[0].vs, "a"));
    expect(_.indexOf(results[0].vs, "c")).to.be.gt(_.indexOf(results[0].vs, "b"));
    expect(results[0].i).equals(0);
    expect(results[0].barycenter).equals((4 + 3 + 2) / 3);
    expect(results[0].weight).equals(3);
  });

  it("works with multiple constraints for the same target #2", () => {
    const input = [
      { v: "a", barycenter: 4, weight: 1 },
      { v: "b", barycenter: 3, weight: 1 },
      { v: "c", barycenter: 2, weight: 1 },
      { v: "d", barycenter: 1, weight: 1 },
    ];
    cg.setEdge("a", "c");
    cg.setEdge("a", "d");
    cg.setEdge("b", "c");
    cg.setEdge("c", "d");
    const results = resolveConflicts(input, cg);
    expect(results).to.have.length(1);
    expect(_.indexOf(results[0].vs, "c")).to.be.gt(_.indexOf(results[0].vs, "a"));
    expect(_.indexOf(results[0].vs, "c")).to.be.gt(_.indexOf(results[0].vs, "b"));
    expect(_.indexOf(results[0].vs, "d")).to.be.gt(_.indexOf(results[0].vs, "c"));
    expect(results[0].i).equals(0);
    expect(results[0].barycenter).equals((4 + 3 + 2 + 1) / 4);
    expect(results[0].weight).equals(4);
  });

  it("does nothing to a node lacking both a barycenter and a constraint", () => {
    const input = [
      { v: "a" },
      { v: "b", barycenter: 1, weight: 2 }
    ];
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["a"], i: 0 },
      { vs: ["b"], i: 1, barycenter: 1, weight: 2 }
    ]);
  });

  it("treats a node w/o a barycenter as always violating constraints #1", () => {
    const input = [
      { v: "a" },
      { v: "b", barycenter: 1, weight: 2 }
    ];
    cg.setEdge("a", "b");
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["a", "b"], i: 0, barycenter: 1, weight: 2 }
    ]);
  });

  it("treats a node w/o a barycenter as always violating constraints #2", () => {
    const input = [
      { v: "a" },
      { v: "b", barycenter: 1, weight: 2 }
    ];
    cg.setEdge("b", "a");
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["b", "a"], i: 0, barycenter: 1, weight: 2 }
    ]);
  });

  it("ignores edges not related to entries", () => {
    const input = [
      { v: "a", barycenter: 2, weight: 3 },
      { v: "b", barycenter: 1, weight: 2 }
    ];
    cg.setEdge("c", "d");
    expect(_.sortBy(resolveConflicts(input, cg), "vs")).eqls([
      { vs: ["a"], i: 0, barycenter: 2, weight: 3 },
      { vs: ["b"], i: 1, barycenter: 1, weight: 2 }
    ]);
  });
});
