"""
Selenium WebDriver test script for Festival Agent Simulation
Tests UI rendering and interaction functionality
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import sys

class FestivalSimulationTests:
    def __init__(self, url="http://localhost:8000"):
        self.url = url
        self.driver = None
        
    def setup(self):
        """Initialize the WebDriver"""
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1280,800')
        
        self.driver = webdriver.Chrome(options=options)
        self.driver.get(self.url)
        
        # Wait for canvas to be ready
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "canvas"))
        )
        time.sleep(2)  # Allow simulation to initialize
        
    def teardown(self):
        """Close the WebDriver"""
        if self.driver:
            self.driver.quit()
            
    def test_page_loads(self):
        """Test that the page loads correctly"""
        print("Test: Page loads correctly")
        assert "Festival Agent Simulation" in self.driver.title
        print("✓ Page title is correct")
        
    def test_all_controls_present(self):
        """Test that all control elements are present"""
        print("\nTest: All controls are present")
        
        elements = {
            "pauseBtn": "Pause button",
            "leftConcertBtn": "Left Concert button",
            "rightConcertBtn": "Right Concert button",
            "busArriveBtn": "Bus Arrives button",
            "busLeaveBtn": "Bus Leaving button",
            "speedSlider": "Speed slider"
        }
        
        for elem_id, name in elements.items():
            element = self.driver.find_element(By.ID, elem_id)
            assert element.is_displayed(), f"{name} not displayed"
            print(f"✓ {name} is present and displayed")
            
    def test_canvas_present(self):
        """Test that canvas element exists and has dimensions"""
        print("\nTest: Canvas is present and sized")
        canvas = self.driver.find_element(By.ID, "canvas")
        assert canvas.is_displayed()
        
        width = canvas.get_attribute("width")
        height = canvas.get_attribute("height")
        assert int(width) > 0, "Canvas width is 0"
        assert int(height) > 0, "Canvas height is 0"
        print(f"✓ Canvas is present with dimensions: {width}x{height}")
        
    def test_initial_attendee_count(self):
        """Test that initial attendee count is displayed"""
        print("\nTest: Initial attendee count")
        attendee_count = self.driver.find_element(By.ID, "attendeeCount")
        count_text = attendee_count.text
        assert "100" in count_text, f"Expected 100 attendees, got: {count_text}"
        print(f"✓ Initial attendee count is correct: {count_text}")
        
    def test_fps_display(self):
        """Test that FPS is being displayed and updated"""
        print("\nTest: FPS display")
        time.sleep(2)  # Wait for FPS to calculate
        fps_element = self.driver.find_element(By.ID, "fps")
        fps_text = fps_element.text
        assert "FPS:" in fps_text
        print(f"✓ FPS is being displayed: {fps_text}")
        
    def test_pause_button(self):
        """Test pause/resume functionality"""
        print("\nTest: Pause button functionality")
        pause_btn = self.driver.find_element(By.ID, "pauseBtn")
        
        initial_text = pause_btn.text
        assert initial_text == "Pause", f"Expected 'Pause', got: {initial_text}"
        
        pause_btn.click()
        time.sleep(0.5)
        
        new_text = pause_btn.text
        assert new_text == "Resume", f"Expected 'Resume' after click, got: {new_text}"
        print("✓ Pause button toggles correctly")
        
        # Resume
        pause_btn.click()
        
    def test_left_concert_button(self):
        """Test left concert button"""
        print("\nTest: Left concert button")
        left_btn = self.driver.find_element(By.ID, "leftConcertBtn")
        left_btn.click()
        time.sleep(0.5)
        print("✓ Left concert button is clickable")
        
    def test_right_concert_button(self):
        """Test right concert button"""
        print("\nTest: Right concert button")
        right_btn = self.driver.find_element(By.ID, "rightConcertBtn")
        right_btn.click()
        time.sleep(0.5)
        print("✓ Right concert button is clickable")
        
    def test_bus_arrives_button(self):
        """Test bus arrives button increases attendee count"""
        print("\nTest: Bus arrives button")
        
        # Get initial count
        attendee_count = self.driver.find_element(By.ID, "attendeeCount")
        initial_text = attendee_count.text
        initial_count = int(initial_text.split(":")[1].strip())
        
        # Click bus arrives
        bus_btn = self.driver.find_element(By.ID, "busArriveBtn")
        bus_btn.click()
        time.sleep(1)
        
        # Check new count
        new_text = attendee_count.text
        new_count = int(new_text.split(":")[1].strip())
        
        assert new_count > initial_count, f"Attendee count should increase: {initial_count} -> {new_count}"
        print(f"✓ Bus arrives increases attendee count: {initial_count} -> {new_count}")
        
    def test_speed_slider(self):
        """Test speed slider functionality"""
        print("\nTest: Speed slider")
        speed_slider = self.driver.find_element(By.ID, "speedSlider")
        speed_value = self.driver.find_element(By.ID, "speedValue")
        
        initial_value = speed_value.text
        assert "1.0x" in initial_value, f"Expected initial speed 1.0x, got: {initial_value}"
        
        # Change speed using JavaScript (more reliable than dragging in headless mode)
        self.driver.execute_script("arguments[0].value = 2.0; arguments[0].dispatchEvent(new Event('input'));", speed_slider)
        time.sleep(0.5)
        
        new_value = speed_value.text
        assert "2.0x" in new_value, f"Expected speed 2.0x, got: {new_value}"
        print(f"✓ Speed slider updates correctly: {initial_value} -> {new_value}")
        
    def test_accessibility_attributes(self):
        """Test that accessibility attributes are present"""
        print("\nTest: Accessibility attributes")
        
        # Check aria-labels
        pause_btn = self.driver.find_element(By.ID, "pauseBtn")
        assert pause_btn.get_attribute("aria-pressed") is not None
        print("✓ Pause button has aria-pressed attribute")
        
        speed_slider = self.driver.find_element(By.ID, "speedSlider")
        assert speed_slider.get_attribute("aria-label") is not None
        print("✓ Speed slider has aria-label")
        
        canvas = self.driver.find_element(By.ID, "canvas")
        assert canvas.get_attribute("aria-label") is not None
        print("✓ Canvas has aria-label")
        
    def run_all_tests(self):
        """Run all tests"""
        print("=" * 60)
        print("Festival Agent Simulation - Selenium Tests")
        print("=" * 60)
        
        try:
            self.setup()
            
            # Run all tests
            self.test_page_loads()
            self.test_all_controls_present()
            self.test_canvas_present()
            self.test_initial_attendee_count()
            self.test_fps_display()
            self.test_pause_button()
            self.test_left_concert_button()
            self.test_right_concert_button()
            self.test_bus_arrives_button()
            self.test_speed_slider()
            self.test_accessibility_attributes()
            
            print("\n" + "=" * 60)
            print("✓ All tests passed!")
            print("=" * 60)
            return True
            
        except AssertionError as e:
            print(f"\n✗ Test failed: {e}")
            return False
        except Exception as e:
            print(f"\n✗ Error during tests: {e}")
            return False
        finally:
            self.teardown()

if __name__ == "__main__":
    # Default URL, can be overridden with command line argument
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    tests = FestivalSimulationTests(url)
    success = tests.run_all_tests()
    
    sys.exit(0 if success else 1)
