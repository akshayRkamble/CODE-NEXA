export function allowsFullSolution(question: string, submittedAttempts: number): boolean {
  const explicitlyRequested = /\b(full|complete|entire)\s+(solution|code)\b|\b(show|give|provide|write)\s+(me\s+)?(the\s+)?(full\s+)?(solution|code)\b/i.test(question);
  return explicitlyRequested && submittedAttempts >= 2;
}
