export const gateLabels = ["Goal and actor", "Deliverable and inputs", "In scope", "Exclusions", "Constraints", "Acceptance Criteria and evidence", "Failure conditions and edge cases", "Remaining assumptions"];
export const parseAlignmentGate = (text) => {
  const pairs = [...text.matchAll(/^\s*(?:-\s+)?([^:\n]+):\s*(\S.*)$/gim)].map((m) => ({ label: m[1].trim().replace(/^\*\*|\*\*$/g, ""), value: m[2].trim() }));
  if (pairs.length !== gateLabels.length) throw new Error("Alignment Gate field count");
  for (const [i, pair] of pairs.entries()) {
    if (pair.label !== gateLabels[i]) throw new Error("Alignment Gate field order or duplicate");
    if (!pair.value) throw new Error("Alignment Gate empty field");
  }
  return pairs;
};
