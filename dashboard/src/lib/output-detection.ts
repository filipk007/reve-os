export type OutputType = "email" | "research" | "score" | "generic";

export function detectOutputType(result: Record<string, unknown>): OutputType {
  const keys = Object.keys(result);
  const keySet = new Set(keys.map((k) => k.toLowerCase()));

  // Email: has subject AND (body OR email_body)
  if (
    keySet.has("subject") &&
    (keySet.has("body") || keySet.has("email_body"))
  ) {
    return "email";
  }

  // Research: has summary AND (key_findings OR highlights OR sections)
  if (
    keySet.has("summary") &&
    (keySet.has("key_findings") ||
      keySet.has("highlights") ||
      keySet.has("sections"))
  ) {
    return "research";
  }

  // Score: 2+ keys matching *_score or *_confidence
  const scoreKeys = keys.filter(
    (k) => /_score$/i.test(k) || /_confidence$/i.test(k)
  );
  if (scoreKeys.length >= 2) {
    return "score";
  }

  return "generic";
}
