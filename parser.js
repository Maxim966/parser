import puppeteer from 'puppeteer';

async function parser() {
	const arrProducts = [];
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

	await closeModalIfExists(page, 'Выберите способ доставки', 'Самовывоз', 3);
	await closeModalIfExists(page, 'Внимание', 'Хорошо', 3);

	delay(2000);

	const parseProductArrMoscow = await parseProductsByCategory(page);
	arrProducts.push(...parseProductArrMoscow);

	await switchCityAndClose(page);

	await page.waitForSelector('.categories-list', {
		timeout: 10000,
	});

	await closeModalIfExists(page, 'Выберите способ доставки', 'Самовывоз', 3);
	await closeModalIfExists(page, 'Внимание', 'Хорошо', 3);

	const parseProductArr = await parseProductsByCategory(page);

	arrProducts.push(...parseProductArr);
	const allProducts = uniqueArray(arrProducts);
	console.log(`Всего товаров: ${allProducts.length}`);
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

async function modalHandlerWithRetry(page, title, nameButton, maxAttempts = 3) {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			console.log(`Попытка ${attempt}/${maxAttempts}: "${title}"`);

			const handled = await modalHandler(page, title, nameButton);
			if (handled) {
				return true;
			}
		} catch (error) {
			console.log(`Попытка ${attempt} не удалась: ${error.message}`);
		}

		if (attempt < maxAttempts) {
			await delay(1000);
		}
	}

	return false;
}

async function waitForModalToClose(page) {
	try {
		const modalExists = (await page.$('.custom-modal')) !== null;

		if (!modalExists) {
			console.log('Модальное окно уже закрыто/не найдено');
			return true;
		}

		await page.waitForSelector('.custom-modal', {
			hidden: true,
			timeout: 3000,
		});
		console.log('Модальное окно закрыто');
		return true;
	} catch (error) {
		console.log('Модальное окно не найдено или уже закрыто');
		return false;
	}
}

async function closeModalIfExists(page, title, nameButton, maxAttempts = 3) {
	const handler = await modalHandlerWithRetry(
		page,
		title,
		nameButton,
		maxAttempts
	);

	if (handler) {
		await waitForModalToClose(page);
		console.log(`Модальное окно "${title}" успешно закрыто`);
	} else {
		console.log(`Пропускаем модальное окно "${title}"`);
	}
}

async function getProduction(page) {
	const arr = [];

	const production = await page.$$('.production__item');

	for (let index = 0; index < production.length; index++) {
		const title = await production[index].$eval(
			'.production__item-title',
			element => element.textContent
		);
		const price = await production[index].$eval(
			'.price-value',
			element => element.textContent
		);
		arr.push({ name: title, price: price });
	}
	return arr;
}

async function parseProductsByCategory(page) {
	const allProducts = [];
	try {
		await page.waitForSelector('.categories-list', {
			timeout: 10000,
			visible: true,
		});

		const listMenu = await page.$$('.filter-category__item');
		console.log('Начался парсинг товаров...');

		for (let i = 0; i < listMenu.length; i++) {
			await page.evaluate(index => {
				const items = document.querySelectorAll('.filter-category__item');
				if (items[index]) {
					items[index].click();
				}
			}, i);
			await delay(1000);

			const categoryProducts = await getProduction(page);
			allProducts.push(...categoryProducts);
		}
	} catch (error) {
		console.log('Ошибка при парсинге категорий:', error.message);
	}

	console.log(`Всего собрано: ${allProducts.length} товаров`);
	return allProducts;
}

async function switchCityAndClose(page) {
	try {
		console.log('Переключаем город...');
		await page.waitForSelector('.header-setting', {
			timeout: 5000,
			visible: true,
		});

		await page.$eval('.header-setting', element => element.click());

		await page.waitForSelector('.text-field.select.readonly[data-v-8a2a7214]', {
			timeout: 3000,
		});

		await page.$eval('.text-field.select.readonly[data-v-8a2a7214]', element =>
			element.click()
		);

		await page.$$eval('.input__select-item', element => {
			if (element.length > 1) {
				element[1].click();
			}
		});

		delay(2000);

		console.log('Город переключен');

		const thirdModalHandled = await modalHandlerWithRetry(
			page,
			'Выберите город',
			'ОК',
			2
		);

		if (thirdModalHandled) {
			await waitForModalToClose(page);
		} else {
			console.log('Пропускаем модальное окно');
		}
	} catch (error) {
		console.log('Ошибка при переключении города:', error.message);
	}
}

function uniqueArray(array) {
	const a = new Set();
	return array.filter(item => {
		const key = `${item.name}-${item.price}`;
		if (a.has(key)) {
			return false;
		}
		a.add(key);
		return true;
	});
}

parser();
