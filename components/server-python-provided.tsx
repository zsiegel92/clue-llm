import fs from "fs/promises";
import path from "path";
import { PythonProvidedStaticCodeBlock } from "@/components/python-provided";

export async function ServerPythonProvidedStaticCodeBlock({
  filePath,
}: {
  filePath: string;
}) {
  const code = await fs.readFile(filePath, "utf8");
  const fileName = path.basename(filePath);
  return <PythonProvidedStaticCodeBlock code={code} fileName={fileName} />;
}
