// Run with: node --env-file=.env scripts/cloudflare-status.mjs
// Prints resource names and status only; never prints credentials or customer data.
const {
  CLOUDFLARE_API_TOKEN: token,
  CLOUDFLARE_ACCOUNT_ID: account,
  CLOUDFLARE_D1_DATABASE_ID: database,
} = process.env;
if (!token || !account || !database)
  throw new Error("Set the three Cloudflare variables in the root .env file.");
const headers = { Authorization: `Bearer ${token}` };
for (const [label, path] of [
  ["workers", `/accounts/${account}/workers/scripts`],
  ["database", `/accounts/${account}/d1/database/${database}`],
  ["domains", `/accounts/${account}/workers/domains`],
  ["apiSecrets", `/accounts/${account}/workers/scripts/matrizo-api/secrets`],
]) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!data.success) {
    console.log(
      JSON.stringify({
        label,
        status: response.status,
        success: false,
        errors: data.errors?.map((e) => e.message),
      }),
    );
    continue;
  }
  const result =
    label === "workers"
      ? data.result.map((v) => ({ name: v.id, modified: v.modified_on }))
      : label === "domains"
        ? data.result.map((v) => ({ hostname: v.hostname, service: v.service }))
        : label === "apiSecrets"
          ? data.result.map((v) => v.name)
          : { name: data.result.name };
  console.log(JSON.stringify({ label, success: true, result }));
}
