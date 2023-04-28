import { Axios } from "axios";
import { Message, Role } from "./OpenAI";
import axiosHelper from "@/helpers/axios";
import { readFile } from "fs/promises";

const WEBUI_URL = process.env.WEBUI_URL;

export interface PromptPayload {
	prompt: string,
	max_new_tokens: number,
	do_sample: boolean,
	temperature: number,
	top_p: number,
	typical_p: number,
	repetition_penalty: number,
	top_k: number,
	min_length: number,
	no_repeat_ngram_size: number,
	num_beams: number,
	penalty_alpha: number,
	length_penalty: number,
	early_stopping: boolean,
	seed: number,
	add_bos_token: boolean,
	truncation_length: number,
	ban_eos_token: boolean,
	skip_special_tokens: boolean,
	stopping_strings: string[]
}

export interface Character {
	name: string,
	context: string,
	greeting?: string,
	example_dialogue: string;
}

export class TextGenerationWebUi {
	private character!: Character;
	private axios: Axios;

	public messages: Message[] = [];
	public payload: PromptPayload = {
		max_new_tokens: 1000,
		do_sample: true,
		temperature: 1.3,
		top_p: 0.1,
		typical_p: 1,
		repetition_penalty: 1.18,
		top_k: 40,
		min_length: 0,
		no_repeat_ngram_size: 0,
		num_beams: 1,
		penalty_alpha: 0,
		length_penalty: 1,
		early_stopping: true,
		seed: -1,
		add_bos_token: true,
		truncation_length: 2048,
		ban_eos_token: false,
		skip_special_tokens: true,
		stopping_strings: ["\nYou"],
		prompt: ''
	}

	constructor(charName: string) {
		this.loadChar(charName).then(char => this.character = char);
		this.axios = axiosHelper();
	}

	async makeCompletion(message: string, username: string, chatId: string) {
		const prompt = this.generatePrompt(message, username, chatId);

		const payload = {
			...this.payload,
			prompt
		}

		const resp = await this.axios.post(`${WEBUI_URL}/generate`, payload);

		const replyMessage: string = resp.data?.results[0]?.text.replace("\n", "");

		const chatReplyMessage: Message = {
			role: Role.assistant,
			content: replyMessage || '',
			name: this.character.name,
			chatId
		}

		this.messages.push(chatReplyMessage);

		return replyMessage;
	}

	generatePrompt(content: string, username: string, chatId: string) {
		const message: Message = {
			role: Role.user,
			name: 'You',
			content,
			chatId,
		}

		this.messages.push(message);

		const chat = this.messages
			.filter(m => m.chatId === chatId)
			.map(m => `${m.name}: ${m.content}`)
			.join('\n')

		const prompt = `${this.character.context}\n\n` +
			`${this.character.example_dialogue}\n` +
			`${this.character.greeting}\n` +
			`${chat}\n` +
			`${this.character.name}: `

		return prompt;
	}

	changePromptPayload(field: keyof PromptPayload, value: any) {
		this.payload[field] = value as never;
	}

	async loadChar(name: string) {
		let file;

		try {
			file = await readFile('characters.json', 'utf8');
		} catch (e) {
			file = '[]'
		};

		const characters = JSON.parse(file) as Character[];

		const char = characters.find(c => c.name === name) as Character;

		return char
	}

	changeCaracter(character: Character) {
		this.character = character;
	}
}

