import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Calendar containment: resolves whether the signed-in user is an app admin.
 * null while unknown, false on any error (fails closed).
 */
export default function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    base44.auth
      .me()
      .then((user) => setIsAdmin(user?.role === "admin"))
      .catch(() => setIsAdmin(false));
  }, []);

  return isAdmin;
}