import os
import sys
import traci
import sumolib
from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import time

# --- Configuration ---
SUMO_GUI_BINARY = "sumo-gui" 
# Ensure SUMO_HOME is set in your environment variables, or this fails.
# Common path on Windows: "C:\\Program Files (x86)\\Eclipse\\Sumo\\bin\\sumo-gui.exe"

app = Flask(__name__)
CORS(app)

# Global State
sim_status = {
    "running": False,
    "step": 0,
    "emergency_active": False,
    "current_green_phase": "NS", # NS or WE
    "lane_counts": {
        "E0_0": 0, "E1_0": 0, "E2_0": 0, "E3_0": 0
    }
}

SIM_DELAY = 0.1 # Slow down simulation for visualization

def run_simulation_loop():
    global sim_status
    
    # Locate configuration
    sim_config = os.path.join(os.path.dirname(__file__), "sumo_sim", "sim.sumocfg")
    
    # Start TraCI
    try:
        if 'SUMO_HOME' in os.environ:
             tools = os.path.join(os.environ['SUMO_HOME'], 'tools')
             sys.path.append(tools)
        else:
             print("WARNING: SUMO_HOME not set. Simulation might fail if libraries aren't found.")

        traci.start([SUMO_GUI_BINARY, "-c", sim_config, "--start"])
        sim_status["running"] = True
        
        step = 0
        while traci.simulation.getMinExpectedNumber() > 0:
            if not sim_status["running"]:
                break
                
            traci.simulationStep()
            step += 1
            sim_status["step"] = step

            # --- 1. DENSITY ESTIMATION ---
            # Get vehicle counts on incoming lanes (simulating camera)
            # IDs based on 'network.net.xml': E0_0, E1_0, E2_0, E3_0 are incoming
            counts = {
                "E0_0": traci.lane.getLastStepVehicleNumber("E0_0"),
                "E1_0": traci.lane.getLastStepVehicleNumber("E1_0"),
                "E2_0": traci.lane.getLastStepVehicleNumber("E2_0"),
                "E3_0": traci.lane.getLastStepVehicleNumber("E3_0")
            }
            sim_status["lane_counts"] = counts
            
            # --- 2. EMERGENCY DETECTION ---
            emergency_detected = False
            emergency_lane = None
            
            # Check all vehicles for type 'ambulance'
            # (In a real CV system, this is 'YOLO detection')
            vehicle_ids = traci.vehicle.getIDList()
            for vid in vehicle_ids:
                vtype = traci.vehicle.getTypeID(vid)
                if vtype == "ambulance":
                    road_id = traci.vehicle.getRoadID(vid)
                    if road_id in ["E0", "E1", "E2", "E3"]: # Approaching intersection
                        emergency_detected = True
                        emergency_lane = road_id
                        break
            
            sim_status["emergency_active"] = emergency_detected

            # --- 3. TRAFFIC CONTROL LOGIC (Adaptive) ---
            
            # Traffic Light Logic
            # J0 is the junction ID in network.net.xml
            # Logic:
            # - If Emergency: Force Green Phase for that lane
            # - Else: Check density. If NS > WE, Green NS. Else Green WE.
            
            # Note: SUMO phases are defined in net.xml usually. We can switch programs or set state string.
            # Simplified Logic:
            # "rrrrGGGGgrrrrGGGg" -> Phase 0 (NS Green)
            # "GGGGgrrrrGGGgrrrr" -> Phase 2 (WE Green) - Hypothetical, depends on net.xml generation
            # Let's read current logic.
            
            # To be safe, we will just use logic to determine *desired* phase and print it for now/update status.
            # Real dynamic control needs knowledge of specific Phase IDs.
            # Default "traffic_light" type has standard phases.
            
            if emergency_detected:
                 # Priority Override
                 # Example: If on E0 (North) or E2 (South), ensure Phase 0
                 pass 
            else:
                 # Density Logic
                 ns_load = counts["E0_0"] + counts["E2_0"]
                 we_load = counts["E1_0"] + counts["E3_0"]
                 
                 # Dynamic duration adjustment logic would go here
                 # traci.trafficlight.setPhaseDuration("J0", new_duration)
                 pass

            time.sleep(SIM_DELAY)
            
        traci.close()
    except Exception as e:
        print(f"Simulation Error: {e}")
    finally:
        sim_status["running"] = False

@app.route('/start', methods=['POST'])
def start_sim():
    if sim_status["running"]:
        return jsonify({"message": "Simulation already running"}), 400
    
    thread = threading.Thread(target=run_simulation_loop)
    thread.daemon = True
    thread.start()
    return jsonify({"message": "Simulation started"})

@app.route('/stop', methods=['POST'])
def stop_sim():
    sim_status["running"] = False
    return jsonify({"message": "Simulation stopping..."})

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify(sim_status)

if __name__ == '__main__':
    # Run API on port 8001 (distinct from 5000 and 8000)
    app.run(port=8001, debug=True, use_reloader=False)
