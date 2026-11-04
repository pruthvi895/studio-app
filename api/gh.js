// Tiny device-flow proxy (GitHub's OAuth endpoints have no CORS). Holds no secret: device flow on a public
// GitHub App client needs only the client_id. Returns a token only if it belongs to the allowed user.
const ORIGIN = "https://pruthvi895.github.io", ALLOWED = "pruthvi895";
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST" || req.headers.origin !== ORIGIN) return res.status(403).json({error: "forbidden"});
  const cid = process.env.GH_CLIENT_ID, b = req.body || {};
  const post = (url, form) => fetch(url, {method: "POST", headers: {Accept: "application/json"},
    body: new URLSearchParams({client_id: cid, ...form})}).then(r => r.json());
  try {
    if (b.op === "code") {
      const r = await post("https://github.com/login/device/code", {});
      return res.json({device_code: r.device_code, user_code: r.user_code, verification_uri: r.verification_uri, interval: r.interval});
    }
    if (b.op === "token" && typeof b.device_code === "string") {
      const r = await post("https://github.com/login/oauth/access_token",
        {device_code: b.device_code, grant_type: "urn:ietf:params:oauth:grant-type:device_code"});
      if (!r.access_token) return res.json({pending: r.error || "error"});
      const u = await fetch("https://api.github.com/user", {headers: {Authorization: "Bearer " + r.access_token}}).then(x => x.json());
      if (u.login !== ALLOWED) return res.status(403).json({error: "this app is private"});
      return res.json({access_token: r.access_token});
    }
    return res.status(400).json({error: "bad request"});
  } catch (e) { return res.status(502).json({error: "upstream"}); }
};
