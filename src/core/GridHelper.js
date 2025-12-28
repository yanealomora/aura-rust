export function coordsToGrid(x, y, mapSize) {
  const gridSize = 146.3;
  const gridX = Math.floor(x / gridSize);
  const gridY = Math.floor((mapSize - y) / gridSize);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let col = '';
  let n = gridX;
  do {
    col = letters[n % 26] + col;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `${col}${gridY}`;
}
