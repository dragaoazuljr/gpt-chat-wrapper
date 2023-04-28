import WAWebJS, { Client, LocalAuth, NoAuth } from 'whatsapp-web.js';
import { Message, OpenAI, Role } from './OpenAI';
import { readFile } from 'fs/promises';
import { writeFile } from 'fs';
import { Character, TextGenerationWebUi } from './TextGenerationWebUI';

export default class WhatsappClient {
	name: string;
	client!: WAWebJS.Client;
	openAI: OpenAI;
	webUiAI: TextGenerationWebUi;

	constructor(name: string, client: WAWebJS.Client) {
		this.name = name;
		this.client = this.addClientEventHandlers(client);
		this.openAI = new OpenAI();
		this.webUiAI = new TextGenerationWebUi('Chiharu Yamada');
	}

	addClientEventHandlers(client: WAWebJS.Client) {
		client.on('ready', () => {
			console.log(`client ${this.name} is ready`)
			this.saveInfo(this.name);
		});

		client.on('auth_failure', (err) => console.error(`error ${err}`));

		client.on('message_create', (message) => this.handleMessage(message));

		client.initialize();

		return client;
	}

	addMessageToList(content: string, role: Role, chatId: string, id: string, type: 'OPENAI' | 'WEBUI', name?: string) {
		const message: Message = {
			content,
			role,
			chatId,
			name,
			id
		};

		if (type === 'WEBUI') this.webUiAI.messages.push(message);
		if (type === 'OPENAI') this.openAI.messages.push(message);
	}

	async handleMessage(message: WAWebJS.Message) {
		const body = message.body;
		const messageId = message.id?.id;
		const qoutedMessage = await message.getQuotedMessage();
		const qoutedMessageId = qoutedMessage?.id?.id;
		const chat = await message.getChat();
		const chatId = chat.id;
		const [command, ...rest] = body.split(' ');
		const text = rest.join(' ');
		const contact = await message.getContact();
		const [username] = contact?.name?.split(' ') || ['user'];

		if (command[0] !== '/') {
			const hasQuotedOpenAiMessage = this.openAI.messages.find(m => m.id === qoutedMessageId && m.role === Role.assistant);
			const hasQuotedTextGenMessage = this.webUiAI.messages.find(m => m.id === qoutedMessageId && m.role === Role.assistant);

			if (hasQuotedOpenAiMessage) {
				const reply = await this.openAI.makeChatCompletions(username, body, Role.user, chatId.user, messageId);

				const openAiReplyMessage = await message.reply(reply);

				this.addMessageToList(reply, Role.assistant, chatId.user, openAiReplyMessage?.id?.id, 'OPENAI');
				return false;
			} else if (hasQuotedTextGenMessage) {
				const reply = await this.webUiAI.makeCompletion(body, username, chatId.user, messageId);

				const whatsReplyMessage = await message.reply(reply);

				this.addMessageToList(reply, Role.assistant, chatId.user, whatsReplyMessage?.id?.id, 'WEBUI', this.webUiAI.getSelectedCharName())
				return false;
			} else {
				return false;
			}
		}

		const chatGpt = async (message: WAWebJS.Message, command: string, text: string, username: string) => {
			if (!username.match(/^[a-zA-Z0-9_-]{1,64}$/)) {
				username = 'user';
			}

			let resp;

			if (command === '/chat') {
				resp = await this.openAI.makeChatCompletions(username, text, Role.user, chatId.user, messageId);
			} else if (command === '/completion') {
				resp = await this.openAI.makeCompletions(text);
			} else if (command === '/system') {
				resp = await this.openAI.makeChatCompletions(username, text, Role.system, chatId.user, messageId);
			}

			if (command !== '/completion') {

				const whatsReplyMessage = await message.reply(resp);

				const chatReplyMessage: Message = {
					role: Role.assistant,
					content: resp || '',
					chatId: chatId.user,
					id: whatsReplyMessage?.id?.id
				}

				this.openAI.messages.push(chatReplyMessage);
			} else {
				message.reply(resp);
			}
		}

		switch (command) {
			case '/chat':
				chatGpt(message, command, text, username);
				break;
			case '/completion':
				chatGpt(message, command, text, username);
				break
			case '/system':
				chatGpt(message, command, text, username);
				break;
			case '/models':
				const models = await this.openAI.listModels();
				message.reply(models);
				break;
			case '/set-model':
				const [type, model] = text.split(" ");
				this.openAI.selectModel(model, type as unknown as 'chat' | 'completions');
				message.reply(`Model ${model} escolhido`);
				break;
			case '/clear':
				if (text === 'OPENAI') this.openAI.clearMessages(chatId.user);
				if (text === 'WEBUI') this.webUiAI.clearCharMessages(chatId.user);
				break;
			case '/clearAll':
				if (text === 'OPENAI') this.openAI.clearAllMessages();
				if (text === 'WEBUI') this.webUiAI.clearAllMessages();
				break;
			case '/web':
				const reply = await this.webUiAI.makeCompletion(text, username, chatId.user, messageId)
				const replyMessage = await message.reply(reply);

				this.addMessageToList(reply, Role.assistant, chatId.user, replyMessage?.id?.id, 'WEBUI', this.webUiAI.getSelectedCharName());
				break;
			case '/list-characters':
				const list = await this.webUiAI.listAvailableChars();

				message.reply(list);
				break;
			case '/select-character':
				this.webUiAI.selectCharacter(text);
				break;
			case '/help':
				message.reply('Comandos: \n' +
					'- ChatGPT:\n' +
					'  => /chat => Conversar com ChatGPT\n' +
					'  => /models => Listar models disponíveis\n' +
					'  => /set-model => Definir model\n' +
					'  => /completion => Completar Text sem Chat\n' +
					'  => /system => Mandar instruções nivel de sistema\n' +
					'  => /clearAll OPENAI => Limpar todo o histórico de mensagems\n' +
					'  => /clear OPENAI => Limpar todas as mensagens desse chat \n' +
					'- TextGenerationWebUI:\n' +
					'  => /web => Conversar com TextGenerationWebUI\n' +
					'  => /list-characters => Listar todos os personagens\n' +
					'  => /select-characters NAME => Selecionar personagem\n' +
					'  => /clear WEBUI => Limpar mensagens desse chat\n' +
					'  => /clearAll WEBUI => Limpar todas as mensagens\n');
				break;
		};
	}

	async saveInfo(name: string) {
		let file;

		try {
			file = await readFile('.info', 'utf8') || '[]';
		} catch (e) {
			file = '[]';
		}

		const persistedInfo: any[] = JSON.parse(file);

		const alreadyAdded = persistedInfo.find(p => p.name === name);

		if (!alreadyAdded) {
			persistedInfo.push({ name });
			writeFile('.info', JSON.stringify(persistedInfo), (err) => {
				if (err) throw err;
			});
		};
	}

	signOut() {
		this.client.logout();
	}
}

export async function loadPersistedInfo() {
	let file;

	try {
		file = await readFile('.info', 'utf8');
	} catch (e) {
		file = '[]'
	}

	const persistedInfo: any[] = JSON.parse(file);

	persistedInfo.forEach(({ name }) => {
		const client = createWhatsappClient(name);
		const whatsappClient = new WhatsappClient(name, client);
	});

	return persistedInfo.map(p => p.name);
}

export function createWhatsappClient(name: string) {
	const client = new Client({
		puppeteer: {
			args: ['--no-sandbox']
		},
		authStrategy: new LocalAuth({ clientId: name }),
		//authStrategy: new NoAuth(),
	});

	return client
}

