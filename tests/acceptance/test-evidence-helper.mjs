// Test-only mutation seam. Production callers must import validateEvidence.
import { validateEvidenceForTestOnly } from "./validate-codex-smoke.mjs";

export const validateEvidenceCandidateForTest = ({ transcript, manifest, rawFiles, derivedBytes, lock }) => validateEvidenceForTestOnly({ transcript, manifest, rawFiles, derivedBytes, testLock: lock });
