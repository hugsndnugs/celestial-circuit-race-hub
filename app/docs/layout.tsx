"use client";

import { ReactNode, useEffect, useState } from "react";
import { getCurrentAdminIdentity, isAllowedDeveloper } from "@/lib/controller/admin-auth";
import { PublicDocsPlaceholder } from "@/app/docs/PublicDocsPlaceholder";

export default function DocsLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function checkAccess() {
      try {
        const identity = await getCurrentAdminIdentity();
        const allowed = identity?.email ? await isAllowedDeveloper(identity.email) : false;
        if (!isMounted) return;
        setHasAccess(allowed);
      } catch {
        if (!isMounted) return;
        setHasAccess(false);
      } finally {
        if (!isMounted) return;
        setIsCheckingAccess(false);
      }
    }
    void checkAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingAccess) {
    return (
      <main className="docs-main">
        <section className="card">
          <h1>Loading docs access...</h1>
          <p className="muted">Checking developer permissions.</p>
        </section>
      </main>
    );
  }

  if (!hasAccess) {
    return <PublicDocsPlaceholder />;
  }

  return <>{children}</>;
}
