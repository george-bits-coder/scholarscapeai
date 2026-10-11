import "dotenv/config";
import OpenAI from "openai";

interface DecisionDetails {
  title: string;
  description: string;
  validProject: "yes" | "no";
  requiredSkills?: string[];
  compensation?: number | null;
  timeline?: string;
  status?: "planning" | "active" | "in_review" | "completed";
  remote?: boolean;
  location?: string;
  flyerUrl?: string;
  matchScore: number;
  matchReason: string;
}

// Use the same shape as DecisionDetails so it can be spread safely
const fallbackDetails: DecisionDetails = {
  title: "",
  description: "",
  validProject: "no",
  requiredSkills: [],
  compensation: null,
  timeline: "",
  // status omitted (optional) — avoids invalid "" literal
  remote: false,
  location: "",
  flyerUrl: "",
  matchScore: 0,
  matchReason: "",
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.apikey5,
});

function looksLikeValidProject(
  details: Pick<DecisionDetails, "title" | "description">,
): boolean {
  const title = details.title.trim();
  const description = details.description.trim();
  const titleWords = title.split(/\s+/).filter(Boolean);
  const titleHasLetters = /[a-z]/i.test(title);
  const titleHasVowel = /[aeiou]/i.test(title);
  const titleHasRepeatedCharacter = /(.)\1/i.test(title);

  return (
    title.length >= 4 &&
    titleHasLetters &&
    titleHasVowel &&
    !titleHasRepeatedCharacter &&
    (titleWords.length >= 2 || title.length >= 6) &&
    description.length >= 20
  );
}

function computeFallbackMatchScore(
  project: unknown,
  resume: unknown,
): { score: number; reason: string } {
  const projectText = JSON.stringify(project).toLowerCase();
  const resumeText = JSON.stringify(resume).toLowerCase();

  const tokenize = (s: string) =>
    new Set(
      s
        .replace(/[^a-z0-9+#.\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3),
    );

  const projectTokens = tokenize(projectText);
  const resumeTokens = tokenize(resumeText);

  let overlap = 0;
  for (const t of projectTokens) if (resumeTokens.has(t)) overlap++;

  const denom = Math.max(projectTokens.size, 1);
  const raw = overlap / denom;

  const score = Math.round(Math.min(100, raw * 150));

  return {
    score,
    reason: `Fallback lexical overlap: ${overlap}/${denom} project tokens found in resume.`,
  };
}

export async function fortaledetails(
  discussion: string,
  project: unknown,
  resume: unknown,
): Promise<DecisionDetails> {
  try {
    const projectJson = JSON.stringify(project, null, 2);
    const resumeJson = JSON.stringify(resume, null, 2);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that extracts research project details from discussions and scores how well a candidate's resume matches a project. " +
            "The resume JSON keys can vary between resumes, so read it semantically rather than assuming a fixed schema. " +
            "Score matchScore as an integer from 0 (no fit) to 100 (perfect fit), weighting required skills, seniority, domain experience, and location/remote constraints. " +
            "Provide a concise matchReason (1–3 sentences).",
        },
        {
          role: "user",
          content:
            `Extract the research project details from the following discussion:\n${discussion}\n\n` +
            `PROJECT JSON:\n${projectJson}\n\n` +
            `RESUME JSON:\n${resumeJson}\n\n` +
            `Return the extracted details and a matchScore (0–100) with a short matchReason.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "printdetails",
            description:
              "Extracts project specifics, indicates whether the project looks valid, and returns a 0–100 match score between the resume and the project.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The research project title." },
                description: {
                  type: "string",
                  description: "The research project description.",
                },
                validProject: {
                  type: "string",
                  enum: ["yes", "no"],
                  description:
                    "Whether the extracted title and description look like a real research project.",
                },
                requiredSkills: {
                  type: "array",
                  items: { type: "string" },
                  description: "Skills required for the research project.",
                },
                compensation: {
                  type: ["number", "null"],
                  description: "The project compensation, if provided.",
                },
                timeline: {
                  type: "string",
                  description: "The project timeline, if provided.",
                },
                status: {
                  type: "string",
                  enum: ["planning", "active", "in_review", "completed"],
                  description: "The project status, if provided.",
                },
                remote: {
                  type: "boolean",
                  description: "Whether the project is remote, if provided.",
                },
                location: {
                  type: "string",
                  description: "The project location, if provided.",
                },
                flyerUrl: {
                  type: "string",
                  description: "The project flyer URL, if provided.",
                },
                matchScore: {
                  type: "integer",
                  minimum: 0,
                  maximum: 100,
                  description:
                    "How well the resume matches the project, as an integer from 0 to 100.",
                },
                matchReason: {
                  type: "string",
                  description:
                    "A short explanation (1–3 sentences) for the matchScore.",
                },
              },
              required: [
                "title",
                "description",
                "validProject",
                "matchScore",
                "matchReason",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "printdetails" },
      },
      temperature: 0.2,
    });

    const message = response.choices[0]?.message;
    const toolCall = message?.tool_calls?.[0];

    if (
      toolCall?.type === "function" &&
      toolCall.function.name === "printdetails"
    ) {
      const parsed = JSON.parse(toolCall.function.arguments) as DecisionDetails;

      const score = Number(parsed.matchScore);
      const validScore =
        Number.isFinite(score) && score >= 0 && score <= 100
          ? Math.round(score)
          : null;

      const { score: fallbackScore, reason: fallbackReason } =
        computeFallbackMatchScore(project, resume);

      return {
        ...parsed,
        validProject: looksLikeValidProject(parsed) ? "yes" : "no",
        matchScore: validScore ?? fallbackScore,
        matchReason:
          parsed.matchReason?.trim() ||
          (validScore === null ? fallbackReason : ""),
      };
    }

    const { score, reason } = computeFallbackMatchScore(project, resume);
    return {
      ...fallbackDetails,
      matchScore: score,
      matchReason: reason,
    };
  } catch (error) {
    console.error("Error extracting discussion details:", error);
    const { score, reason } = computeFallbackMatchScore(project, resume);
    return {
      ...fallbackDetails,
      matchScore: score,
      matchReason: reason,
    };
  }
}