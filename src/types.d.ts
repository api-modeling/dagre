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

export interface GraphLabel {
  width?: number;
  height?: number;
  compound?: boolean;
  rankdir?: string;
  align?: string;
  nodesep?: number;
  edgesep?: number;
  ranksep?: number;
  marginx?: number;
  marginy?: number;
  acyclicer?: string;
  ranker?: string;
}

export interface NodeConfig {
  width?: number;
  height?: number;
}

export interface EdgeConfig {
  minlen?: number;
  weight?: number;
  width?: number;
  height?: number;
  lablepos?: 'l' | 'c' | 'r';
  labeloffest?: number;
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
