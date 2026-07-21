import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidence = resolve(import.meta.dirname, "evidence");
const manifest = JSON.parse(readFileSync(resolve(evidence, "manifest.json"), "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const turns = manifest.entries.map((entry) => {
  const raw = readFileSync(resolve(evidence, "raw", entry.raw));
  if (hash(raw) !== entry.sha256 || entry.status !== 0) throw new Error(`invalid ${entry.raw}`);
  const lines = raw.toString().split("\n").filter(Boolean).map(JSON.parse);
  const message = lines.find((line) => line.type === "item.completed" && line.item?.type === "agent_message")?.item.text;
  if (!message) throw new Error(`missing assistant output ${entry.raw}`);
  return { index: entry.index, user: entry.index ? entry.args.at(-1) : null, assistant: message };
});
const output = { provenance: { threadId: manifest.threadId, hostVersion: manifest.hostVersion, skillSha256: manifest.skillSha256, rawManifestSha256: hash(readFileSync(resolve(evidence, "manifest.json"))), redactions: manifest.redactions }, turns };
const target = resolve(evidence, "derived-transcript.json"); writeFileSync(target, JSON.stringify(output, null, 2));
console.log(`${hash(readFileSync(target))} ${target}`);
