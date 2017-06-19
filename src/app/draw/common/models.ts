export interface Node {
  id: number;
  title: string;
  x: number;
  y: number;
  type?: string;
};

export interface Edge {
  source: any;
  target: any;
  type?: string;
};
