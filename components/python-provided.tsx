"use client";
import { useMemo } from "react";
import { EditableCodeBlock } from "./editable-code-block";
import { StaticCodeBlock } from "./static-code-block";
import {
  type CodeFile,
  StaticMultiFileCodeBlock,
} from "./static-multi-file-code-block";

export function PythonProvidedStaticCodeBlock({
  code,
  fileName,
  dependencies = [],
  maxCodeLinesHeight,
  maxOutputLinesHeight,
}: {
  code: string;
  fileName?: string;
  dependencies?: string[];
  maxCodeLinesHeight?: number;
  maxOutputLinesHeight?: number;
}) {
  const packages = useMemo(
    () => ({
      official: ["pyodide-http"] as string[],
      micropip: dependencies,
    }),
    [dependencies],
  );

  return (
    <main>
      <StaticCodeBlock
        code={code}
        fileName={fileName}
        maxCodeLinesHeight={maxCodeLinesHeight}
        maxOutputLinesHeight={maxOutputLinesHeight}
        packages={packages}
      />
    </main>
  );
}

export function PythonProvidedStaticMultiFileCodeBlock({
  files,
  dependencies = [],
  maxCodeLinesHeight,
  maxOutputLinesHeight,
}: {
  files: CodeFile[];
  dependencies?: string[];
  maxCodeLinesHeight?: number;
  maxOutputLinesHeight?: number;
}) {
  const packages = useMemo(
    () => ({
      official: ["pyodide-http"] as string[],
      micropip: dependencies,
    }),
    [dependencies],
  );

  return (
    <main>
      <StaticMultiFileCodeBlock
        files={files}
        maxCodeLinesHeight={maxCodeLinesHeight}
        maxOutputLinesHeight={maxOutputLinesHeight}
        packages={packages}
      />
    </main>
  );
}

export function PythonProvidedEditableCodeBlock({
  code,
  dependencies,
}: {
  code: string;
  dependencies: string[];
}) {
  const packages = useMemo(
    () => ({
      official: ["pyodide-http"] as string[],
      micropip: dependencies,
    }),
    [dependencies],
  );

  return (
    <main>
      <EditableCodeBlock code={code} packages={packages} />
    </main>
  );
}
