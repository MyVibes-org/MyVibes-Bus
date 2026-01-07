from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1200, 'height': 800})

        try:
            print("Navigating to home...")
            page.goto("http://localhost:3000")

            # Wait for title
            print("Waiting for title...")
            page.wait_for_selector("text=Route 478")

            # Wait for map or data to load (2 seconds)
            print("Waiting for load...")
            time.sleep(3)

            # Screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification.png")
            print("Screenshot saved to verification.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
