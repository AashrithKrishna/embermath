import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const children = []
let shuttingDown = false

function run(name, command, args, color) {
  const child = spawn(command, args, { cwd: root, env: process.env })
  children.push(child)
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `
  const pipe = (stream) => {
    stream.setEncoding("utf8")
    let buffer = ""
    stream.on("data", (chunk) => {
      buffer += chunk
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) process.stdout.write(prefix + line + "\n")
    })
  }
  pipe(child.stdout)
  pipe(child.stderr)
  child.on("exit", (code) => {
    if (!shuttingDown) {
      process.stdout.write(`${prefix}exited (${code}); stopping dev servers\n`)
      shutdown()
    }
  })
  return child
}

function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill("SIGTERM")
  setTimeout(() => process.exit(0), 300)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

run("api", process.execPath, ["server/index.mjs"], "36")
run("ui", process.execPath, ["node_modules/vite/bin/vite.js"], "35")