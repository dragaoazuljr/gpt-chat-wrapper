import { Client, LocalAuth } from 'whatsapp-web.js';
import { OpenAI, Role } from './OpenAI';
import { readFile } from 'fs/promises';
import { writeFile } from 'fs';

export default function createClient(name: string, apiKey: string) {
	const client = new Client({
		puppeteer: {
			args: ['--no-sandbox']
		},
		authStrategy: new LocalAuth({ clientId: name }),
	});
	const openAI = new OpenAI(apiKey);

	client.on('ready', () => console.log(`client ${name} is ready`));

	client.on('auth_failure', (err) => console.error(`error ${err}`));

	client.on('message_create', async (message) => {
		const body = message.body;

		if (body.startsWith('/chat ') || body.startsWith('/completion ') || body.startsWith('/system')) {
			const contact = await message.getContact();
			let [username] = contact?.name?.split(' ') || ['user'];

			if (!username.match(/^[a-zA-Z0-9_-]{1,64}$/)) {
				username = 'user';
			}

			const [command, ...text] = body.split(' ')
			let resp;

			if (command === '/chat') {
				resp = await openAI.makeChatCompletions(username, text.join(" "));
			} else if (command === '/completion') {
				resp = await openAI.makeCompletions(text.join(" "));
			} else if (command === '/system') {
				resp = await openAI.makeChatCompletions(username, text?.join(" "), Role.system);
			}

			message.reply(resp);
		} else if (body.startsWith('/models')) {
			const models = await openAI.listModels();

			message.reply(models);
		} else if (body.startsWith('/set-model')) {
			const [command, type, model] = body.split(' ');
			openAI.selectModel(model, type);

			message.reply(`Model ${model} escolhido.`);

		} else if (body.startsWith('/help')) {
			message.reply('Comandos: \n - /chat => Conversar com ChatGPT\n - /models => Listar models disponíveis\n - /set-model => Definir model\n - /completion => Completar Text sem Chat\n /system => Mandar instruções nivel de sistema')
		}
	});

	client.initialize();

	saveInfo(name, apiKey);

	return client;
}

export async function saveInfo(name: string, apiKey: string) {
	let file;

	try {
		file = await readFile('.info', 'utf8') || '[]';
	} catch (e) {
		file = '[]';
	}

	const persistedInfo: any[] = JSON.parse(file);

	const alreadyAdded = persistedInfo.find(p => p.name === name);

	if (!alreadyAdded) {
		persistedInfo.push({ name, apiKey });
		writeFile('.info', JSON.stringify(persistedInfo), (err) => {
			if (err) throw err;
		});
	};
}

export async function loadPersistedInfo() {
	let file;

	try {
		file = await readFile('.info', 'utf8');
	} catch (e) {
		file = '[]'
	}

	const persistedInfo: any[] = JSON.parse(file);

	persistedInfo.forEach(({ name, apiKey }) => createClient(name, apiKey));

	return persistedInfo.map(p => p.name);
}
