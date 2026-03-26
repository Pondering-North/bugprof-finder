const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const CHROMIUM_URL =
  'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body || {};
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'valid url required' });
  }

  let browser;
  try {
    const executablePath =
      process.env.CHROME_EXECUTABLE_PATH ||
      (await chromium.executablePath(CHROMIUM_URL));

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 800 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // Extra wait for late-loading JS frameworks
    await new Promise(r => setTimeout(r, 2000));

    const text = await page.evaluate(() => {
      ['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside'].forEach(tag => {
        document.querySelectorAll(tag).forEach(el => el.remove());
      });
      return document.body?.innerText || document.body?.textContent || '';
    });

    res.status(200).json({ text: text.slice(0, 80000) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
