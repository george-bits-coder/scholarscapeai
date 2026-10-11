import { fortaledetails } from "./scoredecision.ts";

export const CV_MATCH_VERSION = "scoredecision-v2";

export interface CvProjectMatch {
  score: number;
  reason: string;
}

export async function calculateCvProjectMatch(
  project: Record<string, unknown>,
  cvData: Record<string, unknown>,
): Promise<CvProjectMatch> {
  const result = await fortaledetails(
    "Evaluate how well this candidate's resume matches the project.",
    project,
    cvData,
  );

  const matchScore = Number(result.matchScore);
  if (!Number.isFinite(matchScore) || matchScore < 0 || matchScore > 100) {
    throw new Error("The project scorer returned a match score outside the 0 to 100 range.");
  }
  if (typeof result.matchReason !== "string" || !result.matchReason.trim()) {
    throw new Error("The project scorer did not return a match reason.");
  }

  return {
    score: matchScore,
    reason: result.matchReason.trim(),
  };
}

export async function calculateCvProjectMatchScore(
  project: Record<string, unknown>,
  cvData: Record<string, unknown>,
): Promise<number> {
  const match = await calculateCvProjectMatch(project, cvData);
  return match.score;
}
