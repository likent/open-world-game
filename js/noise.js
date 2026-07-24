// ============ ШУМ ============
function hash(x, z) {
  let h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return h - Math.floor(h);
}
function smoothNoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi), b = hash(xi+1, zi);
  const c = hash(xi, zi+1), d = hash(xi+1, zi+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
function terrainHeight(x, z) {
  let h = 0;
  h += smoothNoise(x * 0.012, z * 0.012) * 14;
  h += smoothNoise(x * 0.04,  z * 0.04)  * 4;
  h += smoothNoise(x * 0.15,  z * 0.15)  * 0.7;
  return h - 9;
}

const WATER_Y = -5.2;
