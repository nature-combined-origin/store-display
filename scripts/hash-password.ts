import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}

async function main() {
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Bcrypt Hash: ${hash}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
