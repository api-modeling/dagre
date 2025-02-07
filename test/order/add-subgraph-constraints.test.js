import _ from 'lodash-es';
import { expect } from '@esm-bundle/chai';
import { Graph } from '@api-modeling/graphlib';
import addSubgraphConstraints from '../../src/order/add-subgraph-constraints.js';

describe('order/addSubgraphConstraints', () => {
  /** @type Graph */
  let g;
  /** @type Graph */
  let cg;

  beforeEach(() => {
    g = new Graph({ compound: true });
    cg = new Graph();
  });

  it('does not change CG for a flat set of nodes', () => {
    const vs = ['a', 'b', 'c', 'd'];
    _.forEach(vs, (v) => {
      g.setNode(v);
    });
    addSubgraphConstraints(g, cg, vs);
    expect(cg.nodeCount()).equals(0);
    expect(cg.edgeCount()).equals(0);
  });

  it("doesn't create a constraint for contiguous subgraph nodes", () => {
    const vs = ['a', 'b', 'c'];
    _.forEach(vs, (v) => {
      g.setParent(v, 'sg');
    });
    addSubgraphConstraints(g, cg, vs);
    expect(cg.nodeCount()).equals(0);
    expect(cg.edgeCount()).equals(0);
  });

  it('adds a constraint when the parents for adjacent nodes are different', () => {
    const vs = ['a', 'b'];
    g.setParent('a', 'sg1');
    g.setParent('b', 'sg2');
    addSubgraphConstraints(g, cg, vs);
    expect(cg.edges()).eqls([{ v: 'sg1', w: 'sg2' }]);
  });

  it('works for multiple levels', () => {
    const vs = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    _.forEach(vs, (v) => {
      g.setNode(v);
    });
    g.setParent('b', 'sg2');
    g.setParent('sg2', 'sg1');
    g.setParent('c', 'sg1');
    g.setParent('d', 'sg3');
    g.setParent('sg3', 'sg1');
    g.setParent('f', 'sg4');
    g.setParent('g', 'sg5');
    g.setParent('sg5', 'sg4');
    addSubgraphConstraints(g, cg, vs);
    expect(_.sortBy(cg.edges(), 'v')).eqls([
      { v: 'sg1', w: 'sg4' },
      { v: 'sg2', w: 'sg3' },
    ]);
  });
});
