"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TocSection {
  heading: TocItem;
  children: ReadonlyArray<TocItem>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function groupIntoSections(
  headings: ReadonlyArray<TocItem>,
): ReadonlyArray<TocSection> {
  const sections: Array<TocSection> = [];

  for (const heading of headings) {
    if (heading.level === 2) {
      sections.push({ heading, children: [] });
    } else if (sections.length > 0) {
      const current = sections[sections.length - 1];
      sections[sections.length - 1] = {
        ...current,
        children: [...current.children, heading],
      };
    }
  }

  return sections;
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
      items.push({
        id,
        text: text.trim(),
        level: el.tagName === "H2" ? 2 : 3,
      });
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

  const sections = groupIntoSections(headings);

  return (
    <nav className="toc">
      <p className="toc__title">On this page</p>
      <ul className="toc__list">
        {sections.map((section) => (
          <li key={section.heading.id} className="toc__section">
            <a
              href={`#${section.heading.id}`}
              className={`toc__link ${activeId === section.heading.id ? "toc__link--active" : ""}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(section.heading.id)
                  ?.scrollIntoView({ behavior: "auto" });
              }}
            >
              {section.heading.text}
            </a>
            {section.children.length > 0 && (
              <ul className="toc__children">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      className={`toc__link ${activeId === child.id ? "toc__link--active" : ""}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document
                          .getElementById(child.id)
                          ?.scrollIntoView({ behavior: "auto" });
                      }}
                    >
                      {child.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
