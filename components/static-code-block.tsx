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
    return (
      <div className="output output--loading">
        <span className="output__spinner" />
        Loading Python...
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="output output--running">
        <span className="output__spinner" />
        Running...
      </div>
    );
  }

  return (
    <div className="output">
      {stdout && <pre className="output__stdout">{stdout}</pre>}
      {stderr && <pre className="output__stderr">{stderr}</pre>}
    </div>
  );
}

export function StaticCodeBlock({ code }: { code: string }) {
  const { runPython, stdout, stderr, isLoading, isRunning, isReady } =
    usePython({});

  useEffect(() => {
    if (isReady) {
      runPython(code);
    }
  }, [code, isReady, runPython]);

  return (
    <div className="code-block">
      <SyntaxHighlighter
        language="python"
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: "1rem",
          borderRadius: "0.5rem 0.5rem 0 0",
          fontSize: "0.875rem",
          lineHeight: 1.7,
        }}
      >
        {code}
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
