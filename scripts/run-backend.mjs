// Starts the FastAPI backend with the Python inside .venv - works on Windows, macOS and Linux.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const candidates = [
  join(root, ".venv", "Scripts", "python.exe"), // Windows
  join(root, ".venv", "bin", "python"), // macOS / Linux
];
const python = candidates.find((p) => existsSync(p));
if (!python) {
  console.error("Could not find the Python virtual environment (.venv). Create it first - see README.md, step 3.");
  process.exit(1);
}
const args = ["-m", "uvicorn", "api:app", "--app-dir", "ml-backend", "--reload", "--host", "127.0.0.1", "--port", "8000"];
const child = spawn(python, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
