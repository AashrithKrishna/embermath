import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/mysql2"
import * as schema from "../drizzle/schema.ts"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const envPath = path.join(root, ".env")
if (existsSync(envPath)) process.loadEnvFile(envPath)

export const DATABASE_URL =
  process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3307/question_bank"

const url = new URL(DATABASE_URL)

export const pool = mysql.createPool({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username || "root"),
  password: decodeURIComponent(url.password || ""),
  database: url.pathname.replace(/^\//, ""),
  charset: "utf8mb4",
  connectionLimit: 5,
  waitForConnections: true,
})

export const db = drizzle(pool, { schema, mode: "default" })
export { schema }