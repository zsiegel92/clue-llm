import type { MDXComponents } from "mdx/types";

function ProseWrapper({ children }: { children: React.ReactNode }) {
  return <article className="prose">{children}</article>;
}

const components: MDXComponents = {
  wrapper: ProseWrapper,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
