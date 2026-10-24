export { RHEIN_RUHR, RHEIN_RUHR_PLACES, RHEIN_RUHR_SOURCE } from "./rheinRuhr.ts";
export { RHEIN_RUHR_BUILDINGS, RHEIN_RUHR_MAP_SOURCE, RHEIN_RUHR_STREETS, rheinRuhrMapPoint } from "./rheinRuhrMap.ts";
export type { CityMapBuilding, CityMapPoint, CityMapStreet } from "./rheinRuhrMap.ts";

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

export { CITY_CELL_MARGIN, cityCellOwner, cityCells } from "./cityCells.ts";
export type { CityCell, CityCellPoint } from "./cityCells.ts";

export function cityNeighbors(graph: CityGraph, nodeId: string): readonly string[] {
  const neighbors: string[] = [];
  for (const edge of graph.edges) {
    if (edge.from === nodeId) neighbors.push(edge.to);
    else if (edge.to === nodeId) neighbors.push(edge.from);
  }
  return neighbors;
}
