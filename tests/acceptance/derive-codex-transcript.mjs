import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidence = resolve(import.meta.dirname, "evidence");
const manifestPath = resolve(evidence, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const turns = manifest.entries.map((entry, index) => {
  if (entry.index !== index || entry.status !== 0) throw new Error(`invalid entry ${index}`);
  const raw = readFileSync(resolve(evidence, "raw", entry.raw));
  if (hash(raw) !== entry.sha256) throw new Error(`raw hash mismatch: ${entry.raw}`);
  const lines = raw.toString().split("\n").filter(Boolean).map(JSON.parse);
  const assistant = lines.find((line) => line.type === "item.completed" && line.item?.type === "agent_message")?.item.text;
  if (!assistant) throw new Error(`missing assistant output: ${entry.raw}`);
  return { index, user: index ? entry.args.at(-1) : null, assistant };
});
const output = { turns };
const target = resolve(evidence, "derived-transcript.json");
writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`);
manifest.derivedSha256 = hash(JSON.stringify(output, null, 2));
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${manifest.derivedSha256} ${target}`);
