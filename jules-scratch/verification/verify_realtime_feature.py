import re
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    This script verifies the setup of a real-time debate room.
    """
    # 1. Navigate to the homepage
    page.goto("http://localhost:3000/")

    # 2. Select a debate template
    page.get_by_role("heading", name="세다토론").click()

    # 3. Close the guide modal that appears
    page.get_by_role("button", name="확인 후 설정하기").click()

    # 4. Verify the new UI elements for real-time setup
    expect(page.get_by_role("heading", name="실시간 토론방 설정 (선택)")).to_be_visible()

    room_id_input = page.get_by_label("참여 코드 (1~999 숫자)")
    expect(room_id_input).to_be_visible()

    # 5. Enter a room ID
    room_id_input.fill("123")
    expect(room_id_input).to_have_value("123")

    # 6. Start the debate using a more specific selector
    page.locator("#templates").get_by_role("button", name="토론 시작하기").click()

    # 7. Verify navigation to the correct dynamic URL
    expect(page).to_have_url(re.compile(r".*/debate/123"))

    # 8. Verify the "Connecting..." message is displayed
    expect(page.get_by_text("Connecting to Debate Room...")).to_be_visible()
    expect(page.get_by_text("Room ID: 123")).to_be_visible()

    # 9. Take a screenshot for visual confirmation
    page.screenshot(path="jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()