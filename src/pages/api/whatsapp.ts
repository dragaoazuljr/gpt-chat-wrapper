import createClient, { loadPersistedInfo } from "@/model/Whatsapp";

export default async function handler(req: any, res: any) {
	if (req.method === 'POST') {
		const { apiKey, name } = JSON.parse(req.body);

		const client = createClient(name, apiKey);

		client.on('qr', (qrcode) => {
			res.json({ qrcode })
		});

		client.on('ready', () => res.status(200))

		setTimeout(() => res.status(400).send({ error: 'generating qrcode' }), 10000);
	} else if (req.method === 'GET') {
		const info = await loadPersistedInfo();

		res.json(info);
	} else {
		res.json({ created: false });
	}
}
