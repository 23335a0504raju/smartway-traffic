import os
import sys
import cv2
import numpy as np
import base64
import asyncio
import json
import uuid
import zipfile
import shutil
import sumo_parser
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sse_starlette.sse import EventSourceResponse

from detector import VehicleDetector
from traffic_logic import TrafficController
import threading
import time

# SUMO libraries are only available if Eclipse SUMO is installed.
# The server will start normally without SUMO; SUMO routes will be disabled.
try:
    import traci
    import sumolib
    SUMO_AVAILABLE = True
except ImportError:
    SUMO_AVAILABLE = False
    print("WARNING: SUMO (traci/sumolib) not found. SUMO simulation routes will be unavailable.")

# =========================
# Environment & App Setup
# =========================

load_dotenv()

app = FastAPI(title="SmartWay Traffic AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# Model Initialization
# =========================

try:
    detector = VehicleDetector()
    print("YOLOv8 Model Loaded Successfully")
except Exception as e:
    print(f"Model Load Failed: {e}")
    detector = None

controller = TrafficController()

# =========================
# Global Traffic State
# =========================

traffic_state = {
    "junctions": {
        "J-01": {"density": 0, "status": "green", "emergency": False},
        "J-02": {"density": 0, "status": "red", "emergency": False},
        "J-03": {"density": 0, "status": "red", "emergency": False},
        "J-04": {"density": 0, "status": "green", "emergency": False},
    },
    "alerts": [],
    "mode": "AI_OPTIMIZED"
}

# =========================
# SUMO Simulation Globals
# =========================

SUMO_GUI_BINARY = "sumo-gui" 
sim_status = {
    "running": False,
    "step": 0,
    "emergency_active": False,
    "current_green_phase": "NS",
    "lane_counts": {
        "E0_0": 0, "E1_0": 0, "E2_0": 0, "E3_0": 0
    }
}
SIM_DELAY = 0.1

def run_simulation_loop():
    global sim_status
    sim_config = os.path.join(os.path.dirname(__file__), "sumo_sim", "sim.sumocfg")
    
    try:
        if 'SUMO_HOME' in os.environ:
             tools = os.path.join(os.environ['SUMO_HOME'], 'tools')
             sys.path.append(tools)
        
        traci.start([SUMO_GUI_BINARY, "-c", sim_config, "--start"])
        sim_status["running"] = True
        
        step = 0
        while traci.simulation.getMinExpectedNumber() > 0:
            if not sim_status["running"]:
                break
                
            traci.simulationStep()
            step += 1
            sim_status["step"] = step

            # DENSITY ESTIMATION
            counts = {
                "E0_0": traci.lane.getLastStepVehicleNumber("E0_0"),
                "E1_0": traci.lane.getLastStepVehicleNumber("E1_0"),
                "E2_0": traci.lane.getLastStepVehicleNumber("E2_0"),
                "E3_0": traci.lane.getLastStepVehicleNumber("E3_0")
            }
            sim_status["lane_counts"] = counts
            
            # EMERGENCY DETECTION
            emergency_detected = False
            vehicle_ids = traci.vehicle.getIDList()
            for vid in vehicle_ids:
                if traci.vehicle.getTypeID(vid) == "ambulance":
                    if traci.vehicle.getRoadID(vid) in ["E0", "E1", "E2", "E3"]:
                        emergency_detected = True
                        break
            sim_status["emergency_active"] = emergency_detected

            time.sleep(SIM_DELAY)
            
        traci.close()
    except Exception as e:
        print(f"Simulation Error: {e}")
    finally:
        sim_status["running"] = False

# =========================
# API Models
# =========================

class OverrideRequest(BaseModel):
    junction_id: str
    action: str
    mode: str = "MANUAL"

class ProcessRequest(BaseModel):
    filename: str

# =========================
# Helpers
# =========================

def get_upload_path(filename):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "..", "backend", "uploads", filename)

# =========================
# Core SSE Generator
# =========================

async def generate_frames(video_path):
    if detector is None:
        yield {"data": json.dumps({"error": "AI model not loaded. Check server logs.", "completed": True})}
        return

    img = cv2.imread(video_path)
    is_image = img is not None
    cap = None if is_image else cv2.VideoCapture(video_path)

    detector.reset()
    snapshot_path = None
    snapshot_taken = False

    def stream():
        if is_image:
            yield True, img
        else:
            while cap.isOpened():
                yield cap.read()

    for ok, frame in stream():
        if not ok:
            break

        # ✅ FIXED (CORRECT): Force static mode for images / single frames
        res = detector.detect(frame, is_static=is_image)

        # SNAPSHOT ONLY ON CONFIRMED ACCIDENT OR STATIC IMAGE
        if (res["emergency"] or is_image) and not snapshot_taken:
            snapshot_path = f"{os.path.dirname(video_path)}/snapshot_{uuid.uuid4().hex}.jpg"
            cv2.imwrite(snapshot_path, frame)
            snapshot_taken = True

        _, buf = cv2.imencode(".jpg", frame)
        payload = {
            "frame": base64.b64encode(buf).decode(),
            "counts": detector.total_counts,
            "emergency": res["emergency"],
            "accident_type": res["accident_type"],
            "severity": res["severity"],
            "snapshot_path": snapshot_path,
            "completed": False
        }

        yield {"data": json.dumps(payload)}
        await asyncio.sleep(0.02)

    # Force capture from detector state at end
    final_type = detector.accident_type if detector.accident_confirmed else None
    final_sev = detector.accident_severity if detector.accident_confirmed else None
    
    print(f"DEBUG: Final Yield - Emergency: {detector.accident_confirmed}, Type: {final_type}", flush=True)

    # Single final completion payload (duplicate removed)
    yield {"data": json.dumps({
        "completed": True,
        "counts": detector.total_counts,
        "emergency": detector.accident_confirmed,
        "accident_type": final_type,
        "severity": final_sev,
        "snapshot_path": snapshot_path
    })}

# =========================
# Routes
# =========================

@app.get("/")
def root():
    return {"status": "AI Engine Online", "model_ready": detector is not None}

@app.post("/traffic/override")
def override_signal(req: OverrideRequest):
    if req.junction_id not in traffic_state["junctions"]:
        raise HTTPException(404, "Invalid junction")

    traffic_state["mode"] = req.mode
    for jid in traffic_state["junctions"]:
        traffic_state["junctions"][jid]["status"] = "red"

    traffic_state["junctions"][req.junction_id]["status"] = req.action
    return traffic_state

@app.get("/traffic/state")
def get_state():
    return traffic_state

@app.post("/api/process_video/")
def process_video(req: ProcessRequest):
    if detector is None:
        raise HTTPException(503, "AI model not loaded. Check server logs for model load errors.")
    path = get_upload_path(req.filename)
    if not os.path.exists(path):
        raise HTTPException(404, "File not found")

    summary = detector.process_video(path)
    return {"status": "success", "summary": summary}

@app.get("/api/live-detect-sse/")
async def live_sse(file: str):
    if file.startswith("stored:"):
        file = get_upload_path(file.replace("stored:", ""))

    if not os.path.exists(file):
        return EventSourceResponse(iter([{"data": json.dumps({"error": "File not found"})}]))

    return EventSourceResponse(generate_frames(file))

# =========================
# SUMO Routes
# =========================

@app.post("/api/sumo/start")
def start_sumo_sim():
    if not SUMO_AVAILABLE:
        raise HTTPException(503, "SUMO is not installed on this server. Please install Eclipse SUMO.")
    if sim_status["running"]:
        return {"message": "Simulation already running"}
    
    thread = threading.Thread(target=run_simulation_loop)
    thread.daemon = True
    thread.start()
    return {"message": "Simulation started"}

@app.post("/api/sumo/stop")
def stop_sumo_sim():
    if not SUMO_AVAILABLE:
        raise HTTPException(503, "SUMO is not installed on this server.")
    sim_status["running"] = False
    return {"message": "Simulation stopping..."}

@app.get("/api/sumo/status")
def get_sumo_status():
    return {**sim_status, "sumo_available": SUMO_AVAILABLE}

# =========================
# 5. NEW SUMO UPLOAD API (XML Parsing, No SUMO Binary Required)
# =========================

@app.post("/api/sumo/upload")
async def handle_sumo_upload(file: UploadFile = File(...)):
    """
    Accepts a .zip file containing SUMO .net.xml and .rou.xml,
    extracts it, parses the traffic flows, and returns the analysis
    without needing Eclipse SUMO installed.
    """
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "File must be a .zip containing SUMO files")
        
    session_id = str(uuid.uuid4())
    extract_dir = os.path.join(os.path.dirname(__file__), "sumo_uploads", session_id)
    os.makedirs(extract_dir, exist_ok=True)
    
    zip_path = os.path.join(extract_dir, file.filename)
    
    # Save the upload
    with open(zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Extract the ZIP
    try:
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
    except zipfile.BadZipFile:
        shutil.rmtree(extract_dir)
        raise HTTPException(400, "Invalid ZIP file")
        
    # Run the XML parser
    try:
        analysis_result = sumo_parser.run_headless_simulation(extract_dir)
        return {"status": "success", "session_id": session_id, "data": analysis_result}
    except FileNotFoundError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")
    finally:
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)

# =========================
# Entry Point
# =========================

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
