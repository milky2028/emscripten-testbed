import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const port = 8080;

async function handler(req: Request): Promise<Response> {
	const path = new URL(req.url).pathname;
	const ok = { status: 200 };
	const js = { 'Content-Type': 'text/javascript' };
	const isolated = {
		'Cross-Origin-Opener-Policy': 'same-origin',
		'Cross-Origin-Embedder-Policy': 'require-corp'
	};

	if (path.includes('favicon')) {
		return (
			new Response(await Deno.readFile('./static/favicon.png')),
			{
				...ok,
				'Content-Type': 'image/png'
			}
		);
	}

	if (path.includes('index') || path === '/') {
		return new Response(await Deno.readFile('./index.html'), {
			...ok,
			headers: { ...isolated }
		});
	}

	if (path.includes('wasm')) {
		const wasm = { ...ok, headers: { 'Content-Type': 'application/wasm' } };
		return new Response(await Deno.readFile('./static/lib.wasm'), wasm);
	}

	if (path.includes('.js')) {
		let file = undefined;
		if (path.includes('apollo')) {
			file = await Deno.readFile('./static/lib.js');
		} else {
			file = await Deno.readFile(`./static${path}`);
		}

		return new Response(file, {
			...ok,
			headers: { ...js, ...isolated }
		});
	}

	console.log(path);
	return new Response('Path not found', { status: 404 });
}

console.log(`HTTP webserver running. Access it at: http://localhost:8080/`);
await serve(handler, { port });
