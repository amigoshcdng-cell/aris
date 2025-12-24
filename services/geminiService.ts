
import { GoogleGenAI, Type } from "@google/genai";
import { WPPost } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key is missing");
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeQuery(query: string, availablePosts: WPPost[]): Promise<{ answer: string; recommendedPostIds: number[] }> {
    // Create a simplified context of the website content
    const context = availablePosts.map(p => ({
      id: p.id,
      title: p.title.rendered,
      excerpt: p.excerpt.rendered.replace(/<[^>]*>?/gm, '').substring(0, 150)
    }));

    const systemInstruction = `
      You are an AI Assistant for a WordPress website. 
      You have access to the website's latest posts and pages.
      Your goal is to answer the user's question based ONLY on the provided content.
      If the user's query matches any content, explain why and recommend the specific posts/pages.
      Return the response in a JSON format.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        USER QUERY: "${query}"
        WEBSITE CONTENT: ${JSON.stringify(context)}
      `,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: "A helpful answer to the user query based on the content."
            },
            recommendedPostIds: {
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "IDs of posts that are highly relevant to the query."
            }
          },
          required: ["answer", "recommendedPostIds"]
        }
      }
    });

    try {
      return JSON.parse(response.text);
    } catch (e) {
      return { 
        answer: "I couldn't process that request properly. Could you try rephrasing?", 
        recommendedPostIds: [] 
      };
    }
  }
}
