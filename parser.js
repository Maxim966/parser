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

	await closeCookieBanner(page);

	delay(1000);

	await modalHandler(page, 'Выберите способ доставки', 'Самовывоз');
	await modalHandler(page, 'Внимание', 'Хорошо');

	delay(2000);
}

async function closeCookieBanner(page) {
	await page.waitForSelector('.cookie-notification', {
		timeout: 5000,
		visible: true,
	});

	await page.$eval('[aria-label="Accept all cookies"]', element =>
		element.click()
	);
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function modalHandler(page, title, nameButton) {
	try {
		await page.waitForSelector(`xpath=//*[contains(text(), "${title}")]`, {
			timeout: 5000,
			visible: true,
		});

		const element = await page.$(`xpath=//*[contains(text(), "${title}")]`);

		const clicked = await page.evaluate(
			(el, btnName) => {
				const modal = el.closest('.custom-modal, .modal-content, .modal');
				if (modal) {
					const buttons = modal.querySelectorAll('button');
					for (let btn of buttons) {
						const text = btn.textContent.trim();
						const ariaLabel = btn.getAttribute('aria-label');
						if (
							text === btnName ||
							(ariaLabel && ariaLabel.includes(btnName))
						) {
							btn.click();
							return true;
						}
					}
				}
				return false;
			},
			element,
			nameButton
		);

		if (clicked) {
			await delay(500);
			return true;
		} else {
			return false;
		}
	} catch (error) {
		console.log(`Модальное окно "${title}" не найдено или уже закрыто`);
	}
}

parser();
