export interface CityPictureNode {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

export interface CityPictureEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
}

export interface CityBlock {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}

export interface CityStreet {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface CityPicture {
  readonly viewBox: string;
  readonly blocks: readonly CityBlock[];
  readonly streets: readonly CityStreet[];
}

const PAD = 48;

export function cityPicture(nodes: readonly CityPictureNode[], edges: readonly CityPictureEdge[]): CityPicture {
  const places = new Map(nodes.map((node) => [node.id, node]));
  const streets: CityStreet[] = [];
  for (const edge of edges) {
    const from = places.get(edge.from);
    const to = places.get(edge.to);
    if (!from || !to) continue;
    streets.push({ id: edge.id, x1: from.x, y1: from.y, x2: to.x, y2: to.y });
  }
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = (xs.length > 0 ? Math.min(...xs) : 0) - PAD;
  const minY = (ys.length > 0 ? Math.min(...ys) : 0) - PAD;
  const maxX = (xs.length > 0 ? Math.max(...xs) : 1) + PAD;
  const maxY = (ys.length > 0 ? Math.max(...ys) : 1) + PAD;
  return {
    viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`,
    blocks: nodes.map((node) => ({ id: node.id, name: node.name, x: node.x, y: node.y })),
    streets,
  };
}
