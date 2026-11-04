const MAX_OFFSET = 88;
const ARM_AT = 56;

export function pullOffset(distance: number): { offset: number; armed: boolean } {
  if (distance <= 0) return { offset: 0, armed: false };
  const offset = Math.min(MAX_OFFSET, distance * 0.45);
  return { offset, armed: offset >= ARM_AT };
}
