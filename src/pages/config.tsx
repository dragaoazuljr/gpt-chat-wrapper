import { useEffect, useState } from "react"
import QRious from 'qrious';

export default function Config() {
	const [name, setName] = useState('');
	const [apiKey, setApiKey] = useState('');
	const [list, setList] = useState([]);

	useEffect(() => {
		async function getConfig() {
			const resp = await fetch('/api/whatsapp');
			const config = await resp.json();

			setList(config);
		};

		getConfig();
	}, [])

	const handleCreateClient = async () => {
		const res = await fetch('/api/whatsapp', { method: 'POST', body: JSON.stringify({ name, apiKey }) });
		const { qrcode } = await res.json();

		if (qrcode) {
			new QRious({
				element: document.getElementById('qrcode'),
				background: '#ffffff',
				backgroundAlpha: 1,
				foreground: '#000000',
				foregroundAlpha: 1,
				level: 'H',
				padding: 0,
				size: 512,
				value: qrcode
			})
		}
	}

	return (
		<div>
			<h1>Config bot</h1>
			<label htmlFor="openAIApiKey">Open AI API key</label>
			<input id="openAIApiKey" type='text' onChange={(e) => setApiKey(e.target.value)} />
			<label htmlFor="name">Name</label>
			<input id="name" type='text' onChange={(e) => setName(e.target.value)} />
			<button onClick={handleCreateClient}>Create Client</button>
			<h2>QRCode</h2>
			<canvas id="qrcode"></canvas>
			<h2>Saved config</h2>
			<ul>
				{list?.map((l, i) => <li key={i}>{l}</li>)}
			</ul>
		</div>
	)
}
