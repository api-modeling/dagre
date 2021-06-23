#!/usr/bin/env node

import Benchmark from "benchmark";
import pkg from 'sprintf';
import { Graph } from "@api-modeling/graphlib";
const rank = require("../src/rank");
const {layout} = require("..");


const { sprintf } = pkg;

function runBenchmark(name, fn) {
  const options = {};
  options.onComplete = function(bench) {
    const {target} = bench;
        const {hz} = target;
        const {stats} = target;
        const {rme} = stats;
        const samples = stats.sample.length;
        const msg = sprintf("    %25s: %13s ops/sec \xb1 %s%% (%3d run(s) sampled)",
                      target.name,
                      Benchmark.formatNumber(hz.toFixed(2)),
                      rme.toFixed(2),
                      samples);
    console.log(msg);
  };
  options.onError = function(bench) {
    console.error(`    ${  bench.target.error}`);
  };
  options.setup = function() {
    this.count = Math.random() * 1000;
    this.nextInt = function(range) {
      return Math.floor(this.count++ % range );
    };
  };
  new Benchmark(name, fn, options).run();
}

const g = new Graph()
  .setGraph({})
  .setDefaultNodeLabel(() => ({ width: 1, height: 1}))
  .setDefaultEdgeLabel(() => ({ minlen: 1, weight: 1 }))
  .setPath(["a", "b", "c", "d", "h"])
  .setPath(["a", "e", "g", "h"])
  .setPath(["a", "f", "g"]);

runBenchmark("longest-path ranker", () => {
  g.graph().ranker = "longest-path";
  rank(g);
});

runBenchmark("tight-tree ranker", () => {
  g.graph().ranker = "tight-tree";
  rank(g);
});

runBenchmark("network-simplex ranker", () => {
  g.graph().ranker = "network-simplex";
  rank(g);
});

runBenchmark("layout", () => {
  delete g.graph().ranker;
  layout(g);
});
