import puppeteer from 'puppeteer';

async function parser() {
	const browser = await puppeteer.launch({
		headless: false,
	});
	const page = await browser.newPage();

	page.setDefaultNavigationTimeout(60000);

	await page.setUserAgent(
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
	);
	await page.setViewport({ width: 1200, height: 800 });

	await page.goto('https://djari.ru/', {
		waitUntil: 'domcontentloaded',
		timeout: 60000,
	});

	await page.waitForSelector('body', { timeout: 10000 });
}

parser();
