import _ from 'lodash-es';
import { expect } from '@esm-bundle/chai';
import { Graph } from '@api-modeling/graphlib';
import feasibleTree from '../../src/rank/feasible-tree.js';

describe('feasibleTree', () => {
  it('creates a tree for a trivial input graph', () => {
    const g = new Graph().setNode('a', { rank: 0 }).setNode('b', { rank: 1 }).setEdge('a', 'b', { minlen: 1 });

    const tree = feasibleTree(g);
    expect(g.node('b').rank).to.equal(g.node('a').rank + 1);
    expect(tree.neighbors('a')).to.eql(['b']);
  });

  it('correctly shortens slack by pulling a node up', () => {
    const g = new Graph().setNode('a', { rank: 0 }).setNode('b', { rank: 1 }).setNode('c', { rank: 2 }).setNode('d', { rank: 2 }).setPath(['a', 'b', 'c'], { minlen: 1 }).setEdge('a', 'd', { minlen: 1 });

    const tree = feasibleTree(g);
    expect(g.node('b').rank).to.eql(g.node('a').rank + 1);
    expect(g.node('c').rank).to.eql(g.node('b').rank + 1);
    expect(g.node('d').rank).to.eql(g.node('a').rank + 1);
    expect(_.sortBy(tree.neighbors('a'))).to.eql(['b', 'd']);
    expect(_.sortBy(tree.neighbors('b'))).to.eql(['a', 'c']);
    expect(tree.neighbors('c')).to.eql(['b']);
    expect(tree.neighbors('d')).to.eql(['a']);
  });

  it('correctly shortens slack by pulling a node down', () => {
    const g = new Graph().setNode('a', { rank: 2 }).setNode('b', { rank: 0 }).setNode('c', { rank: 2 }).setEdge('b', 'a', { minlen: 1 }).setEdge('b', 'c', { minlen: 1 });

    const tree = feasibleTree(g);
    expect(g.node('a').rank).to.eql(g.node('b').rank + 1);
    expect(g.node('c').rank).to.eql(g.node('b').rank + 1);
    expect(_.sortBy(tree.neighbors('a'))).to.eql(['b']);
    expect(_.sortBy(tree.neighbors('b'))).to.eql(['a', 'c']);
    expect(_.sortBy(tree.neighbors('c'))).to.eql(['b']);
  });
});
