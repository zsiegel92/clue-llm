import type { MDXComponents } from "mdx/types";
import { ProseWrapper } from "@/components/prose-wrapper";

const components: MDXComponents = {
  wrapper: ProseWrapper,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
