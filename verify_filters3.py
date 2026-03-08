from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1280, 'height': 800},
            ignore_https_errors=True
        )
        page = context.new_page()

        print("Navigating to explore route...")
        page.goto("http://localhost:4200/explore")

        page.wait_for_timeout(3000)

        filter_btn = page.locator('button').filter(has_text="Filtros")

        if filter_btn.count() > 0:
            print("Clicking 'Filtros' button...")
            filter_btn.first.click()
        else:
            print("Couldn't find button with text 'Filtros'. Trying generic filter icon...")
            try:
                page.mouse.click(1200, 100)
            except Exception as e:
                print(e)

        page.wait_for_timeout(2000)

        print("Taking screenshot...")
        page.screenshot(path="dialog_area_test3.png")
        print("Done.")

        browser.close()

if __name__ == "__main__":
    run()
