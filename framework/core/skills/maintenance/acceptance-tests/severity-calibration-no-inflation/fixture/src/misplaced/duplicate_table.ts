// High-tier candidate (Conceptual Duplication Cat 11): two files encode the same
// permission table. See also: ./permission_table_copy.ts. This is a parallel
// implementation of one decision.
export const permissionMap: Record<string, boolean> = {
  read: true,
  write: false,
  admin: false,
};
