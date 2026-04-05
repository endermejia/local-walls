import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://localhost:4200/area/berlin/boulder-crag-3/my-boulder-route')
        await page.wait_for_timeout(3000)
        await page.screenshot(path='/home/jules/verification.png')
        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
