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

    // Handle non-OK responses (404, 500 etc)
    if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            return {
                answer: "",
                error: `API returned ${response.status} (HTML). Endpoint might be wrong or server is down.`
            };
        }
        const errorData = await response.json().catch(() => ({ error: `Server error ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      answer: "",
      error: error.message || "Something went wrong"
    };
  }
}
