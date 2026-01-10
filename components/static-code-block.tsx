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
        <span className="inline-flex gap-1">
          <span
            className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span
            className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span
            className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </span>
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

export function StaticCodeBlock({
  code,
  fileName,
}: {
  code: string;
  fileName?: string;
}) {
  const { runPython, stdout, stderr, isLoading, isRunning, isReady } =
    usePython({});

  useEffect(() => {
    if (isReady) {
      runPython(code);
    }
  }, [code, isReady, runPython]);

  const handleRerun = () => {
    if (isReady && !isLoading && !isRunning) {
      runPython(code);
    }
  };

  return (
    <div className="code-block relative">
      <SyntaxHighlighter
        wrapLines={true}
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
        {fileName ? `# ${fileName}\n${code}` : code}
      </SyntaxHighlighter>
      <button
        onClick={handleRerun}
        disabled={isLoading || isRunning || !isReady}
        className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800/90 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
        title="Re-run code"
      >
        {isRunning ? (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )}
      </button>
      <Output
        isLoading={isLoading}
        isRunning={isRunning}
        stdout={stdout}
        stderr={stderr}
      />
    </div>
  );
}
