"use strict";
const REPO = "pruthvi895/studio-cloud", API = "https://api.github.com/repos/" + REPO + "/contents/";
const FILES = ["state/youtube.json", "state/qa.json", "state/render.json", "state/schedule.json", "state/heartbeat.json",
  "state/laptop_jobs.json", "state/ig.json", "cmds/results.json", "cmds/laptop.json"];
const AUTH = "https://casebook-studio-auth.vercel.app/api/gh";
const S = {}, etag = {}; let tab = "review";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const tok = () => localStorage.getItem("pat");
const $ = id => document.getElementById(id);
const ist = s => s ? new Date(s).toLocaleString("en-IN", {timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short"}) + " IST" : "";
async function gh(path, opt = {}) {
  const h = {Authorization: "Bearer " + tok(), Accept: "application/vnd.github+json", ...(opt.headers || {})};
  return fetch(API + path, {...opt, headers: h, cache: "no-store"});
}
async function poll() {
  if (!tok()) return;
  let changed = false;
  await Promise.all(FILES.map(async f => {
    const r = await gh(f, {headers: {Accept: "application/vnd.github.raw+json", ...(etag[f] ? {"If-None-Match": etag[f]} : {})}});
    if (r.status === 401) { $("live").textContent = "token rejected - open Settings"; return; }
    if (r.status !== 200) return;
    etag[f] = r.headers.get("ETag"); S[f] = await r.json(); changed = true;
  }));
  const hb = S["state/heartbeat.json"]; $("live").textContent = "live · laptop seen " + (hb ? hb.laptop_seen.replace("T", " ").slice(0, 16) + " IST" : "never");
  if (changed) render();
}
function uid() { return Date.now().toString(36) + crypto.getRandomValues(new Uint32Array(1))[0].toString(36); }
async function send(cmd) {
  cmd.id = uid();
  const body = btoa(unescape(encodeURIComponent(JSON.stringify(cmd))));
  const r = await gh("cmds/inbox/" + cmd.id + ".json", {method: "PUT", body: JSON.stringify({message: "app: " + cmd.type, content: body})});
  alert(r.ok ? "Sent. Result shows under Activity in ~1 min." : "Failed (" + r.status + ")");
}
const vids = () => (S["state/youtube.json"] || {}).videos || [];
const T = {
  review() {
    const qa = S["state/qa.json"] || {}, up = new Set(vids().map(v => v.item_id));
    return Object.entries(qa).filter(([k]) => !up.has(k)).sort().map(([k, v]) => `<div class=c><b>${esc(k)}</b>
      <span class=${v.verdict === "approve" ? "ok" : "bad"}>${esc(v.verdict)}</span> <span class=m>p=${esc(v.p)}</span>
      <div class=m>${(v.reasons || []).map(esc).join("<br>")}</div>
      <button class=alt data-a="render" data-i="${esc(k)}">Queue re-render</button></div>`).join("") || "Nothing in review.";
  },
  scheduled() {
    return vids().map(v => `<div class=c><b>${esc(v.item_id)}</b> <span class=m>${esc(v.channel)}</span><br>
      <a href="https://youtu.be/${encodeURIComponent(v.video_id)}">youtu.be/${esc(v.video_id)}</a> · ${esc(v.privacy)} · QA ${v.qa_pass ? "<span class=ok>pass</span>" : "<span class=bad>fail</span>"}
      <div class=m>publish: ${esc(ist(v.publish_at)) || "not scheduled"}</div>
      <input type=datetime-local id="w-${esc(v.video_id)}"><button data-a="sched" data-v="${esc(v.video_id)}" data-c="${esc(v.channel)}">Approve &amp; schedule</button>
      <input id="t-${esc(v.video_id)}" placeholder="New title"><button class=alt data-a="title" data-v="${esc(v.video_id)}" data-c="${esc(v.channel)}">Save title</button></div>`).join("") || "No uploads synced yet.";
  },
  plan() {
    const p = (S["state/schedule.json"] || {}).pairs || [];
    return p.map(x => `<div class=c>Case File #${esc(x.case_file)}<br>Short ${esc(x.short)} · ${esc(ist(x.short_at))}<br>Long ${esc(x.long)} · ${esc(ist(x.long_at))}</div>`).join("");
  },
  instagram() {
    const it = ((S["state/ig.json"] || {}).items || []).filter(x => x.status !== "posted" || tab === "instagram");
    const by = ch => it.filter(x => x.channel === ch).sort((a, b) => (a.when_ist || "").localeCompare(b.when_ist || "")).slice(-60);
    return ["casebook-atlas", "tenglish-gaming"].map(ch => `<h3>@${ch.replace("-", "")}</h3>` + by(ch).map(x => `<div class=c>
      ${x.thumb ? `<img src="${esc(x.thumb)}" alt="">` : ""}<b>${esc(x.kind)}</b> · ${esc(x.status)} · ${esc(ist(x.when_ist))}
      ${x.permalink ? `<a href="${esc(x.permalink)}">open</a>` : ""}<div class=m>${esc(x.caption).slice(0, 160)}</div>
      ${x.status === "held" ? `<button data-a="ig_release" data-i="${esc(x.id)}">Release</button>` : ""}
      ${["queued", "retry"].includes(x.status) ? `<button class=warn data-a="ig_hold" data-i="${esc(x.id)}">Hold</button>` : ""}
      ${["queued", "retry", "held"].includes(x.status) ? `<button class=alt data-a="ig_caption" data-i="${esc(x.id)}">Edit caption</button>` : ""}</div>`).join("")).join("");
  },
  render() {
    const r = S["state/render.json"] || {}, lj = S["state/laptop_jobs.json"] || {}, q = S["cmds/laptop.json"] || [];
    return `<div class=c><b>GPU now:</b> ${esc(JSON.stringify(r.gpu_holder || "idle"))}<br><span class=m>waiting: ${(r.waiting || []).length}</span></div>
      <div class=c><b>Queue a render</b><input id=ri placeholder="item id, e.g. w14-long"><button data-a="render">Queue</button></div>
      <h3>From this app</h3>${q.map(j => `<div class=c>${esc(j.type)} ${esc(j.item_id || j.text)} · <b>${esc((lj[j.id] || {}).status || j.status)}</b></div>`).join("")}
      <h3>Render log</h3>${(r.ordered_queue_log || []).slice().reverse().map(e => `<div class=m>${esc(JSON.stringify(e))}</div>`).join("")}`;
  },
  instruct() {
    return `<div class=c><textarea id=nt rows=5 placeholder="Instruction for the studio agent"></textarea><button data-a="note">Send</button></div>`;
  },
  activity() {
    return Object.entries(S["cmds/results.json"] || {}).reverse().slice(0, 80).map(([k, v]) =>
      `<div class=c>${esc(v.type)} · <span class=${v.ok ? "ok" : "bad"}>${esc(v.msg)}</span><div class=m>${esc(ist(v.at))}</div></div>`).join("") || "No commands yet.";
  },
  settings() {
    return `<div class=c>${tok() ? "Signed in." : "Sign in to open your studio."}
      <button data-a="signin">Sign in with GitHub</button> <button class=warn data-a="logout">Sign out</button><div id=sc class=m></div></div>`;
  }
};
function render() {
  if (!tok()) tab = "settings";
  $("nav").innerHTML = Object.keys(T).map(k => `<button class="${k === tab ? "on" : "alt"}" data-tab="${k}">${k}</button>`).join(" ");
  $("main").innerHTML = T[tab]();
}
document.addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.tab) { tab = b.dataset.tab; return render(); }
  const a = b.dataset.a, d = b.dataset;
  if (a === "signin") return signin();
  if (a === "logout") { localStorage.removeItem("pat"); return render(); }
  if (a === "sched") {
    const w = $("w-" + d.v).value; if (!w) return alert("Pick a date/time");
    if (!confirm("Approve and schedule this video to go public at " + w + " IST?")) return;
    return send({type: "yt_schedule", channel: d.c, video_id: d.v, publish_at: w + ":00+05:30", approve: true});
  }
  if (a === "title") return send({type: "yt_title", channel: d.c, video_id: d.v, title: $("t-" + d.v).value});
  if (a === "ig_hold" || a === "ig_release") return send({type: a, item: d.i});
  if (a === "ig_caption") { const c = prompt("New caption"); if (c) return send({type: a, item: d.i, caption: c}); return; }
  if (a === "render") { const i = d.i || $("ri").value.trim(); if (i && confirm("Queue render of " + i + "?")) return send({type: "render", item_id: i}); return; }
  if (a === "note") return send({type: "note", text: $("nt").value});
});
async function auth(body) {
  const r = await fetch(AUTH, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
  return r.json();
}
async function signin() {
  const c = await auth({op: "code"}); if (!c.user_code) return alert("Sign-in unavailable");
  $("sc").innerHTML = `Code <b>${esc(c.user_code)}</b> (copied). Approve it on GitHub, then come back.`;
  try { await navigator.clipboard.writeText(c.user_code); } catch (e) {}
  window.open("https://github.com/login/device", "_blank");
  for (let i = 0; i < 180; i++) {
    await new Promise(r => setTimeout(r, ((c.interval || 5) + 1) * 1000));
    const t = await auth({op: "token", device_code: c.device_code});
    if (t.access_token) { localStorage.setItem("pat", t.access_token); tab = "review"; render(); return poll(); }
    if (t.error || ["expired_token", "access_denied"].includes(t.pending)) return ($("sc").textContent = "Sign-in failed: " + (t.error || t.pending));
  }
}
render(); poll(); setInterval(poll, 15000);
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && poll());
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");
