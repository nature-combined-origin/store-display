import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const password = process.argv[2];

function escapeForLocalEnv(value: string): string {
  return value.replace(/\$/g, "\\$");
}

async function main() {
  const sessionSecret = randomBytes(32).toString("hex");

  console.log("=== ADMIN_SESSION_SECRET ===");
  console.log(sessionSecret);
  console.log("");
  console.log(".env.local:");
  console.log(`ADMIN_SESSION_SECRET=${sessionSecret}`);
  console.log("");
  console.log("Vercel Dashboard:");
  console.log(`ADMIN_SESSION_SECRET=${sessionSecret}`);
  console.log("");

  if (!password) {
    console.log("Password hash skipped. Pass a PIN to also generate ADMIN_PASSWORD_HASH:");
    console.log("  npm run generate-admin-secrets -- 1234");
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const localHash = escapeForLocalEnv(hash);

  console.log("=== ADMIN_PASSWORD_HASH ===");
  console.log(`Password: ${password}`);
  console.log("");
  console.log(".env.local (escape $ as \\$):");
  console.log(`ADMIN_PASSWORD_HASH=${localHash}`);
  console.log("");
  console.log("Vercel Dashboard (no backslashes):");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
