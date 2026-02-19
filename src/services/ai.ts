import OpenAI from "openai";
import { config } from "../config";

class Service {
	private aiClient = new OpenAI({ apiKey: config.openAiApiKey });
    private model = "gpt-3.5-turbo";

	async complete(prompt: string, systemPrompt?: string): Promise<string> {
		const message = prompt.trim();
		if (message.length === 0) {
			throw new Error("Prompt cannot be empty");
		}

        return "some response";
	}
}

export const aiService = new Service();