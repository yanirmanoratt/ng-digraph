// any objects with x & y properties
export function getTheta(pt1, pt2) {
  const xComp = pt2.x - pt1.x;
  const yComp = pt2.y - pt1.y;
  const theta = Math.atan2(yComp, xComp);
  return theta;
}

export function getMidpoint(pt1, pt2) {
  const x = (pt2.x + pt1.x) / 2;
  const y = (pt2.y + pt1.y) / 2;

  return { x: x, y: y };
}

export function getDistance(pt1, pt2) {
  return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
}
