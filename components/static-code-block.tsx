"use client";

import { useEffect } from "react";
import { usePython } from "react-py";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

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

export function StaticCodeBlock({ code }: { code: string }) {
  const { runPython, stdout, stderr, isLoading, isRunning } = usePython({});

  useEffect(() => {
    runPython(code);
  }, [code, runPython]);

  return (
    <div>
      <SyntaxHighlighter
        language="python"
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          lineHeight: 1.7,
        }}
      >
        {code.trim()}
      </SyntaxHighlighter>
      <Output
        isLoading={isLoading}
        isRunning={isRunning}
        stdout={stdout}
        stderr={stderr}
      />
    </div>
  );
}
