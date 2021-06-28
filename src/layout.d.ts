import { Graph } from '@api-modeling/graphlib';
import { EdgeConfig, LayoutOptions, NodeConfig, GraphLabel } from './types';

/**
 * @param g The graph to layout
 * @param opts Layout options.
 */
export default function layout(g: Graph<GraphLabel, NodeConfig, EdgeConfig>, opts?: LayoutOptions): void;
