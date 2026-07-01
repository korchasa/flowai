const url = Deno.env.get("TZDB_SERVICE_URL");

Deno.test("tzdb sync: live service roundtrip (CI-only)", async () => {
  if (!url) {
    throw new Error(
      "TZDB_SERVICE_URL is not set — integration tests run only in CI. " +
        "Run unit modules individually: deno test tests/<module>_test.ts",
    );
  }
  const res = await fetch(`${url}/health`);
  if (!res.ok) throw new Error(`tzdb service unhealthy: ${res.status}`);
  await res.body?.cancel();
});
