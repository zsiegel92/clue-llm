"use client";
import { PythonProvider } from "react-py";
import { EditableCodeBlock } from "./editable-code-block";
import { StaticCodeBlock } from "./static-code-block";

export function PythonProvidedStaticCodeBlock({
  code,
  fileName,
  dependencies,
}: {
  code: string;
  fileName?: string;
  dependencies: string[];
}) {
  return (
    <PythonProvider
      packages={{
        official: ["pyodide-http"],
        micropip: dependencies,
      }}
    >
      <main>
        <StaticCodeBlock code={code} fileName={fileName} />
      </main>
    </PythonProvider>
  );
}

export function PythonProvidedEditableCodeBlock({ code }: { code: string }) {
  return (
    <PythonProvider
      lazy={false}
      packages={{
        official: ["pyodide-http"],
      }}
    >
      <main>
        <EditableCodeBlock code={code} />
      </main>
    </PythonProvider>
  );
}
