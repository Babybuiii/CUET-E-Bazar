"use client";

/**
 * RoleGuard wrapper component.
 * Allows all users (guests, students, shop owners, admins) to freely browse public app routes.
 */
export function RoleGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
