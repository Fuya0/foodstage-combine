export type QuaternionValue = [number, number, number, number];
export type ModelMotion = { home: QuaternionValue; returning: { at: number; from: QuaternionValue | null } | null; orientation: QuaternionValue; camera: QuaternionValue; vx: number; vy: number; dragging: boolean };

export function createModelMotion(yaw = 0): ModelMotion {
  return { home: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], returning: null, orientation: [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], camera: [0, 0, 0, 1], vx: 0, vy: 0, dragging: false };
}

export function cancelModelReturn(motion: ModelMotion) { motion.returning = null; }
export function scheduleModelReturn(motion: ModelMotion, now: number) {
  const dot = motion.orientation.reduce((sum, value, i) => sum + value * motion.home[i], 0);
  motion.returning = Math.abs(dot) > 0.9999999 && Math.hypot(motion.vx, motion.vy) < 0.001 ? null : { at: now + 150, from: null };
}
export function stepModelReturn(motion: ModelMotion, now: number, reduced = false): boolean {
  if (reduced || motion.dragging) { cancelModelReturn(motion); return false; }
  const returning = motion.returning;
  if (!returning || now < returning.at) return false;
  returning.from ??= [...motion.orientation];
  const progress = (now >= returning.at + 650 ? 1 : (now - returning.at) / 650);
  motion.vx = 0; motion.vy = 0;
  interpolateModel(motion, returning.from, motion.home, 1 - (1 - progress) ** 3);
  if (progress >= 1) motion.returning = null;
  return true;
}

export function setModelCamera(motion: ModelMotion, camera: readonly number[]) {
  motion.camera = [camera[0], camera[1], camera[2], camera[3]];
}

// Premultiply around fixed world Y and the camera's screen-right axis. Neither
// axis follows the food, so turning it over cannot reverse the next gesture.
export function rotateModel(motion: ModelMotion, yaw: number, pitch: number) {
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch) || (!yaw && !pitch)) return;
  const [cx, cy, cz, cw] = motion.camera;
  const ax = pitch * (1 - 2 * (cy * cy + cz * cz));
  const ay = yaw + pitch * 2 * (cx * cy + cw * cz);
  const az = pitch * 2 * (cx * cz - cw * cy);
  const angle = Math.hypot(ax, ay, az);
  if (!angle) return;
  const factor = Math.sin(angle / 2) / angle;
  const dx = ax * factor, dy = ay * factor, dz = az * factor, dw = Math.cos(angle / 2);
  const [x, y, z, w] = motion.orientation;
  const nx = dw * x + dx * w + dy * z - dz * y, ny = dw * y - dx * z + dy * w + dz * x;
  const nz = dw * z + dx * y - dy * x + dz * w, nw = dw * w - dx * x - dy * y - dz * z;
  const length = Math.hypot(nx, ny, nz, nw);
  motion.orientation[0] = nx / length; motion.orientation[1] = ny / length;
  motion.orientation[2] = nz / length; motion.orientation[3] = nw / length;
}

/** Spherical return to the food's own home pose without loading Three early. */
export function interpolateModel(motion: ModelMotion, from: QuaternionValue, to: QuaternionValue, alpha: number) {
  let dot = from.reduce((sum, value, i) => sum + value * to[i], 0);
  const sign = dot < 0 ? -1 : 1; dot = Math.min(1, Math.abs(dot));
  const angle = Math.acos(dot), sine = Math.sin(angle);
  const a = sine > 0.00001 ? Math.sin((1 - alpha) * angle) / sine : 1 - alpha;
  const b = (sine > 0.00001 ? Math.sin(alpha * angle) / sine : alpha) * sign;
  for (let i = 0; i < 4; i++) motion.orientation[i] = a * from[i] + b * to[i];
  const length = Math.hypot(...motion.orientation);
  for (let i = 0; i < 4; i++) motion.orientation[i] /= length;
}
