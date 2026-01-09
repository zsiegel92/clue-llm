import { PythonProvidedStaticCodeBlock } from "@/components/python-provided";

export async function ServerPythonProvidedStaticCodeBlock({
  code,
}: {
  code: string;
}) {
  return <PythonProvidedStaticCodeBlock code={code} />;
}
