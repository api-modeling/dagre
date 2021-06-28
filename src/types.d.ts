import { Edge, NodeIdentifier } from "@api-modeling/graphlib";

export declare interface DummyNodeAttributes {
  width?: number;
  height?: number;
  edgeLabel?: any;
  edgeObj?: Edge<GraphEdge>;
  rank?: number;
  dummy?: string;
  labelpos?: any;
  order?: number;
  x?: number;
  y?: number;
  e?: any;
  label?: any;
}

export declare interface DummyEdge {
  weight: number;
}

export type AlignOptions = 'UL' | 'UR' | 'DL' | 'DR';
export type RankDirOptions = 'TB' | 'BT' | 'LR' | 'RL';
export type LabelPosOptions = 'l' | 'c' | 'r';
export type RankerOptions = 'network-simplex' | 'tight-tree' | 'longest-path';
export type AcyclicerOptions = 'greedy';

export interface GraphLabel {
  // width?: number;
  // height?: number;
  // compound?: boolean;
  /**
   * Direction for rank nodes. Can be TB, BT, LR, or RL, where T = top, B = bottom, L = left, and R = right.
   * @default TB
   */
  rankdir?: RankDirOptions;
  /**
   * Alignment for rank nodes. Can be UL, UR, DL, or DR, where U = up, D = down, L = left, and R = right.
   */
  align?: AlignOptions;
  /**
   * Number of pixels that separate nodes horizontally in the layout.
   * @default 50
   */
  nodesep?: number;
  /**
   * Number of pixels that separate edges horizontally in the layout.
   * @default 10
   */
  edgesep?: number;
  /**
   * Number of pixels between each rank in the layout.
   * @default 50
   */
  ranksep?: number;
  /**
   * Number of pixels to use as a margin around the left and right of the graph.
   * @default 0
   */
  marginx?: number;
  /**
   * Number of pixels to use as a margin around the top and bottom of the graph.
   * @default 0
   */
  marginy?: number;
  /**
   * If set to greedy, uses a greedy heuristic for finding a feedback arc set for a graph. A feedback arc set is a set of edges that can be removed to make a graph acyclic.
   */
  acyclicer?: AcyclicerOptions;
  /**
   * Type of algorithm to assigns a rank to each node in the input graph. Possible values: network-simplex, tight-tree or longest-path
   * @default network-simplex
   */
  ranker?: RankerOptions;
  /**
   * Result of running layout().
   * The height of the entire graph.
   */
  weight?: number;
  /**
   * Result of running layout().
   * The width of the entire graph.
   */
  width?: number;
}

export interface NodeConfig {
  /**
   * The width of the node in pixels.
   * @default 0
   */
  width?: number;
  /**
   * The height of the node in pixels.
   * @default
   */
  height?: number;
  /**
   * Result of running layout().
   * The x-coordinate for the center of the node
   */
  x?: number;
  /**
   * Result of running layout().
   * The y-coordinate for the center of the node
   */
  y?: number;
}

export interface EdgeConfig {
  /**
   * The number of ranks to keep between the source and target of the edge.
   * @default 1
   */
  minlen?: number;
  /**
   * The weight to assign edges. Higher weight edges are generally made shorter and straighter than lower weight edges.
   * @default 1
   */
  weight?: number;
  /**
   * The width of the edge label in pixels.
   * @default 0
   */
  width?: number;
  /**
   * The height of the edge label in pixels.
   * @default 0
   */
  height?: number;
  /**
   * Where to place the label relative to the edge. l = left, c = center r = right.
   * @default r
   */
  labelpos?: LabelPosOptions;
  /**
   * How many pixels to move the label away from the edge. Applies only when labelpos is l or r.
   * @default 10
   */
  labeloffset?: number;
  /**
   * Result of running layout().
   * The x-coordinate for the center of the edge label.
   */
  x?: number;
  /**
   * Result of running layout().
   * The y-coordinate for the center of the edge label.
   */
  y?: number;
  /**
   * An array of { x, y } pairs for the control points of the edge.
   */
  points?: { x: number, y: number }[];
}

export interface LayoutConfig {
  debugTiming?: boolean;
}

export type LayoutOptions = LayoutConfig & GraphLabel & NodeConfig & EdgeConfig;

export interface GraphEdge {
  points: Array<{ x: number; y: number }>;
  [key: string]: any;
}

export type Node<T = {}> = T & {
  x: number;
  y: number;
  width: number;
  height: number;
  class?: string;
  label?: string;
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  rx?: number;
  ry?: number;
  shape?: string;
}

export type WeightFn = (edge: Edge<GraphEdge>) => number;
export type EdgeFn = (outNodeName: string) => GraphEdge[];

export interface BaryCenter {
  v: NodeIdentifier;
  barycenter?: number;
  weight?: number;
}

export interface SubgraphSortResult {
  barycenter?: number;
  weight?: number;
  vs?: NodeIdentifier[];
}

export interface ConflictResolutionResult {
  vs: NodeIdentifier[];
  i: number;
  barycenter?: number;
  weight?: number;
}

export interface ConflictResolution extends ConflictResolutionResult {
  indegree: number;
  in: any[];
  out: ConflictResolution[];
  merged?: boolean;
}

export interface SortResult {
  vs: NodeIdentifier[];
  barycenter?: number;
  weight?: number;
}

export interface NestedGraphNodeConfig extends NodeConfig {
  borderTop?: NodeIdentifier;
  borderBottom?: NodeIdentifier;
}
