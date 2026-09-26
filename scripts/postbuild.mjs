/**

 * Post-build script.
 *
 * Copies the public stylesheet to dist/style.css after Vite finishes building.
 * Run automatically through the `build` npm script.
 */

import { copyFile, mkdir, stat } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const source = join(root, "src", "styles", "style.css");

const destinationDir = join(root, "dist");
const destination = join(destinationDir, "style.css");

try {
  const sourceInfo = await stat(source);

  if (!sourceInfo.isFile()) {
    throw new Error("source stylesheet is not a file");
  }

  await mkdir(destinationDir, {
    recursive: true,
  });

  await copyFile(source, destination);

  console.log("✓ Copied src/styles/style.css → dist/style.css");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`✗ Failed to copy stylesheet to dist/style.css: ${message}`);

  process.exit(1);
}
