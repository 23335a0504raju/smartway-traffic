from detector import VehicleDetector
import cv2
import numpy as np

def test_detector():
    print("Initializing Detector...")
    detector = VehicleDetector()
    
    # Create a dummy image (black background)
    print("Creating test image...")
    img = np.zeros((640, 640, 3), dtype=np.uint8)
    cv2.putText(img, "SmartWay Traffic", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    
    # Run detection
    print("Running detection...")
    result = detector.detect(img)
    
    print("Detection Result:")
    print(result)
    print("\nTest Completed Successfully!")

if __name__ == "__main__":
    test_detector()
