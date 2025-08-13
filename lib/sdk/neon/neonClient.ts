"use server";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
// Lazily error only when SQL is actually used, so the app can boot without a DB
// connection in environments where DATABASE_URL isn't configured.
const missingDb = () => {
  throw new Error(
    "DATABASE_URL is not set. Please define it in your .env.local file."
  );
};

const sql = databaseUrl ? neon(databaseUrl) : (missingDb as unknown as ReturnType<typeof neon>);

export default sql;
