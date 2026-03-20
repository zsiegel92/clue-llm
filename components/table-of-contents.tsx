"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<ReadonlyArray<TocItem>>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const article = document.querySelector("article.prose");
    if (!article) return;

    const elements = article.querySelectorAll("h2, h3");
    const items: Array<TocItem> = [];

    for (const el of elements) {
      const text = el.textContent ?? "";
      if (!text.trim()) continue;
      const id = el.id || slugify(text);
      if (!el.id) el.id = id;
      items.push({ id, text: text.trim(), level: el.tagName === "H2" ? 2 : 3 });
    }

    setHeadings(items);
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0 },
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="toc">
      <p className="toc__title">On this page</p>
      <ul className="toc__list">
        {headings.map(({ id, text, level }) => (
          <li
            key={id}
            className={level === 3 ? "toc__item--nested" : undefined}
          >
            <a
              href={`#${id}`}
              className={`toc__link ${activeId === id ? "toc__link--active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(id)
                  ?.scrollIntoView({ behavior: "auto" });
              }}
            >
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
