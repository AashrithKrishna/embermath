import path from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/mysql2/migrator"
import { db, pool } from "../server/db.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

await migrate(db, { migrationsFolder: path.join(root, "drizzle", "migrations") })
console.log("Migrations applied successfully.")
await pool.end()