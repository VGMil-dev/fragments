import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const config = await readFile(new URL("./nginx.conf", import.meta.url), "utf8");

test("access logs omit request URLs, client identifiers, and referrers", () => {
  assert.match(config, /log_format\s+fragments_safe\s+escape=json/);
  assert.match(config, /access_log\s+\/dev\/stdout\s+fragments_safe/);
  const logFormat = config.match(/log_format\s+fragments_safe[^;]*;/)?.[0] ?? "";
  const variables = new Set([...logFormat.matchAll(/\$[a-z_]+/g)].map((match) => match[0]));
  for (const sensitive of ["$request", "$request_uri", "$uri", "$args", "$http_referer", "$remote_addr", "$http_user_agent"]) {
    assert.equal(variables.has(sensitive), false, `log format must omit ${sensitive}`);
  }
});

test("OAuth and API failures do not expose sensitive routes in proxy logs", () => {
  assert.match(config, /location\s+\^~\s+\/api\/\s*\{[^}]*error_log\s+\/dev\/null/s);
  assert.match(config, /Referrer-Policy\s+"no-referrer"\s+always/);
});

test("Better Auth receives only the Cloudflare client IP overwritten by Nginx", () => {
  assert.match(config, /proxy_set_header\s+X-Real-IP\s+\$http_cf_connecting_ip/);
  assert.match(config, /proxy_set_header\s+X-Forwarded-For\s+\$http_cf_connecting_ip/);
  assert.doesNotMatch(config, /proxy_add_x_forwarded_for/);
});
