export const supportedModel = "gpt-5.6-terra";
export const bootstrapTurns = [
  "$meta-prompt",
  "I need a fictional offline bookmark manager plan.",
  "It needs add, list, remove; no cloud sync or GUI. Decision register: target=Target Tool; budget=Prompt Budget; deliverable=plan-only output; interface=CLI-only; storage=local JSON; data-directory=per-user data directory; commands=CLI syntax; schema=bookmark fields; list=list behavior; criteria=acceptance criteria; failures=failure rules; duplicates=duplicate URL policy; normalization=URL normalization. Use exactly these Decision IDs. 덤프 끝",
];
export const decisionBank = {
  target: { match: /(?:Target Tool|target tool|Fresh Run)/i, answer: "Use Codex as the Target Tool in a Fresh Run." },
  budget: { match: /Prompt Budget/i, answer: "Use a maximum of 900 English words for the English Final Prompt." },
  deliverable: { match: /(?:plan-only|plan only|산출물 형태|implementation plan only|product-and-implementation plan)/i, answer: "Produce a response-only Markdown implementation plan with Node.js and TypeScript; do not create files or source code." },
  interface: { match: /(?:interface decision|interface be|비-GUI 인터페이스|인터페이스.*(?:결정|형태))/i, answer: "Use a CLI only; no GUI." },
  storage: { match: /(?:persistence|storage|저장)/i, answer: "Use one local JSON file in a suitable per-user data directory." },
  commands: { match: /(?:command syntax|명령.*규약|CLI command)/i, answer: "Use exactly `bookmarks add <url> [--title <title>] [--tag <tag>...]`, `bookmarks list`, and `bookmarks remove <id>`." },
  schema: { match: /(?:fields|identity|record shape|삭제 식별)/i, answer: "Use generated stable IDs, required URLs, optional title and tags, and a creation timestamp; remove only by ID." },
  list: { match: /(?:list.*(?:scope|format|behavior)|목록)/i, answer: "List every bookmark in stable creation order, with no search, tag filter, or sort options, in a human-readable table with ID, URL, title, and tags." },
  criteria: { match: /(?:Acceptance Criteria|acceptance criteria|수용 기준)/i, answer: "Adopt exact add/list/remove criteria plus URL validation and malformed JSON tests." },
  failures: { match: /(?:failure|edge|오류|실패)/i, answer: "Adopt invalid URL, missing ID, malformed JSON failures; exclude implementation, cloud, GUI, and external services." },
  duplicates: { match: /(?:duplicate|중복)/i, answer: "Reject duplicate URLs; adding an existing normalized URL must fail without changing the JSON file." },
  normalization: { match: /(?:normalization|정규화)/i, answer: "Parse every URL with the standard URL implementation and store and compare its canonical serialized URL; duplicate rejection uses that canonical form." },
  "data-directory": { match: /(?:data-directory|data directory|데이터 디렉터리)/i, answer: "Use an OS-appropriate per-user application-data directory: XDG data home on Linux, Application Support on macOS, and LocalAppData on Windows, with the JSON file under a bookmarks application folder." },
};
// Acceptance-fixture aliases only; the shipped skill intentionally has no bookmark vocabulary.
export const resolveDecisionId = (id, bank = decisionBank, resolved = []) => {
  if (resolved.includes(id) || !Object.hasOwn(bank, id)) throw new Error(`unknown or resolved Decision ID ${id}`);
  return id;
};
export const alignmentTurn = "Present the complete Alignment Gate now; all material decisions are resolved.";
export const approvalTurn = "approve";
