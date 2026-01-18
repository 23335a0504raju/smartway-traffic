from ultralytics import YOLO
import cv2
import numpy as np
import os

class VehicleDetector:
    
    def __init__(self, model_path="yolov8s.pt"):
        # Load the YOLOv8 model
        self.model = YOLO(model_path)
        
        # Classes: 0: person, 1: bicycle, 2: car ... 9: traffic light
        self.target_classes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        
        # 🔹 CHANGE 1 — ADD MODE FLAG (VERY IMPORTANT)
        self.DETECTION_MODE = "ADVANCED"  # Options: "SIMPLE", "ADVANCED"
        
        # Tracking State
        self.unique_vehicle_ids = set()
        self.total_counts = {} 
        self.id_history = {} 
        self.centroids = {} 
        self.speeds = {}     
        self.accident_buffer = 0
        self.frame_counter = 0

        # ===== ACCIDENT STATE MACHINE =====
        self.accident_confirmed = False
        self.accident_type = None
        self.accident_severity = None
        self.accident_reason = None
        
        # Speed tracking
        self.prev_speeds = {}
        self.accelerations = {}
        
        # Constants
        self.FRAME_SKIP = 10
        self.ACCIDENT_PRIORITY = {"FIRE": 4, "ROLLOVER": 3, "DAMAGED": 2, "COLLISION": 1}

        
    def set_mode(self, mode):
        """Explicitly switch detection mode."""
        if mode not in ["SIMPLE", "ADVANCED"]:
            print(f"WARNING: Invalid mode {mode}. Keeping {self.DETECTION_MODE}", flush=True)
            return
        self.DETECTION_MODE = mode
        print(f"DEBUG: Switched to {self.DETECTION_MODE} mode", flush=True)

    def reset(self):
        """Resets tracking state."""
        self.unique_vehicle_ids = set()
        self.total_counts = {}
        self.id_history = {}
        self.centroids = {}
        self.speeds = {}
        self.accident_confirmed = False
        self.accident_type = None
        self.accident_severity = None
        self.accident_reason = None
        self.accident_buffer = 0
        self.prev_speeds = {}
        self.accelerations = {}


    def assign_lane(self, bbox, frame_width):
        x1, _ , x2, _ = bbox
        center_x = (x1 + x2) / 2
        one_third = frame_width / 3
        two_thirds = 2 * frame_width / 3
        
        if center_x < one_third: return "Left Lane"
        elif center_x < two_thirds: return "Center Lane"
        else: return "Right Lane"

    def detect_traffic_light_color(self, frame, bbox):
        x1, y1, x2, y2 = bbox
        roi = frame[y1:y2, x1:x2]
        if roi.size == 0: return "Unknown"
        
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        h, w, _ = roi.shape
        total_pixels = h * w
        
        # Color Ranges
        lower_red1, upper_red1 = np.array([0, 70, 50]), np.array([10, 255, 255])
        lower_red2, upper_red2 = np.array([170, 70, 50]), np.array([180, 255, 255])
        lower_green, upper_green = np.array([35, 100, 100]), np.array([85, 255, 255])
        lower_yellow, upper_yellow = np.array([20, 100, 100]), np.array([35, 255, 255])
        
        mask_red = cv2.inRange(hsv, lower_red1, upper_red1) + cv2.inRange(hsv, lower_red2, upper_red2)
        mask_green = cv2.inRange(hsv, lower_green, upper_green)
        mask_yellow = cv2.inRange(hsv, lower_yellow, upper_yellow)
        
        red_count = cv2.countNonZero(mask_red)
        green_count = cv2.countNonZero(mask_green)
        yellow_count = cv2.countNonZero(mask_yellow)
        
        threshold = 0.05 * total_pixels
        
        if red_count > threshold and red_count > green_count and red_count > yellow_count: return "Red"
        elif green_count > threshold and green_count > red_count and green_count > yellow_count: return "Green"
        elif yellow_count > threshold: return "Yellow"
        return "Unknown"

    def detect_fire_smoke(self, frame, bbox):
        x1, y1, x2, y2 = bbox
        roi = frame[y1:y2, x1:x2]
        if roi.size == 0:
            return False

        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        
        lower_fire1 = np.array([5, 120, 150]) 
        upper_fire1 = np.array([30, 255, 255])
        
        mask_fire = cv2.inRange(hsv, lower_fire1, upper_fire1)
        fire_ratio = cv2.countNonZero(mask_fire) / mask_fire.size

        # Smoke: Low Saturation (Gray/White)
        lower_smoke = np.array([0, 0, 135])
        upper_smoke = np.array([180, 30, 255])
        mask_smoke = cv2.inRange(hsv, lower_smoke, upper_smoke)
        smoke_ratio = cv2.countNonZero(mask_smoke) / mask_smoke.size

        # STRICTER LOGIC v4 (Balanced):
        if fire_ratio > 0.60: 
            return False 
        
        if fire_ratio > 0.35:
             return True

        if fire_ratio > 0.15 and smoke_ratio > 0.25: 
            return True 
        
        return False

    # 🔹 CHANGE 2 — ADD SIMPLE ACCIDENT CHECK FUNCTION
    def simple_accident_check(self, frame, det, is_static=False):
        """Simple mode: ONLY catastrophic, obvious accidents"""
        
        if not is_static:
            return False, None

        x1, y1, x2, y2 = det["bbox"]
        label = det["class"]

        h = y2 - y1
        w = x2 - x1
        if w <= 0 or h <= 0:
            return False, None

        # 🚨 ABSOLUTE RULE: SIMPLE MODE NEVER FLAGS CAR ROLLOVER
        if label == "car":
            return False, None

        # ✅ ONLY BUS / TRUCK
        if label in ["bus", "truck"]:
            # Sideways + ground contact
            if w > h * 1.15 and y2 > frame.shape[0] * 0.6:
                return True, "ROLLOVER"

        # 🔥 FIRE (any vehicle, but must be near ground)
        if y2 > frame.shape[0] * 0.6:
            if self.detect_fire_smoke(frame, det["bbox"]):
                return True, "FIRE"

        return False, None

    # 🔴 CHANGE 1 — DAMAGE MUST BE LOCALIZED, NOT GLOBAL
    def is_localized_damage(self, edges):
        """Check if damage is localized in one quadrant (real damage) vs uniform (texture/noise)"""
        h, w = edges.shape
        if h < 4 or w < 4:  # Too small to analyze
            return False
            
        h2, w2 = h // 2, w // 2

        quadrants = [
            edges[0:h2, 0:w2],     # Top-Left
            edges[0:h2, w2:w],     # Top-Right
            edges[h2:h, 0:w2],     # Bottom-Left
            edges[h2:h, w2:w]      # Bottom-Right
        ]

        densities = []
        for q in quadrants:
            if q.size == 0:
                densities.append(0)
            else:
                densities.append(cv2.countNonZero(q) / q.size)

        max_q = max(densities)
        avg_q = sum(densities) / len(densities) if densities else 0

        # One quadrant must dominate (localized damage)
        # Uniform edges = texture/noise, not damage
        return max_q > avg_q * 2.2 and max_q > 0.15

    # 🔹 CHANGE 4 — ADD ROLLOVER CONFIDENCE FUNCTION (NEW)
    def rollover_confidence(self, frame, bbox, label, speed=0, is_static=False):
        """
        Returns rollover confidence between 0.0 – 1.0
        """
        x1, y1, x2, y2 = bbox
        roi = frame[y1:y2, x1:x2]
        if roi.size == 0:
            return 0.0

        h, w, _ = roi.shape
        if w == 0 or h == 0:
            return 0.0

        aspect_ratio = w / h  # width / height (Note: OpenCV/Numpy check usually h,w) -> Aspect=W/H

        score = 0.0

        # 1️⃣ Sideways geometry (PRIMARY)
        if aspect_ratio > 1.6 or aspect_ratio < 0.45:
            score += 0.4

        # 2️⃣ Ground contact (VERY IMPORTANT)
        if y2 > frame.shape[0] * 0.65:
            score += 0.3

        # 3️⃣ Static condition
        if is_static or speed < 1.0:
            score += 0.2

        # 4️⃣ Visual damage reinforcement
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 80, 160)
        edge_density = cv2.countNonZero(edges) / edges.size if edges.size else 0

        if edge_density > 0.22:
            score += 0.1

        return min(score, 1.0)

    # 🔹 CHANGE 2 — REFACTOR is_damaged_or_rollover (CLEAN)
    def is_damaged_or_rollover(self, frame, bbox, label, speed=0, is_static=False):
        """
        Returns (bool, type, confidence)
        type ∈ {"ROLLOVER", "DAMAGED", None}
        """

        # ---------- ROLLOVER ----------
        # 🚨 ABSOLUTE SAFETY (FIX 2)
        if label == "person":
             return False, None, 0.0

        # ---------- ROLLOVER ----------
        rollover_score = self.rollover_confidence(
            frame, bbox, label, speed=speed, is_static=is_static
        )

        # Thresholds (FIX 3 - STRICT SPLIT)
        
        # 1. STATIC SCENES: HEAVY VEHICLES ONLY
        if is_static:
            if label in ["bus", "truck"] and rollover_score >= 0.70:
                return True, "ROLLOVER", rollover_score
            # Cars in static scenes CANNOT trigger rollover here (Fix 1/3)
            # They might fall through to damage check if logic permits

        if not is_static:
            if label == "car" and rollover_score >= 0.80:
                 # FIX 2: Cars must show damage to be considered rollover
                 # FIX 1: RAW CODE REPLACE (No helper function)
                 x1, y1, x2, y2 = bbox
                 roi = frame[y1:y2, x1:x2]
                 if roi.size == 0:
                     edge_density = 0.0
                 else:
                     gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
                     clahe_roi = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8)).apply(gray_roi)
                     edges_roi = cv2.Canny(clahe_roi, 25, 75)
                     edge_density = cv2.countNonZero(edges_roi) / edges_roi.size if edges_roi.size else 0

                 if edge_density < 0.25:
                    return False, None, 0.0
                 return True, "ROLLOVER", rollover_score
            
            # Bus/Truck in dynamic
            elif label in ["bus", "truck"] and rollover_score >= 0.80:
                return True, "ROLLOVER", rollover_score

        # ---------- DAMAGE ----------
        x1, y1, x2, y2 = bbox
        roi = frame[y1:y2, x1:x2]
        if roi.size == 0:
            return False, None, 0.0

        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        gray = clahe.apply(gray)
        
        edges = cv2.Canny(gray, 25, 75)
        
        # 🔴 CHANGE 1 — CHECK FOR LOCALIZED DAMAGE
        if not self.is_localized_damage(edges):
            return False, None, 0.0
        
        edge_pixels = cv2.countNonZero(edges)
        total_pixels = (y2-y1) * (x2-x1)
        
        if total_pixels == 0: return False, None, 0.0
        edge_density = edge_pixels / total_pixels
        
        # --- QUADRANT CHECK (Localized Damage) ---
        if is_static:
            h, w = edges.shape
            h2, w2 = h // 2, w // 2
            quadrants = [
                edges[0:h2, 0:w2],     # Top-Left
                edges[0:h2, w2:w],     # Top-Right
                edges[h2:h, 0:w2],     # Bottom-Left
                edges[h2:h, w2:w]      # Bottom-Right
            ]
            for q in quadrants:
                q_pixels = cv2.countNonZero(q)
                q_total = (h2 * w2)
                if q_total > 0:
                    q_density = q_pixels / q_total
                    if q_density > 0.12: 
                        return True, "DAMAGED", q_density

        # THRESHOLDS
        thresh = 0.18 if is_static else 0.35
        if label == 'bus': thresh += 0.20
        
        if edge_density > thresh:
            return True, "DAMAGED", edge_density
            
        return False, None, 0.0

    def is_crash_motion(self, det):
        """Only for VIDEO - detects sudden deceleration/stops"""
        tid = det.get("track_id", -1)
        speed = det.get("speed", 0)
        accel = self.accelerations.get(tid, 0)

        # Sudden deceleration
        if accel < -8.0 and speed < 6.0:
            return True

        # Sudden stop
        if speed < 2.0 and abs(accel) > 6.0:
            return True

        return False
        


    # 🔴 CHANGE 3 — COLLISION MUST HAVE GEOMETRIC CONTRADICTION
    def is_head_on_or_side_hit(self, box1, box2):
        """Check if vehicles have different orientations (head-on or side hit)"""
        w1 = box1[2] - box1[0]
        h1 = box1[3] - box1[1]
        w2 = box2[2] - box2[0]
        h2 = box2[3] - box2[1]
        
        if w1 == 0 or h1 == 0 or w2 == 0 or h2 == 0:
            return False
            
        # Calculate aspect ratios
        ar1 = w1 / h1
        ar2 = w2 / h2
        
        # 🔴 CHANGE 3 — Tighten geometric contradiction check
        return (
            abs(ar1 - ar2) > 0.7 and
            min(w1, h1) > 40 and
            min(w2, h2) > 40
        )

    def check_collisions(self, detections, frame, is_static=False):
        """
        Checks for overlapping bounding boxes.
        """
        colliding_indices = set()
        vehicle_ids = {1, 2, 3, 5, 7}
        
        for i in range(len(detections)):
            if detections[i]['cls_id'] not in vehicle_ids: continue
            for j in range(i + 1, len(detections)):
                if detections[j]['cls_id'] not in vehicle_ids: continue
            
                box1 = detections[i]['bbox']
                box2 = detections[j]['bbox']
                
                # Check Overlap
                lx = max(box1[0], box2[0])
                ly = max(box1[1], box2[1])
                rx = min(box1[2], box2[2])
                ry = min(box1[3], box2[3])
                
                if lx < rx and ly < ry:
                    intersection_area = (rx - lx) * (ry - ly)
                    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
                    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
                    iou = intersection_area / float(area1 + area2 - intersection_area)
                    
                    if is_static:
                        if iou > 0.45 and self.is_head_on_or_side_hit(box1, box2):
                            # For static, check damage on either vehicle
                            dmg1, _, _ = self.is_damaged_or_rollover(frame, box1, detections[i]['class'], speed=0, is_static=True)
                            dmg2, _, _ = self.is_damaged_or_rollover(frame, box2, detections[j]['class'], speed=0, is_static=True)
                            
                            if dmg1 or dmg2:
                                print(f"DEBUG: Verified Collision (IoU: {iou:.2f}) with orientation mismatch.", flush=True)
                                colliding_indices.add(i)
                                colliding_indices.add(j)
                            else:
                                pass # Just traffic jam overlap
                            
                    else:
                        # For video, check overlap + crash motion
                        if iou > 0.35:
                            if self.is_crash_motion(detections[i]) or self.is_crash_motion(detections[j]):
                                colliding_indices.add(i)
                                colliding_indices.add(j)
                            
        return colliding_indices

    def detect(self, frame, is_static=False):
        if frame is None:
            print("ERROR: Frame is None in detect()", flush=True)
            return {"count": 0, "emergency": False, "accident": False}

        # 🚨 HARD AUTO-STATIC OVERRIDE (FINAL SAFETY NET) (FIX 2)
        if not hasattr(self, "_motion_initialized"):
            self._motion_initialized = True
            is_static = True

        # FIX 3: ADD ONE DEBUG LINE (TEMPORARY)
        print(f"DEBUG: detect() called | is_static={is_static}", flush=True)

        # 🚨 FORCE SIMPLE MODE FOR STATIC SCENES (FIX 1)
        # REMOVED GLOBAL MUTATION: self.DETECTION_MODE = "SIMPLE"

        # HARD RULE: SIMPLE mode only allowed for static images
        if not is_static:
            current_mode = "ADVANCED"
        else:
            current_mode = "SIMPLE"
            # ISSUE 3: Reset buffer in static mode to prevent accumulation
            self.accident_buffer = 0

        # 🚨 HARD RESET PER FRAME (CRITICAL FIX)
        self.accident_confirmed = False
        self.accident_type = None
        self.accident_severity = None
        self.accident_reason = None
        self.emergency_signal = False

        self.frame_counter += 1
        results = self.model.track(frame, persist=True, tracker="bytetrack.yaml", conf=0.45, verbose=False)[0]
        
        detections = []
        vehicle_count = 0
        
        height, width, _ = frame.shape
        lane_data = {"Left Lane": 0, "Center Lane": 0, "Right Lane": 0}
        signals = {"Red": 0, "Green": 0, "Yellow": 0}
        
        # Count people for emergency detection
        person_count = 0
        stopped_vehicles = 0
        
        # Get frame area for size filtering
        frame_area = frame.shape[0] * frame.shape[1]
        
        # Initialize evidence variables safely at start
        damage_votes = 0
        evidence_count = 0
        
        # 1. Collect Detections
        raw_detections = []
        if results.boxes:
            for box in results.boxes:
                id_val = int(box.id[0]) if box.id is not None else -1
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                
                if cls_id in self.target_classes and conf > 0.25:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    label = self.model.names[cls_id]
                    
                    # Count people
                    if cls_id == 0:  # person
                        person_count += 1
                    
                    # Counting Logic
                    if is_static:
                         self.total_counts[label] = self.total_counts.get(label, 0) + 1
                    elif id_val != -1:
                        self.id_history[id_val] = self.id_history.get(id_val, 0) + 1
                        if self.id_history[id_val] > 15 and id_val not in self.unique_vehicle_ids:
                            self.unique_vehicle_ids.add(id_val)
                            self.total_counts[label] = self.total_counts.get(label, 0) + 1
                    
                    # Speed calculation (only for video)
                    current_speed = 0
                    if not is_static and id_val != -1:
                        cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                        if id_val in self.centroids:
                            prev_cx, prev_cy = self.centroids[id_val]
                            current_speed = np.sqrt((cx - prev_cx)**2 + (cy - prev_cy)**2)
                        else:
                            current_speed = 10.0
                        
                        prev_speed = self.prev_speeds.get(id_val, current_speed)
                        acceleration = (current_speed - prev_speed) / self.FRAME_SKIP
                        
                        if abs(acceleration) > 50:
                            acceleration = 0

                        self.prev_speeds[id_val] = current_speed
                        self.centroids[id_val] = (cx, cy)
                        self.speeds[id_val] = current_speed
                        self.accelerations[id_val] = acceleration
                        
                        # Count stopped vehicles
                        if current_speed < 2.0:
                            stopped_vehicles += 1
                    
                    raw_detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "class": label,
                        "confidence": conf,
                        "cls_id": cls_id,
                        "track_id": id_val,
                        "speed": current_speed,
                        "damage_checked": None
                    })

        # 2. Check Collisions (Optimize: Skip in SIMPLE mode)
        colliding_indices = set()
        # FIX 4: Use current_mode instead of outdated self.DETECTION_MODE
        if current_mode == "ADVANCED":
            colliding_indices = self.check_collisions(raw_detections, frame, is_static)
        
        # 3. Label & Visualize
        for i, det in enumerate(raw_detections):
            vehicle_count += 1
            x1, y1, x2, y2 = det['bbox']
            label = det['class']
            color = (0, 255, 0)
            
            # Draw
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            detections.append({
                "bbox": [x1, y1, x2, y2],
                "class": label,
                "confidence": det['confidence'],
                "cls_id": det['cls_id'],
                "track_id": det['track_id']
            })
            
            # Traffic Light
            if det['cls_id'] == 9:
                light_color = self.detect_traffic_light_color(frame, (x1, y1, x2, y2))
                if light_color != "Unknown":
                    signals[light_color] += 1
                    
            # Lane
            if det['cls_id'] in list(range(9)):
                lane = self.assign_lane((x1, y1, x2, y2), width)
                lane_data[lane] += 1

        # =========================
        # ACCIDENT STATE MACHINE
        # =========================
        accident_signal = False
        detected_type = None
        self.accident_reason = None
        accident_label = None # Track the class causing the accident
        
        # Emergency signal
        emergency_signal = False

        # 🔹 CHANGE 3 — SPLIT ACCIDENT LOGIC
        # 🔴 MODE SWITCH
        if current_mode == "SIMPLE":
            print(f"DEBUG: Using SIMPLE mode detection", flush=True)
            # FIX: Reset counts in SIMPLE mode to prevent leakage
            self.total_counts = {} 
            for det in raw_detections:
                # Improvement 1: Ignore weak detections in SIMPLE mode
                if det["confidence"] < 0.4:
                    continue

                if det["cls_id"] in [2, 5, 7]:  # car, bus, truck
                    is_acc, acc_type = self.simple_accident_check(frame, det, is_static)
                    if is_acc:
                        print(f"DEBUG: SIMPLE mode - Accident detected: {acc_type}", flush=True)
                        # Visual Proof
                        cv2.putText(frame, f"ACCIDENT DETECTED: {acc_type}", (30, 50), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
                        self.accident_confirmed = True
                        self.accident_type = acc_type
                        self.accident_severity = "CRITICAL"
                        self.accident_reason = "Simple mode detection"
                        emergency_signal = True
                        break
            
            # BUG 2 FIX: Early exit for SIMPLE mode to prevent overwrite
            if current_mode == "SIMPLE" and self.accident_confirmed:
                return {
                    "mode": self.DETECTION_MODE,
                    "count": vehicle_count,
                    "emergency": True,
                    "accident": True,
                    "accident_type": self.accident_type,
                    "accident_reason": self.accident_reason,
                    "severity": self.accident_severity,
                    "lane_data": lane_data,
                    "signals": signals,
                    "detections": detections,
                    "person_count": person_count,
                    "damage_votes": 0,
                    "evidence_count": 1
                }
            
            # 🔒 HARD STOP: STATIC FRAMES MUST NEVER FALL INTO ADVANCED LOGIC (FIX 1)
            if is_static:
                return {
                    "mode": "SIMPLE",
                    "count": vehicle_count,
                    "emergency": emergency_signal,
                    "accident": self.accident_confirmed,
                    "accident_type": self.accident_type,
                    "accident_reason": self.accident_reason,
                    "severity": self.accident_severity,
                    "lane_data": lane_data,
                    "signals": signals,
                    "detections": detections,
                    "person_count": person_count,
                    "damage_votes": 1 if self.accident_confirmed else 0,
                    "evidence_count": 1 if self.accident_confirmed else 0
                }



        else:
            # 🔵 ADVANCED MODE LOGIC (KEEP EXISTING)
            print(f"DEBUG: Using ADVANCED mode detection", flush=True)
            
            # ✅ CORRECT ACCIDENT DECISION TREE
            if is_static or self.is_low_motion_scene(raw_detections):
                # ===========================================
                # STATIC OR NEAR-STATIC SCENE LOGIC
                # ===========================================
                print(f"DEBUG: Processing static/near-static scene", flush=True)
                
                # Damage voting
                damage_votes = 0
                rollover_votes = 0
                fire_detected = False
                
                # Check fire only on vehicles near bottom half (ground contact)
                for det in raw_detections:
                    if det['cls_id'] in [2, 5, 7]:  # vehicles
                        x1, y1, x2, y2 = det['bbox']
                        # Only check fire if vehicle is in bottom half of frame
                        if y2 > frame.shape[0] * 0.5:
                            if self.detect_fire_smoke(frame, det['bbox']):
                                fire_detected = True
                                print(f"DEBUG: Localized fire detected on vehicle at bottom half", flush=True)
                                break
                
                # Check damage on all vehicles
                for det in raw_detections:
                    if det['cls_id'] in [5, 7]:  # FIX 1: bus, truck ONLY for static rollover process
                        # 🔴 CHANGE 2 — STATIC DAMAGE NEEDS VEHICLE ISOLATION
                        # Ignore very small boxes (noise)
                        x1, y1, x2, y2 = det['bbox']
                        box_area = (x2 - x1) * (y2 - y1)
                        
                        # FIX 2: Never skip large vehicles
                        # 🚨 Never skip large vehicles
                        if det['class'] not in ['bus', 'truck']:
                            if box_area < 0.003 * frame_area:
                                print(f"DEBUG: Skipping small vehicle: {det['class']}", flush=True)
                                continue
                        
                        if det['damage_checked'] is None:
                            is_dmg, dmg_type, conf = self.is_damaged_or_rollover(
                                frame, det['bbox'], det['class'], speed=0, is_static=True
                            )
                            det['damage_checked'] = (is_dmg, dmg_type)
                        else:
                            is_dmg, dmg_type = det['damage_checked']
                            
                        # Count votes
                        if is_dmg:
                            damage_votes += 1
                            print(f"DEBUG: Damage vote for {det['class']}: {dmg_type}", flush=True)
                        if dmg_type == "ROLLOVER":
                            rollover_votes += 1
                
                # MULTI-EVIDENCE GATE
                evidence_count = 0
                if fire_detected: 
                    evidence_count += 1
                    print(f"DEBUG: Evidence 1: Fire detected", flush=True)
                if rollover_votes >= 1: 
                    # 🚨 ROLLOVER IS ALWAYS AN ACCIDENT (FIX 3)
                    # FIX 3: EVIDENCE GATE FOR ROLLOVER
                    # Rollover evidence rules - Only Bus/Truck is immediate, cars need backup
                    if any(det['class'] in ['bus', 'truck'] for det in raw_detections):
                        accident_signal = True
                        detected_type = "ROLLOVER"
                        accident_label = "heavy_vehicle" # FIX: Set label
                        self.accident_severity = "CRITICAL"
                        self.accident_reason = "Heavy Vehicle rollover detected"
                        evidence_count += 1
                        print(f"DEBUG: Evidence 2: Rollover detected on {det['class']} -> IMMEDIATE CRITICAL", flush=True)
                    elif damage_votes >= 1 or len(colliding_indices) >= 1:
                        accident_signal = True
                        detected_type = "ROLLOVER"
                        accident_label = "car_verified" # FIX: Set label
                        self.accident_severity = "CRITICAL"
                        self.accident_reason = "Car Rollover confirmed with damage/collision"
                        evidence_count += 1
                        print(f"DEBUG: Evidence 2: Car Rollover confirmed with evidence", flush=True)
                    else:
                        print(f"DEBUG: REJECTED - Single car rollover candidate without damage/collision", flush=True)
                if damage_votes >= 2: 
                    evidence_count += 1
                    print(f"DEBUG: Evidence 3: Multiple damaged vehicles ({damage_votes})", flush=True)
                if len(colliding_indices) >= 1: 
                    evidence_count += 1
                    print(f"DEBUG: Evidence 4: Collision detected", flush=True)
                
                print(f"DEBUG: Total evidence count: {evidence_count}", flush=True)
                
                # Apply voting logic WITH EVIDENCE REQUIREMENT
                if evidence_count >= 2:
                    if fire_detected:
                        accident_signal = True
                        detected_type = "FIRE"
                        self.accident_reason = "Fire + other evidence"
                    elif rollover_votes >= 1:
                        accident_signal = True
                        detected_type = "ROLLOVER"
                        self.accident_reason = f"Rollover + other evidence"
                    elif damage_votes >= 2:
                        accident_signal = True
                        detected_type = "DAMAGED"
                        self.accident_reason = f"Multiple damaged vehicles + other evidence"
                    elif len(colliding_indices) >= 1:
                        accident_signal = True
                        detected_type = "COLLISION"
                        self.accident_reason = "Collision + other evidence"
                
                # --- ACCIDENT SEVERITY LOGIC ---
                # FIX 2: Assign type for single-evidence cases
                if evidence_count == 1:
                    if rollover_votes >= 1:
                        detected_type = "ROLLOVER"
                        self.accident_reason = "Single-vehicle rollover"
                    elif fire_detected:
                        detected_type = "FIRE"
                        self.accident_reason = "Fire detected"
                    elif damage_votes >= 1:
                        detected_type = "DAMAGED"
                        self.accident_reason = "Single-vehicle damage"
                    elif len(colliding_indices) >= 1:
                        detected_type = "COLLISION"
                        self.accident_reason = "Minor collision"

                # ================= FINAL ACCIDENT DECISION =================
                # FIX 3: Consolidated Logic (No Overwrites)

                if detected_type in ["ROLLOVER", "FIRE"]:
                    accident_signal = True
                    self.accident_severity = "CRITICAL"
                    # Reason already set above

                elif evidence_count >= 2:
                    accident_signal = True
                    self.accident_severity = "CRITICAL"

                elif evidence_count == 1:
                    accident_signal = True
                    self.accident_severity = "LOW"

                else:
                    accident_signal = False
                    print(f"DEBUG: REJECTED - No significant evidence (Count: {evidence_count})", flush=True)
                        
            else:
                # ===========================================
                # DYNAMIC VIDEO LOGIC (requires crash motion)
                # ===========================================
                print(f"DEBUG: Processing dynamic video scene", flush=True)
                
                # A. COLLISION SIGNAL
                if len(colliding_indices) >= 2:
                    accident_signal = True
                    detected_type = "COLLISION"
                    self.accident_reason = "Multiple vehicles colliding"
                    print(f"DEBUG: Dynamic accident - Collision with crash motion", flush=True)

                # B. CRASH MOTION + DAMAGE
                if not accident_signal:
                    damage_votes = 0
                    for det in raw_detections:
                        if det['cls_id'] in [2, 5, 7]:  # car, bus, truck
                            # Only check damage if crash motion detected
                            if self.is_crash_motion(det):
                                if det['damage_checked'] is None:
                                    is_dmg, dmg_type, conf = self.is_damaged_or_rollover(
                                        frame, det['bbox'], det['class'], speed=det.get('speed', 0), is_static=False
                                    )
                                    det['damage_checked'] = (is_dmg, dmg_type)
                                else:
                                    is_dmg, dmg_type = det['damage_checked']
                                    
                                if is_dmg:
                                    damage_votes += 1
                                    print(f"DEBUG: Dynamic damage vote for {det['class']}: {dmg_type}", flush=True)
                    
                    # For video, still need multi-evidence
                    if damage_votes >= 2:
                        accident_signal = True
                        detected_type = "DAMAGED"
                        self.accident_reason = f"Crash motion + multiple damaged vehicles"
                    elif damage_votes == 1:
                        # Single damaged vehicle needs additional evidence
                        evidence_count = 0
                        if len(colliding_indices) >= 1: evidence_count += 1
                        if damage_votes >= 1: evidence_count += 1
                        
                        if evidence_count >= 2:
                            accident_signal = True
                            detected_type = "DAMAGED"
                            self.accident_reason = "Crash motion + damage + collision"
                        else:
                            print(f"DEBUG: REJECTED - Single damaged vehicle without other evidence", flush=True)
                
                # C. FIRE in dynamic scene (upgrades existing accident)
                if accident_signal:
                    for det in raw_detections:
                        if det['cls_id'] in [2, 5, 7]:
                            if self.detect_fire_smoke(frame, det['bbox']):
                                # Upgrade to FIRE if higher priority
                                if self.ACCIDENT_PRIORITY.get("FIRE", 0) > self.ACCIDENT_PRIORITY.get(detected_type, 0):
                                    detected_type = "FIRE"
                                    self.accident_reason = "Fire detected after crash"

            # ✅ STATIC ROLLOVER CONFIRMATION (POST-ACCIDENT SCENES)
            # FIX 1: Restrict double-confirmation to prevent false positives
            # FIX: STATIC FRAMES MUST NEVER ENTER HERE (Dynamic Low Motion ONLY)
            if (not is_static and self.is_low_motion_scene(raw_detections)) and not accident_signal:
                for det in raw_detections:
                    if det['class'] in ['bus', 'truck']:
                        # Use Confidence Score instead of raw geometry
                        conf = self.rollover_confidence(frame, det['bbox'], det['class'], speed=0, is_static=True)
                        
                        # High confidence threshold for static confirmation
                        if conf >= 0.75:
                            print(f"DEBUG: Static rollover confirmed in ADVANCED mode (Conf: {conf:.2f})", flush=True)
                            accident_signal = True
                            detected_type = "ROLLOVER"
                            accident_label = det['class'] # FIX: Set label
                            self.accident_severity = "CRITICAL"
                            self.accident_reason = "Vehicle overturned and stationary"
                            damage_votes = max(damage_votes, 1)
                            break


        
            # Safety check
            if accident_signal and detected_type is None:
                detected_type = "COLLISION"
                self.accident_reason = "Accident detected (type unspecified)"

            # FIX 5: FINAL ROLLOVER GATE
            if detected_type == "ROLLOVER":
                 # If we somehow have a car rollover signal without collision/fire backup
                 if accident_label == "car" or (accident_label is None and not len(colliding_indices) and not fire_detected):
                      print("DEBUG: Blocking car rollover without collision/fire (Final Gate)", flush=True)
                      accident_signal = False
                      detected_type = None

        # 🔹 CHANGE 4 — BYPASS BUFFER IN SIMPLE MODE
        # TEMPORAL CONFIRMATION
        # FIX: Static scenes never use temporal buffer
        if current_mode == "ADVANCED" and not is_static:
            if accident_signal:
                # Faster buffer for static scenes
                self.accident_buffer += 3 if is_static else 2
                print(f"DEBUG: Accident signal TRUE - buffer: {self.accident_buffer}", flush=True)
            else:
                self.accident_buffer = max(0, self.accident_buffer - 1)
                print(f"DEBUG: Accident signal FALSE - buffer: {self.accident_buffer}", flush=True)

            # FINAL CONFIRMATION
            # FIX: Only confirm if we have a valid signal AND buffer threshold
            if accident_signal and not self.accident_confirmed and self.accident_buffer >= 5:
                print(f"DEBUG: Accident Confirmed! Type: {detected_type}, Reason: {self.accident_reason}", flush=True)
                self.accident_confirmed = True
                self.accident_type = detected_type
                # Priority-based severity
                self.accident_severity = "CRITICAL" if detected_type in ["ROLLOVER", "FIRE"] else "HIGH"
                self.total_counts["ACCIDENT"] = 1
        else:
            # SIMPLE MODE - Already confirmed above, just update counts
            if self.accident_confirmed:
                self.total_counts["ACCIDENT"] = 1

        # � FINAL EMERGENCY GATE (ABSOLUTE)
        # FIX 2 & 3: UI / API OUTPUT SAFETY
        if self.accident_confirmed is True:
            if self.accident_severity == "CRITICAL":
                emergency_signal = True
                print(f"DEBUG: Emergency signal TRUE - Critical Accident ({self.accident_type})", flush=True)
            else:
                emergency_signal = False
                print(f"DEBUG: Emergency signal FALSE - Accident confirmed but severity is {self.accident_severity}", flush=True)
        else:
            emergency_signal = False
            print(f"DEBUG: Emergency signal FALSE - No accident confirmed", flush=True)

        # FIX 5: GLOBAL SAFETY KILL SWITCH (LAST LINE OF DEFENSE)
        if self.accident_type == "ROLLOVER":
            if damage_votes == 0 and not is_static and not accident_signal:
                # If we are in video, but no damage votes, kill the rollover signal
                print("DEBUG: Kill Switch - Rollover suppressed due to lack of damage evidence in video", flush=True)
                self.accident_confirmed = False
                self.accident_type = None
                emergency_signal = False

        # 🔹 CHANGE 5 — UI / RESULT OUTPUT
        return {
            "mode": current_mode,  # Added mode info
            "count": vehicle_count,
            "emergency": emergency_signal,
            "accident": self.accident_confirmed,
            "accident_type": self.accident_type,
            "accident_reason": self.accident_reason,
            "severity": self.accident_severity,
            "lane_data": lane_data,
            "signals": signals,
            "detections": detections,
            "person_count": person_count,
            "damage_votes": damage_votes,
            "evidence_count": evidence_count
        }

    def is_low_motion_scene(self, raw_detections):
        """Detect if scene has little motion (for hybrid static/dynamic logic)"""
        if not raw_detections:
            return True
            
        moving_vehicles = 0
        for det in raw_detections:
            if det['cls_id'] in [2, 5, 7] and det.get('speed', 0) > 2.0:
                moving_vehicles += 1
                
        # If less than 20% of vehicles are moving, treat as static
        return moving_vehicles < len(raw_detections) * 0.2

    def process_video(self, video_path):
        # ISSUE 4: Reset counts throughout the system at start of new video
        self.reset()

        # Determine Check
        ext = os.path.splitext(video_path)[1].lower()
        is_video_ext = ext in ['.mp4', '.avi', '.mov', '.mkv']
        
        frame = None
        if not is_video_ext:
            frame = cv2.imread(video_path)
            
        is_image = (not is_video_ext) and (frame is not None)
        
        if is_image:
             if frame is None: 
                 frame = cv2.imread(video_path)
             
             if frame is None:
                 print(f"ERROR: Could not read image at {video_path}", flush=True)
                 return self.total_counts, 0, False, video_path

             # Single Pass - ALWAYS treat as static
             # FORCE SIMPLE MODE FOR STATIC / ACCIDENT SCENES (FIX 1: Handled in detect now)
             # self.set_mode("SIMPLE")  <-- REMOVED
             result = self.detect(frame, is_static=True)
             return self.total_counts, result["count"], result["emergency"], video_path
        else:
            # Video Logic
            # FIX 5: DEFINE cap
            cap = cv2.VideoCapture(video_path)
            max_vehicles = 0
            has_em = False
            
            frame_cnt = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret: break
                frame_cnt += 1
                if frame_cnt % 10 != 0: continue
                
                # Auto-detect if scene is static or dynamic
                is_likely_static = frame_cnt < 30  # Quick pre-check
                
                # Removed per-frame mode switching to prevent flipping
                res = self.detect(frame, is_static=is_likely_static)
                if res["count"] > max_vehicles:
                    max_vehicles = res["count"]
                if res["emergency"]: 
                    has_em = True
                    # Once emergency detected, we can stop early
                    break
                
            cap.release()
            return self.total_counts, max_vehicles, has_em, None