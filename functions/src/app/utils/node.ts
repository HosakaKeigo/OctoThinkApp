// node specific functions
import fs from "node:fs";

export function loadFile(path: string): string {
	return fs.readFileSync(path, "utf8");
}
