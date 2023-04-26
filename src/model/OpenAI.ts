import axiosHelper from "@/helpers/axios";
import axios, { Axios } from "axios";

const OPENAI_URL = process.env.OPENAI_URL;
const OPENAI_API_TOKEN = process.env.OPENAI_API_TOKEN;

export enum Role {
	user = 'user',
	system = 'system',
	assistant = 'assistant',
}

export interface Message {
	role: Role,
	content: string,
	name?: string,
	chatId?: string,
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
	private axios: Axios;

	public messages: Message[];
	public chatModel: string = 'gpt-3.5-turbo'
	public model: string = 'ada'
	public models: Model[] = [];

	constructor() {
		this.messages = [];
		this.axios = axiosHelper(OPENAI_API_TOKEN);
	};

	async makeChatCompletions(username: string, content: string, role?: Role, chatId?: string) {
		const message: Message = {
			role: role || Role.user,
			content,
			name: username,
			chatId,
		};

		this.messages.push(message);

		const chatSpecificMessages = this.messages
			.filter(message => message.chatId === chatId)
			.map(message => ({ ...message, chatId: undefined }));

		const payload = {
			model: this.chatModel,
			messages: chatSpecificMessages,
			temperature: 0.7
		};

		const resp = await this.axios.post(`${OPENAI_URL}/chat/completions`, payload).catch(e => console.log(e));
		const chatReply = resp?.data?.choices.map((c: any) => c?.message?.content).join("");

		const chatReplyMessage: Message = {
			role: Role.assistant,
			content: chatReply || '',
			chatId,
		};

		this.messages.push(chatReplyMessage);

		console.log(this.messages);

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

	clearMessages(chatId: string) {
		this.messages = this.messages.filter(message => message.chatId != chatId);
	}

	clearAllMessages() {
		this.messages = [];
	}
}
