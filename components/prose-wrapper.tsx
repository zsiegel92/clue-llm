"use client";

import { createContext, use } from "react";
import { TableOfContents } from "@/components/table-of-contents";

const ProseDepthContext = createContext(0);

export function ProseWrapper({ children }: { children: React.ReactNode }) {
  const depth = use(ProseDepthContext);

  if (depth > 0) {
    return <ProseDepthContext value={depth + 1}>{children}</ProseDepthContext>;
  }

  return (
    <ProseDepthContext value={depth + 1}>
      <div className="prose-layout">
        <article className="prose">{children}</article>
        <aside className="toc-sidebar">
          <TableOfContents />
        </aside>
      </div>
    </ProseDepthContext>
  );
}
