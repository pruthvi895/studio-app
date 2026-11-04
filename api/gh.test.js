const assert = require("assert"), h = require("./gh.js");
function mk(method, origin, body) { const out = {code: 200, h: {}}; return [{method, headers: {origin}, body},
  {setHeader: (k, v) => out.h[k] = v, status(c) { out.code = c; return this; }, json(j) { out.j = j; return this; }, end() { return this; }}, out]; }
(async () => {
  process.env.GH_CLIENT_ID = "Iv1.x";
  let [q, r, o] = mk("POST", "https://evil.example", {op: "code"}); await h(q, r); assert.equal(o.code, 403);
  global.fetch = async (url) => ({json: async () => url.includes("device/code") ? {device_code: "d", user_code: "AB-CD", verification_uri: "v", interval: 5}
    : url.includes("access_token") ? {access_token: "t"} : {login: global.LOGIN}});
  [q, r, o] = mk("POST", "https://pruthvi895.github.io", {op: "code"}); await h(q, r); assert.equal(o.j.user_code, "AB-CD");
  global.LOGIN = "someoneelse"; [q, r, o] = mk("POST", "https://pruthvi895.github.io", {op: "token", device_code: "d"}); await h(q, r);
  assert.equal(o.code, 403); assert.ok(!o.j.access_token);
  global.LOGIN = "pruthvi895"; [q, r, o] = mk("POST", "https://pruthvi895.github.io", {op: "token", device_code: "d"}); await h(q, r);
  assert.equal(o.j.access_token, "t");
  [q, r, o] = mk("POST", "https://pruthvi895.github.io", {op: "x"}); await h(q, r); assert.equal(o.code, 400);
  console.log("proxy tests: 5 passed");
})();
