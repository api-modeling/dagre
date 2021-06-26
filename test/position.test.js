import { expect } from '@esm-bundle/chai';
import { Graph } from '@api-modeling/graphlib';
import position from '../src/position/index.js';

describe('position', () => {
  /** @type Graph */
  let g;

  beforeEach(() => {
    g = new Graph({ compound: true }).setGraph({
      ranksep: 50,
      nodesep: 50,
      edgesep: 10,
    });
  });

  it('respects ranksep', () => {
    g.graph().ranksep = 1000;
    g.setNode('a', { width: 50, height: 100, rank: 0, order: 0 });
    g.setNode('b', { width: 50, height: 80, rank: 1, order: 0 });
    g.setEdge('a', 'b');
    position(g);
    expect(g.node('b').y).to.equal(100 + 1000 + 80 / 2);
  });

  it('use the largest height in each rank with ranksep', () => {
    g.graph().ranksep = 1000;
    g.setNode('a', { width: 50, height: 100, rank: 0, order: 0 });
    g.setNode('b', { width: 50, height: 80, rank: 0, order: 1 });
    g.setNode('c', { width: 50, height: 90, rank: 1, order: 0 });
    g.setEdge('a', 'c');
    position(g);
    expect(g.node('a').y).to.equal(100 / 2);
    expect(g.node('b').y).to.equal(100 / 2); // Note we used 100 and not 80 here
    expect(g.node('c').y).to.equal(100 + 1000 + 90 / 2);
  });

  it('respects nodesep', () => {
    g.graph().nodesep = 1000;
    g.setNode('a', { width: 50, height: 100, rank: 0, order: 0 });
    g.setNode('b', { width: 70, height: 80, rank: 0, order: 1 });
    position(g);
    expect(g.node('b').x).to.equal(g.node('a').x + 50 / 2 + 1000 + 70 / 2);
  });

  it('should not try to position the subgraph node itself', () => {
    g.setNode('a', { width: 50, height: 50, rank: 0, order: 0 });
    g.setNode('sg1', {});
    g.setParent('a', 'sg1');
    position(g);
    expect(g.node('sg1')).to.not.have.property('x');
    expect(g.node('sg1')).to.not.have.property('y');
  });
});
