import "dotenv/config";
import OpenAI from "openai";

interface DecisionDetails {
  title: string;
  description: string;
  validProject: "yes" | "no";
  validationReason: string;
  requiredSkills?: string[];
  compensation?: number | null;
  timeline?: string;
  status?: "planning" | "active" | "in_review" | "completed";
  remote?: boolean;
  location?: string;
  flyerUrl?: string;
}

interface FallbackDetails {
  title: "";
  description: "";
  validProject: "no";
  validationReason: string;
  requiredSkills: string[];
  compensation: null;
  timeline: "";
  status: "";
  remote: false;
  location: "";
  flyerUrl: "";
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.apikey5,
});

const fallbackDetails: FallbackDetails = {
  title: "",
  description: "",
  validProject: "no",
  validationReason: "AI validation could not be completed. Please try again.",
  requiredSkills: [],
  compensation: null,
  timeline: "",
  status: "",
  remote: false,
  location: "",
  flyerUrl: "",
};

function getProjectValidationReason(
  details: Pick<DecisionDetails, "title" | "description">,
): string | null {
  const title = details.title.trim();
  const description = details.description.trim();
  const titleWords = title.split(/\s+/).filter(Boolean);
  const titleHasLetters = /[a-z]/i.test(title);
  const titleHasVowel = /[aeiou]/i.test(title);

  if (title.length < 4) return "The project title is too short.";
  if (!titleHasLetters || !titleHasVowel) return "The project title does not appear to be meaningful text.";
  if (titleWords.length < 2 && title.length < 6) return "The project title needs at least two words or six characters.";
  if (description.length < 20) return "The project description is too short to explain the research work.";
  return null;
}

export async function fortaledetails(
  discussion: string,
): Promise<DecisionDetails | FallbackDetails> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You extract research project details and validate that the discussion describes a genuine research project. If validProject is no, explain the specific reason in validationReason. If validProject is yes, set validationReason to an empty string.",
        },
        {
          role: "user",
          content: `Extract the research project details from the following discussion: ${discussion}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "printdetails",
            description:
              "Extracts project specifics and indicates whether the project looks valid based on those details.",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "The research project title.",
                },
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
                validationReason: {
                  type: "string",
                  description: "If validProject is no, explain the specific reason it is not a valid research project; otherwise use an empty string.",
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
              },
              required: ["title", "description", "validProject", "validationReason"],
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

    if (toolCall?.type === "function" && toolCall.function.name === "printdetails") {
      const details = JSON.parse(toolCall.function.arguments) as DecisionDetails;
      const localValidationReason = getProjectValidationReason(details);
      const validProject = details.validProject === "yes" && !localValidationReason;
      return {
        ...details,
        validProject: validProject ? "yes" : "no",
        validationReason: validProject
          ? ""
          : localValidationReason || details.validationReason?.trim() || "The AI validator determined this does not appear to be a valid research project.",
      };
    }

    return fallbackDetails;
  } catch (error) {
    console.error("Error extracting discussion details:", error);
    return fallbackDetails;
  }
}