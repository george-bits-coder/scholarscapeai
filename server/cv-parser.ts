import mammoth from "mammoth";
import pdfParse from "pdf-parse";

const MAX_TEXT_LENGTH = 30000;
const MATCH_STOP_WORDS = new Set([
  "about", "and", "are", "for", "from", "have", "into", "our", "project", "research",
  "that", "the", "their", "this", "with", "will", "work", "you",
]);

function invalidCvError(message: string) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function readSection(lines: string[], headings: RegExp[]): string[] {
  const start = lines.findIndex((line) => headings.some((heading) => heading.test(line.trim().replace(/:$/, ""))));
  if (start < 0) return [];

  const sectionHeadings = [
    /^(professional\s+)?summary$/i,
    /^(career\s+)?objective$/i,
    /^profile$/i,
    /^skills?(\s+and\s+expertise)?$/i,
    /^(work\s+)?experience$/i,
    /^employment(\s+history)?$/i,
    /^education(\s+and\s+qualifications)?$/i,
    /^projects?$/i,
    /^certifications?$/i,
    /^publications?$/i,
    /^awards?$/i,
    /^interests?$/i,
    /^references$/i,
  ];
  const end = lines.findIndex((line, index) =>
    index > start && sectionHeadings.some((heading) => heading.test(line.trim().replace(/:$/, ""))),
  );
  return lines.slice(start + 1, end < 0 ? undefined : end).filter(Boolean);
}

export async function parseCv(file: Express.Multer.File) {
  const extension = file.originalname.toLowerCase().split(".").pop();
  let text = "";

  if (extension === "pdf") {
    if (file.buffer.subarray(0, 5).toString() !== "%PDF-") {
      throw invalidCvError("The uploaded file is not a valid PDF.");
    }
    try {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } catch {
      throw invalidCvError("Unable to read the uploaded PDF. Please upload a valid PDF.");
    }
  } else if (extension === "docx") {
    if (file.buffer.subarray(0, 2).toString() !== "PK") {
      throw invalidCvError("The uploaded file is not a valid DOCX document.");
    }
    try {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      text = parsed.value;
    } catch {
      throw invalidCvError("Unable to read the uploaded DOCX. Please upload a valid DOCX document.");
    }
  } else {
    throw invalidCvError("CV must be a PDF or DOCX file.");
  }

  const boundedText = text.slice(0, MAX_TEXT_LENGTH);
  const lines = boundedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalizedText = lines.join("\n");
  if (!normalizedText) {
    throw invalidCvError("No readable text was found in the CV.");
  }

  const skills = readSection(lines, [/^skills?(\s+and\s+expertise)?$/i]);
  const email = normalizedText.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] || null;
  const phone = normalizedText.match(/(?:\+?\d[\d().\s-]{7,}\d)/)?.[0]?.trim() || null;

  return {
    fileName: file.originalname,
    format: extension,
    parsedAt: new Date().toISOString(),
    fullName: lines[0] || null,
    contact: { email, phone },
    summary: readSection(lines, [/^(professional\s+)?summary$/i, /^(career\s+)?objective$/i, /^profile$/i]).join("\n"),
    skills: skills.join(" ").split(/[,;|\n]/).map((skill) => skill.trim()).filter(Boolean),
    education: readSection(lines, [/^education(\s+and\s+qualifications)?$/i]),
    experience: readSection(lines, [/^(work\s+)?experience$/i, /^employment(\s+history)?$/i]),
    rawText: normalizedText,
  };
}

function listTerms(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,;\n]/) : [];
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim().replace(/\s+/g, " ");
}

export function calculateCvProjectMatchScore(project: Record<string, unknown>, cvData: Record<string, unknown>): number {
  const cvText = normalizeMatchText([
    ...listTerms(cvData.skills),
    String(cvData.summary || ""),
    String(cvData.experience || ""),
    String(cvData.education || ""),
    String(cvData.rawText || ""),
  ].join(" "));
  const requiredSkills = [...new Set([
    ...listTerms(project.requiredSkills),
    ...listTerms(project.skills),
  ].map(normalizeMatchText).filter(Boolean))];
  const matchedSkills = requiredSkills.filter((skill) => ` ${cvText} `.includes(` ${skill} `)).length;
  const skillCoverage = requiredSkills.length ? matchedSkills / requiredSkills.length : 0;

  const projectText = normalizeMatchText([
    String(project.title || ""),
    String(project.description || ""),
    String(project.field || ""),
  ].join(" "));
  const keywords = [...new Set(projectText.split(" ").filter((word) => word.length >= 2 && !MATCH_STOP_WORDS.has(word)))];
  const matchedKeywords = keywords.filter((word) => ` ${cvText} `.includes(` ${word} `)).length;
  const keywordCoverage = keywords.length ? matchedKeywords / keywords.length : 0;

  const relevance = requiredSkills.length && keywords.length
    ? skillCoverage * 0.7 + keywordCoverage * 0.3
    : requiredSkills.length ? skillCoverage : keywordCoverage;
  return Number((relevance * 10).toFixed(1));
}