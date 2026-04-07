export type TrackingIdentity = {
  userId: string | null;
  sessionId: string | null;
};

export type IdentityFilter =
  | { column: "user_id"; value: string }
  | { column: "session_id"; value: string };

/**
 * Resolves the preferred DB identity filter.
 * Logged-in user_id takes precedence over anonymous session_id.
 */
export function resolveIdentityFilter(identity: TrackingIdentity): IdentityFilter | null {
  if (identity.userId) {
    return { column: "user_id", value: identity.userId };
  }

  if (identity.sessionId) {
    return { column: "session_id", value: identity.sessionId };
  }

  return null;
}

/**
 * Returns the column name for UPSERT conflict handling.
 * Mirrors the same precedence as resolveIdentityFilter().
 */
export function resolveIdentityOnConflictColumn(identity: TrackingIdentity): "user_id" | "session_id" {
  return identity.userId ? "user_id" : "session_id";
}
