import os
import xml.etree.ElementTree as ET
import math
import random

def parse_sumo_network(net_xml_path):
    """
    Parses network.net.xml to find junctions (with traffic lights)
    and their incoming edges/lanes.
    Returns:
    {
      "J_NW": {
         "incoming_lanes": ["eN_W_0", "eW_N_0", ...],
         "ns_lanes": ["eN_W_0", "eI_SW_NW_0"],
         "we_lanes": ["eW_N_0", "eI_NE_NW_0"]
      }, ...
    }
    """
    tree = ET.parse(net_xml_path)
    root = tree.getroot()
    
    junctions = {}
    
    # 1. Find all traffic light junctions
    for junction in root.findall('junction'):
        j_type = junction.get('type')
        if j_type == 'traffic_light':
            j_id = junction.get('id')
            inc_lanes = junction.get('incLanes', '').split()
            
            # Very basic heuristic for NS vs WE lanes based on lane ID prefixes
            # In a real app we'd look up the From/To coordinates of the edge
            ns_lanes = [l for l in inc_lanes if '_N' in l or '_S' in l or 'N_' in l or 'S_' in l]
            we_lanes = [l for l in inc_lanes if '_E' in l or '_W' in l or 'E_' in l or 'W_' in l]
            
            # Deduplicate just in case our heuristic overlaps
            ns_lanes = list(set(ns_lanes) - set(we_lanes)) # if it has both, we'll refine
            
            mid = max(1, len(inc_lanes)//2)
            junctions[j_id] = {
                "x": float(junction.get('x', 0)),
                "y": float(junction.get('y', 0)),
                "incoming_lanes": inc_lanes,
                "ns_lanes": inc_lanes[:mid], # Fallback split if heuristic fails
                "we_lanes": inc_lanes[mid:]
            }
            
            # Try to do a better split if we have 4 lanes
            if len(inc_lanes) == 4:
                junctions[j_id]["ns_lanes"] = [inc_lanes[0], inc_lanes[2]]
                junctions[j_id]["we_lanes"] = [inc_lanes[1], inc_lanes[3]]

    # NEW: Extract geometry
    edges = {}
    for edge in root.findall('edge'):
        e_id = edge.get('id')
        lanes = []
        for lane in edge.findall('lane'):
            shape_str = lane.get('shape', '')
            if shape_str:
                # 'x1,y1 x2,y2' -> [[x1,y1], [x2,y2]]
                pts = []
                for pt in shape_str.split():
                    try:
                        x, y = pt.split(',')
                        pts.append([round(float(x), 2), round(float(y), 2)])
                    except ValueError:
                        pass
                if pts:
                    lanes.append({"id": lane.get('id'), "shape": pts})
        if lanes:
            edges[e_id] = {"lanes": lanes}

    # NEW: Extract bounds
    bounds = {"xmin": 0, "ymin": 0, "xmax": 1000, "ymax": 1000}
    loc = root.find('location')
    if loc is not None and loc.get('convBoundary'):
        cb = loc.get('convBoundary').split(',')
        if len(cb) >= 4:
            bounds = {"xmin": float(cb[0]), "ymin": float(cb[1]), "xmax": float(cb[2]), "ymax": float(cb[3])}

    return junctions, edges, bounds

def parse_sumo_routes(rou_xml_path):
    """
    Parses traffic.rou.xml to extract vehicle flows per type.
    Returns:
    {
       "car": 4500,
       "bus": 500,
       "truck": 200,
       "motorcycle": 1000,
       "ambulance": 3
    }
    """
    tree = ET.parse(rou_xml_path)
    root = tree.getroot()
    
    flows = {"car": 0, "bus": 0, "truck": 0, "motorcycle": 0, "ambulance": 0}
    
    # Extract flows
    for flow in root.findall('flow'):
        vtype = str(flow.get('type') or 'car')
        # Handle 'number' or 'probability' based flows
        if flow.get('number'):
            count = int(flow.get('number'))
        elif flow.get('probability'):
            prob = float(flow.get('probability'))
            begin = float(flow.get('begin', 0))
            end = float(flow.get('end', 3600))
            count = int((end - begin) * prob)
        else:
            count = 100 # default fallback
            
        if vtype in flows:
            flows[vtype] += count
        else:
            flows[vtype] = count
            
    # Parse route definitions into a mapping dictionary
    route_dict = {}
    for r in root.findall('.//route'):
        r_id = r.get('id')
        edges_str = r.get('edges', '')
        if r_id and edges_str:
            route_dict[r_id] = edges_str.split()
            
    # NEW: Extract explicit vehicle routes for animation
    vehicles = []
    
    for v in root.findall('.//vehicle'):
        v_id = v.get('id')
        depart = float(v.get('depart', 0))
        vtype = v.get('type', 'car') or 'car'
        
        edges = []
        route_attr = v.get('route')
        if route_attr and route_attr in route_dict:
            edges = route_dict[route_attr]
        else:
            route_el = v.find('route')
            edges_str = route_el.get('edges') if route_el is not None else None
            edges = edges_str.split() if edges_str else []
            
        if not edges and v.get('from') and v.get('to'):
             edges = [v.get('from'), v.get('to')]
             
        if edges:
            vehicles.append({"id": v_id, "depart": depart, "type": vtype, "route": edges})
            
    for f in root.findall('.//flow'):
        f_id = f.get('id')
        vtype = f.get('type', 'car')
        begin = float(f.get('begin', 0))
        end = float(f.get('end', 3600))
        
        # Determine count securely
        number_attr = f.get('number')
        prob_attr = f.get('probability')
        
        if number_attr is not None:
            count = int(float(number_attr))
        elif prob_attr is not None:
            count = int((end - begin) * float(prob_attr))
        else:
            count = 100
            
        edges = []
        route_attr = f.get('route')
        if route_attr and route_attr in route_dict:
            edges = route_dict[route_attr]
        else:
            route_el = f.find('route')
            edges_str = route_el.get('edges') if route_el is not None else None
            edges = edges_str.split() if edges_str else []
            
        if not edges and f.get('from') and f.get('to'):
            edges = [f.get('from'), f.get('to')]
            
        if edges and count > 0:
            step = (end - begin) / max(1, count)
            # Create discrete vehicles for the flow to animate
            num_to_create = min(count, 500) # Cap per flow to prevent memory issues
            for i in range(num_to_create):
                vehicles.append({
                    "id": f"{f_id}_{i}", 
                    "depart": round(begin + i*step, 1), 
                    "type": vtype, 
                    "route": edges
                })

    vehicles.sort(key=lambda x: x["depart"])
    vehicles = vehicles[:3000] # Global cap for frontend performance

    return flows, vehicles

def calculate_green_time(ns_vehicles, we_vehicles):
    """
    Applies a simplified Webster's formula to determine green times.
    Cycle length C = (1.5 * L + 5) / (1 - Y)  ... but we simplify:
    Green Time is proportional to traffic volume, min 10s, max 90s.
    """
    MIN_GREEN = 15
    MAX_GREEN = 90
    
    # Assume 1 vehicle takes ~2.5 seconds to pass
    ns_time = max(MIN_GREEN, min(MAX_GREEN, int(ns_vehicles * 2.5)))
    we_time = max(MIN_GREEN, min(MAX_GREEN, int(we_vehicles * 2.5)))
    
    # If one side is empty, still give minimum time
    if ns_vehicles == 0: ns_time = MIN_GREEN
    if we_vehicles == 0: we_time = MIN_GREEN
        
    return ns_time, we_time

def run_headless_simulation(extract_dir):
    """
    Simulates traffic based purely on XML parsing.
    Returns the JSON payload expected by the frontend.
    """
    net_file = None
    rou_file = None
    
    # Find the XML files in the extracted directory
    for root_dir, dirs, files in os.walk(extract_dir):
        for f in files:
            if f.endswith('.net.xml'):
                net_file = os.path.join(root_dir, f)
            elif f.endswith('.rou.xml'):
                rou_file = os.path.join(root_dir, f)
                
    if not net_file or not rou_file:
        raise FileNotFoundError("Could not find both .net.xml and .rou.xml in the uploaded archive.")
        
    junctions, edge_geometry, bounds = parse_sumo_network(net_file)
    flows, vehicles = parse_sumo_routes(rou_file)
    
    # 1. Did we detect an ambulance in the flows?
    emergency_detected = flows.get("ambulance", 0) > 0
    total_vehicles = sum(flows.values())
    
    # 2. Distribute flows across junctions to simulate a "snapshot" of density
    # In a real engine, we'd track step-by-step. Here we generate a realistic instantaneous state
    # based on the total flows.
    
    junction_data = {}
    
    for j_id, j_info in junctions.items():
        # Generate random but proportional counts for this junction
        # NS usually has slightly more traffic than WE in our sample
        
        # Base scale: a single snapshot usually has 10-50 cars at an intersection
        scale_factor = random.uniform(0.01, 0.03) 
        
        counts = {
            "car": int(flows.get("car", 0) * scale_factor),
            "bus": int(flows.get("bus", 0) * scale_factor),
            "truck": int(flows.get("truck", 0) * scale_factor),
            "motorcycle": int(flows.get("motorcycle", 0) * scale_factor),
        }
        
        j_total = sum(counts.values())
        
        # Split NS vs WE randomly but around 60/40 or 40/60
        ns_ratio = random.uniform(0.3, 0.7)
        ns_count = int(j_total * ns_ratio)
        we_count = j_total - ns_count
        
        # Calculate Webster's Signal Timing
        ns_green, we_green = calculate_green_time(ns_count, we_count)
        
        # If emergency, override timing
        emergency_at_this_junction = emergency_detected and random.random() > 0.5
        if emergency_at_this_junction:
            # Force green for the direction with the ambulance (simulate NS for now)
            ns_green = 90
            we_green = 10
            
        junction_data[j_id] = {
            "vehicle_counts": counts,
            "lane_density": {
                "NS_vehicles": ns_count,
                "WE_vehicles": we_count
            },
            "signals": {
                "ns_green_secs": ns_green,
                "we_green_secs": we_green
            },
            "emergency": emergency_at_this_junction,
            "x": j_info.get("x", 0),
            "y": j_info.get("y", 0)
        }
        
    return {
        "network_name": os.path.basename(net_file),
        "junction_count": len(junctions),
        "total_vehicles_simulated": total_vehicles,
        "emergency_detected": emergency_detected,
        "vehicle_summary": flows,
        "junction_data": junction_data,
        "geometry": {
            "bounds": bounds,
            "edges": edge_geometry
        },
        "vehicles": vehicles
    }
