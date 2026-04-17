import { RootCause, ActionPlan, Problem } from "@/src/lib/supabase";

export interface ConsultationResponse {
  answer: string;
  error?: string;
}

export async function consultProblem(
  userId: string,
  problem: Problem,
  causes: RootCause[],
  plans: ActionPlan[],
  question: string
): Promise<ConsultationResponse> {
  const context = {
    problem: {
      title: problem.title,
      category: problem.category,
      context: problem.context,
      impact: problem.impact,
      significance: problem.significance,
      status: problem.status
    },
    rootCauses: causes.map(c => ({
      cause: c.cause,
      status: c.status,
      isHighlighted: c.is_highlighted
    })),
    actionPlans: plans.map(p => ({
      description: p.description,
      status: p.status,
      isControllable: p.is_controllable,
      isFeasible: p.is_feasible,
      notes: p.notes,
      date: p.scheduled_date
    }))
  };

  try {
    const response = await fetch("/api/consult-problem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        problemId: problem.id,
        context,
        question
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to get consultation");
    }

    return data;
  } catch (error: any) {
    return {
      answer: "",
      error: error.message || "Something went wrong"
    };
  }
}
