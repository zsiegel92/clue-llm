"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePython } from "react-py";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface CodeFile {
  name: string;
  content: string;
  isEntrypoint?: boolean;
}

function Output({
  isLoading,
  isRunning,
  stdout,
  stderr,
  maxOutputLinesHeight,
}: {
  isLoading: boolean;
  isRunning: boolean;
  stdout: string;
  stderr: string;
  maxOutputLinesHeight: number;
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

  const stdoutLines = stdout.split("\n").length;
  const stderrLines = stderr.split("\n").length;
  const totalLines = (stdout ? stdoutLines : 0) + (stderr ? stderrLines : 0);

  const maxHeight =
    totalLines > maxOutputLinesHeight
      ? `${maxOutputLinesHeight * 1.5}rem`
      : undefined;

  return (
    <div
      className="output"
      style={{
        maxHeight,
        overflowY: maxHeight ? "auto" : undefined,
        fontFamily: "monospace",
      }}
    >
      {stdout && <pre className="output__stdout">{stdout}</pre>}
      {stderr && <pre className="output__stderr">{stderr}</pre>}
    </div>
  );
}

export function StaticMultiFileCodeBlock({
  files,
  maxCodeLinesHeight = 20,
  maxOutputLinesHeight = 10,
}: {
  files: CodeFile[];
  maxCodeLinesHeight?: number;
  maxOutputLinesHeight?: number;
}) {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const { runPython, stdout, stderr, isLoading, isRunning, isReady } =
    usePython();
  const hasRunRef = useRef(false);

  const selectedFile = files[selectedFileIndex];
  const entrypointFile = files.find((f) => f.isEntrypoint) ?? files[0];

  // biome-ignore lint/correctness/useExhaustiveDependencies: runPython is unstable and causes infinite re-renders
  const handleRun = useCallback(async () => {
    if (!isReady || isLoading || isRunning) return;

    try {
      // First, write all files to the pyodide virtual filesystem
      // We need to create directories and write files using Python's pathlib
      const setupCode = `
import os
from pathlib import Path
`;
      await runPython(setupCode);

      for (const file of files) {
        // Create parent directories
        const dirPath = file.name.includes("/")
          ? file.name.substring(0, file.name.lastIndexOf("/"))
          : "";

        if (dirPath) {
          const mkdirCode = `
Path(${JSON.stringify(dirPath)}).mkdir(parents=True, exist_ok=True)
`;
          await runPython(mkdirCode);
        }

        // Write the file - we need to properly escape the content
        const writeFileCode = `
with open(${JSON.stringify(file.name)}, 'w') as f:
    f.write(${JSON.stringify(file.content)})
`;
        await runPython(writeFileCode);
      }

      // Now run the entrypoint file
      if (!entrypointFile) return;

      // Execute the entrypoint file
      const runCode = `
with open(${JSON.stringify(entrypointFile.name)}, 'r') as f:
    exec(f.read())
`;
      await runPython(runCode);
    } catch (error) {
      console.error("Error running Python code:", error);
    }
  }, [files, entrypointFile, isReady, isLoading, isRunning]);

  useEffect(() => {
    if (isReady && !hasRunRef.current) {
      hasRunRef.current = true;
      handleRun();
    }
  }, [isReady, handleRun]);

  if (!selectedFile) {
    return <div>No files provided</div>;
  }

  const displayCode = selectedFile.content;
  const codeLines = displayCode.split("\n").length;

  const codeMaxHeight =
    codeLines > maxCodeLinesHeight
      ? `${maxCodeLinesHeight * 1.7 * 0.875}rem`
      : undefined;

  return (
    <div className="code-block relative border border-gray-700 rounded-lg overflow-hidden">
      {/* File tabs */}
      <div className="flex gap-0 bg-gray-900 border-b border-gray-700 overflow-x-auto">
        {files.map((file, index) => (
          <button
            key={file.name}
            type="button"
            onClick={() => setSelectedFileIndex(index)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              index === selectedFileIndex
                ? "bg-gray-800 text-white border-b-2 border-blue-500"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
            } ${file.isEntrypoint ? "font-bold" : ""}`}
            title={file.isEntrypoint ? `${file.name} (entrypoint)` : file.name}
          >
            {file.name}
            {file.isEntrypoint && (
              <span className="ml-1 text-xs text-blue-400">▶</span>
            )}
          </button>
        ))}
      </div>

      {/* Code display */}
      <div className="relative">
        <SyntaxHighlighter
          wrapLines={true}
          language={selectedFile.name.endsWith(".py") ? "python" : "json"}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: "1rem",
            borderRadius: 0,
            fontSize: "0.875rem",
            lineHeight: 1.7,
            maxHeight: codeMaxHeight,
            overflowY: codeMaxHeight ? "auto" : undefined,
          }}
        >
          {displayCode}
        </SyntaxHighlighter>
        <button
          type="button"
          onClick={handleRun}
          disabled={isLoading || isRunning || !isReady}
          className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800/90 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
          title="Run code"
        >
          {isRunning ? (
            <svg
              role="img"
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Running"
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
              role="img"
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-label="Run"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Output */}
      <Output
        isLoading={isLoading}
        isRunning={isRunning}
        stdout={stdout}
        stderr={stderr}
        maxOutputLinesHeight={maxOutputLinesHeight}
      />
    </div>
  );
}
