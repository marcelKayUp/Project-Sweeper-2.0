export { RHEIN_RUHR, RHEIN_RUHR_SOURCE } from "./rheinRuhr.ts";

export interface CityNode {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

export interface CityEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly corridor: string;
}

export interface CityGraph {
  readonly id: string;
  readonly nodes: readonly CityNode[];
  readonly edges: readonly CityEdge[];
}

export function cityNeighbors(graph: CityGraph, nodeId: string): readonly string[] {
  const neighbors: string[] = [];
  for (const edge of graph.edges) {
    if (edge.from === nodeId) neighbors.push(edge.to);
    else if (edge.to === nodeId) neighbors.push(edge.from);
  }
  return neighbors;
}
