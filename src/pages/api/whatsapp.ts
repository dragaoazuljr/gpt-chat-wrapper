import WhatsappClient, { loadPersistedInfo } from "@/model/WhatsappClient";

export default async function handler(req: any, res: any) {
	if (req.method === 'POST') {
		const { name } = JSON.parse(req.body);

		const client = new WhatsappClient(name, res);

		console.log(client.client.info);

		client.client.on('qr', (code) => {
			console.log(code);
		})
	} else if (req.method === 'GET') {
		const info = await loadPersistedInfo();

		res.json(info);
	} else {
		res.json({ created: false });
	}
}
