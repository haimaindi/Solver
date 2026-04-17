// Service for AI-related operations
// Deprecated: Moving to client-side prompt generation

export const consultProblem = async (_userId: string, _problem: any, _causes: any[], _plans: any[], _question: string) => {
  return { answer: "AI service is disabled. Please use the Prompt Maker feature." };
};
