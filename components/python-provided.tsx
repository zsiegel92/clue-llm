"use client";

import { PythonProvider } from "react-py";
import { EditableCodeBlock } from "./editable-code-block";
import { StaticCodeBlock } from "./static-code-block";

export function PythonProvidedStaticCodeBlock({ code }: { code: string }) {
  return (
    <PythonProvider>
      <main>
        <StaticCodeBlock code={code} />
      </main>
    </PythonProvider>
  );
}

export function PythonProvidedEditableCodeBlock({ code }: { code: string }) {
  return (
    <PythonProvider>
      <main>
        <EditableCodeBlock code={code} />
      </main>
    </PythonProvider>
  );
}
