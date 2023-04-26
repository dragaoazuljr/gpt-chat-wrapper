import WAWebJS, { Client, LocalAuth, NoAuth } from 'whatsapp-web.js';
import { OpenAI, Role } from './OpenAI';
import { readFile } from 'fs/promises';
import { writeFile } from 'fs';
import { Character, TextGenerationWebUi } from './TextGenerationWebUI';

export default class WhatsappClient {
	client!: WAWebJS.Client;

	constructor(name: string, res: any) {
		this.client = this.createClient(name);
	}

	createClient(name: string) {
		const client = new Client({
			puppeteer: {
				args: ['--no-sandbox']
			},
			authStrategy: new LocalAuth({ clientId: name }),
			//authStrategy: new NoAuth(),
		});

		client.on('qr', (qrcode) => {
			console.log(qrcode, res);
			if (!res.writableFinished) res.json({ qrcode })
		});

		client.on('ready', () => console.log(`client ${name} is ready`));

		client.on('auth_failure', (err) => console.error(`error ${err}`));


		client.on('message_create', async (message) => {
			const body = message.body;
			const chat = await message.getChat();
			const chatId = chat.id;
			const [command, ...rest] = body.split(' ');
			const openAI = new OpenAI();
			const webUiAI = new TextGenerationWebUi('Chiharu Yamada');

			if (command[0] !== '/') {
				return false;
			}

			const text = rest.join(' ');
			const contact = await message.getContact();
			const [username] = contact?.name?.split(' ') || ['user'];

			const chatGpt = async (message: WAWebJS.Message, command: string, text: string, username: string) => {
				if (!username.match(/^[a-zA-Z0-9_-]{1,64}$/)) {
					username = 'user';
				}

				let resp;

				if (command === '/chat') {
					resp = await openAI.makeChatCompletions(username, text, Role.user, chatId.user);
				} else if (command === '/completion') {
					resp = await openAI.makeCompletions(text);
				} else if (command === '/system') {
					resp = await openAI.makeChatCompletions(username, text, Role.system, chatId.user);
				}

				message.reply(resp);
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
					const models = await openAI.listModels();
					message.reply(models);
					break;
				case '/set-model':
					const [type, model] = text.split(" ");
					openAI.selectModel(model, type as unknown as 'chat' | 'completions');
					message.reply(`Model ${model} escolhido`);
					break;
				case '/clear':
					openAI.clearMessages(chatId.user);
					break;
				case '/clearAll':
					openAI.clearAllMessages();
				case '/web':
					const reply = await webUiAI.makeCompletion(text, username, chatId.user)
					message.reply(reply);
					break;
				case '/help':
					message.reply('Comandos: \n' +
						'- /chat => Conversar com ChatGPT\n' +
						'- /models => Listar models disponíveis\n' +
						'- /set-model => Definir model\n' +
						'- /completion => Completar Text sem Chat\n' +
						'- /system => Mandar instruções nivel de sistema\n' +
						'- /clearAll => Limpar todo o histórico de mensagems\n' +
						'- /clear => limpar histórico de mensagens do chat especifico')
					break;
			};
		});

		client.initialize();

		console.log(client);

		this.saveInfo(name);

		return client;
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

	persistedInfo.forEach(({ name }) => new WhatsappClient(name));

	return persistedInfo.map(p => p.name);
}

