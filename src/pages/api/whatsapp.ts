import WhatsappClient, { createWhatsappClient, loadPersistedInfo } from "@/model/WhatsappClient";

export default async function handler(req: any, res: any) {
	if (req.method === 'POST') {
		const { name } = JSON.parse(req.body);

		const client = createWhatsappClient(name);
		const whatsappClient = new WhatsappClient(name, client);

		client.on('qr', (qrcode) => {
			if (!res.writableFinished) res.status(200).json({ qrcode })
		});

		client.on('ready', () => !res.writableFinished && res.status(200).json({ configured: true }))

		setTimeout(() => !res.writableFinished && res.status(400).json({ configured: false }), 20000)
	} else if (req.method === 'GET') {
		const info = await loadPersistedInfo();

		res.json(info);
	} else {
		res.json({ created: false });
	}
}
