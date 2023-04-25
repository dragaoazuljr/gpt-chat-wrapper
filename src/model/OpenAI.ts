import axios, { Axios } from "axios";

export const OPENAI_URL = 'https://api.openai.com/v1';

export enum Role {
	user = 'user',
	system = 'system',
	assistant = 'assistant',
}

export interface Message {
	role: Role,
	content: string,
	name?: string,
}

export interface Chat {
	messages: Message[];
}

export interface Model {
	id: string;
	object: string;
	created: number;
	owned_by: string;
	permission: Permission[];
	root: string;
	parent: null;
}

export interface Permission {
	id: string;
	object: string;
	created: number;
	allow_create_engine: boolean;
	allow_sampling: boolean;
	allow_logprobs: boolean;
	allow_search_indices: boolean;
	allow_view: boolean;
	allow_fine_tuning: boolean;
	organization: string;
	group: null;
	is_blocking: boolean;
}

export class OpenAI {
	private apiKey: string;
	private axios: Axios;

	public messages: Message[];
	public chatModel: string = 'gpt-3.5-turbo'
	public model: string = 'ada'
	public models: Model[] = [];

	constructor(apiKey: string) {
		this.apiKey = apiKey;
		this.messages = [];
		this.axios = axios.create({
			headers: {
				Authorization: `Bearer ${this.apiKey}`
			},
			transformResponse: [(data) => { return JSON.parse(data) }]
		});
	};

	async makeChatCompletions(username: string, content: string, role?: Role) {
		const message: Message = {
			role: role || Role.user,
			content,
			name: username,
		};

		this.messages.push(message);

		const payload = {
			model: this.chatModel,
			messages: this.messages,
			temperature: 0.7
		};

		const resp = await this.axios.post(`${OPENAI_URL}/chat/completions`, payload).catch(e => console.log(e));
		const chatReply = resp?.data?.choices.map((c: any) => c?.message?.content).join("");

		const chatReplyMessage: Message = {
			role: Role.assistant,
			content: chatReply || ''
		};

		this.messages.push(chatReplyMessage);

		return chatReply;
	}

	async makeCompletions(prompt: string) {
		const payload = {
			model: this.model,
			prompt
		};

		const resp = await this.axios.post(`${OPENAI_URL}/completions`, payload);
		const replyMessage = resp?.data?.choices.map((c: any) => c.text).join("");

		return replyMessage;
	}

	async listModels() {
		const models = await this.axios.get(`${OPENAI_URL}/models`);
		const data = JSON.parse(models.data);
		this.models = data?.data;

		if (this.models) {
			const formatedList = this.models.map(model => `${model.id} - ${model.owned_by}`).join('\n');
			return formatedList
		} else {
			return ''
		}
	}

	selectModel(model: string, type: 'chat' | 'completions') {
		if (type === 'chat') {
			this.chatModel = model;
		} else if (type === 'completions') {
			this.model = model;
		}
	}
}
