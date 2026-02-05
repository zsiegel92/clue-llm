"use client";
import { PythonProvider } from "react-py";
import { EditableCodeBlock } from "./editable-code-block";
import { StaticCodeBlock } from "./static-code-block";
import {
  type CodeFile,
  StaticMultiFileCodeBlock,
} from "./static-multi-file-code-block";

export function PythonProvidedStaticCodeBlock({
  code,
  fileName,
  dependencies,
  maxCodeLinesHeight,
  maxOutputLinesHeight,
}: {
  code: string;
  fileName?: string;
  dependencies: string[];
  maxCodeLinesHeight?: number;
  maxOutputLinesHeight?: number;
}) {
  return (
    <PythonProvider
      packages={{
        official: ["pyodide-http"],
        micropip: dependencies,
      }}
    >
      <main>
        <StaticCodeBlock
          code={code}
          fileName={fileName}
          maxCodeLinesHeight={maxCodeLinesHeight}
          maxOutputLinesHeight={maxOutputLinesHeight}
        />
      </main>
    </PythonProvider>
  );
}

export function PythonProvidedStaticMultiFileCodeBlock({
  files,
  dependencies,
  maxCodeLinesHeight,
  maxOutputLinesHeight,
}: {
  files: CodeFile[];
  dependencies: string[];
  maxCodeLinesHeight?: number;
  maxOutputLinesHeight?: number;
}) {
  return (
    <PythonProvider
      packages={{
        official: ["pyodide-http"],
        micropip: dependencies,
      }}
    >
      <main>
        <StaticMultiFileCodeBlock
          files={files}
          maxCodeLinesHeight={maxCodeLinesHeight}
          maxOutputLinesHeight={maxOutputLinesHeight}
        />
      </main>
    </PythonProvider>
  );
}

export function PythonProvidedEditableCodeBlock({
  code,
  dependencies,
}: {
  code: string;
  dependencies: string[];
}) {
  return (
    <PythonProvider
      lazy={false}
      packages={{
        official: ["pyodide-http"],
        micropip: dependencies,
      }}
    >
      <main>
        <EditableCodeBlock code={code} />
      </main>
    </PythonProvider>
  );
}
