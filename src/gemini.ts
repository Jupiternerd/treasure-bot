import { GoogleGenAI } from "@google/genai";
import { Glob } from "bun";
import path from "path";
import { config } from "./config";
import type { FeedbackEntry } from "./store";

const ai = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });

const KNOWLEDGE_DIR = path.join(import.meta.dir, "..", "knowledge");

async function loadKnowledge(): Promise<string> {
  const glob = new Glob("*.md");
  const parts: string[] = [];

  for await (const file of glob.scan(KNOWLEDGE_DIR)) {
    const content = await Bun.file(path.join(KNOWLEDGE_DIR, file)).text();
    parts.push(`--- ${file} ---\n${content}`);
  }

  return parts.join("\n\n");
}

export async function generateDraft(
  entry: Omit<FeedbackEntry, "messageId" | "draftResponse">,
  additionalInstructions?: string,
): Promise<string> {
  try {
    console.log("Generating draft with Gemini for entry:", entry);
    const knowledge = await loadKnowledge();

    const systemParts = [
      "You are a helpful customer support representative. Draft a professional, empathetic response to the following customer feedback.",
      "Keep the response concise and actionable.",
      'Begin your response with a subject line in the format "Subject: ..." on its own line, followed by a blank line, then the email body.',
    ];
    if (knowledge) {
      systemParts.push(
        `Use the following domain knowledge to inform your response:\n\n${knowledge}`,
      );
    }
    if (additionalInstructions) {
      systemParts.push(
        `Additional instructions: ${additionalInstructions}`,
      );
    }

    const userContent = [
      `Feedback Type: ${entry.feedbackType}`,
      `Status: ${entry.status}`,
      `Details: ${entry.lovelyTellUsMore}`,
      `What's Broken: ${entry.whatsBroken}`,
      `Response ID: ${entry.responseId}`,
      `Phone: ${entry.phone}`,
    ]
      .filter((line) => !line.endsWith(": "))
      .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      config: { systemInstruction: systemParts.join("\n\n") },
      contents: userContent,
    });

    return response.text?.trim() || "[Empty response from AI]";
  } catch (error) {
    console.error("Gemini draft generation failed:", error);
    return "[AI draft generation failed. Please write a response manually.]";
  }
}

export function parseSubjectAndBody(draft: string): {
  subject: string;
  body: string;
} {
  if (draft.startsWith("Subject: ")) {
    const newlineIndex = draft.indexOf("\n");
    if (newlineIndex !== -1) {
      const subject = draft.slice("Subject: ".length, newlineIndex).trim();
      const body = draft.slice(newlineIndex + 1).trimStart();
      return { subject, body };
    }
  }
  return { subject: "Re: Your Feedback", body: draft };
}
