export const gateLabels = ["Goal and actor", "Deliverable and inputs", "In scope", "Exclusions", "Constraints", "Acceptance Criteria and evidence", "Failure conditions and edge cases", "Remaining assumptions"];
export const parseAlignmentGate = (text) => {
  const lines = text.split("\n");
  for (const label of gateLabels) {
    if (lines.some((line) => new RegExp(`^[ \\t-]+${label}:`).test(line))) throw new Error("Alignment Gate non-top-level field");
  }
  const pairs = lines.filter((line) => /^[^ \t][^:\n]*:/.test(line)).map((line) => {
    const [label, ...rest] = line.split(":"); return { label, value: rest.join(":").trim() };
  });
  if (pairs.length !== gateLabels.length) throw new Error("Alignment Gate field count");
  for (const [i, pair] of pairs.entries()) {
    if (pair.label !== gateLabels[i]) throw new Error("Alignment Gate field order or duplicate");
    if (!pair.value) throw new Error("Alignment Gate empty field");
  }
  return pairs;
};
