import OpenAI from "openai";

class Service {
    public initialized = false;
	private client: OpenAI | null = null;
    private model = "gpt-3.5-turbo";

	initialize(apiKey: string, model?: string): void {
		const normalizedApiKey = apiKey.trim();
		if (normalizedApiKey.length === 0) {
			throw new Error("Open Ai API key is empty");
		}

		this.client = new OpenAI({ apiKey: normalizedApiKey });
		this.initialized = true;

		if (model && model.trim().length > 0) {
			this.model = model.trim();
		}
	}

	isInitialized(): void {
		if (!this.initialized || !this.client) {
            throw new Error("AI service is not initialized");
        }
	}

	async complete(prompt: string, systemPrompt?: string): Promise<string> {
		this.isInitialized();
		
		const message = prompt.trim();
		if (message.length === 0) {
			throw new Error("Prompt cannot be empty");
		}

        return "some response";
	}
}

export const aiService = new Service();