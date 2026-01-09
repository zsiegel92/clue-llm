"use client";

import { useEffect, useState } from "react";
import { usePython } from "react-py";
import { codeToHtml } from "shiki";

interface StaticCodeBlockProps {
  code: string;
  lang?: string;
}

export function StaticCodeBlock({
  code,
}: StaticCodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const { runPython, stdout, stderr, isLoading, isRunning } = usePython();
  useEffect(() => {
    codeToHtml(code.trim(), {
      lang: "python",
      theme: "github-dark",
    }).then((html) => {
      setHtml(html);
    });
    runPython(code);
  }, [code, runPython]);

  return (
    <div>
      <h1>Code</h1>
      {html ? (
        <div
          className="static-code-block"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p>Rendering......</p>
      )}

      <h1>Output</h1>
      <Output isLoading={isLoading} isRunning={isRunning} stdout={stdout} stderr={stderr} />
    </div>
  );
}

function Output({
  isLoading,
  isRunning,
  stdout,
  stderr,
}: {
  isLoading: boolean;
  isRunning: boolean;
  stdout: string;
  stderr: string;
}) {
  if (isLoading) {
    return <p>Loading...</p>;
  }
  if (isRunning) {
    return <p>Running...</p>;
  }
  if (stderr) {
    return <pre>{stderr}</pre>;
  }
  return (
    <div>
      <pre>{stdout}</pre>
      {stderr ? (
        <div>
          <h2>Error</h2>
          <pre>{stderr}</pre>
        </div>
      ) : null}
    </div>
  );
}
