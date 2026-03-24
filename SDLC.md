# Smart Way Traffic - Software Design & Lifecycle Document (SDLC)

## 1. Project Overview
**Smart Way Traffic** is an intelligent traffic management system designed to analyze traffic flow, detect congestion, and identify emergency situations using AI-powered video analysis. The system provides real-time visualization and detailed reporting to optimize urban traffic control.

---

## 2. Technology Stack

### A. Frontend (User Interface)
*   **Framework**: [React](https://react.dev/) (v18+) with [Vite](https://vitejs.dev/) for fast build tooling.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first responsive design.
*   **State Management**: React Hooks (`useState`, `useEffect`, `useRef`) for local state and stream handling.
*   **Icons**: `react-icons` (Feather Icons).
*   **Communication**: Fetch API for REST endpoints, `EventSource` for Real-time SSE (Server-Sent Events).

### B. Backend (API & Orchestration)
*   **Runtime**: [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/).
*   **Database**: [Supabase](https://supabase.com/) (PostgreSQL) for relational data storage `uuid`, `jsonb` support.
*   **Authentication**: Supabase Auth (Google OAuth / Email).
*   **AI Integration**: `openai` npm package configured for **OpenRouter** (GPT-4o) for high-level scene analysis.
*   **File Handling**: `multer` for video upload management.

### C. AI Engine (Computer Vision Core & SUMO)
*   **Language**: [Python](https://www.python.org/) (3.11+).
*   **Framework**: [FastAPI](https://fastapi.tiangolo.com/) for high-performance async API.
*   **Vision Model**: [Ultralytics YOLOv8](https://docs.ultralytics.com/) (Nano model) for object detection.
*   **Tracking**: YOLOv8 `model.track` for persistent object tracking (ID assignment).
*   **Image Processing**: [OpenCV](https://opencv.org/) (`cv2` headless) for frame manipulation and drawing.
*   **Concurrency**: `asyncio` and `sse_starlette` for streaming analysis data to frontend.
*   **Simulation Engine**: Custom headless XML integration to import `net.xml` and `rou.xml` city planning datasets without requiring the Eclipse SUMO GUI or native system dependencies.
*   **Simulation Algorithms**: Automatically extrapolates Cartesian boundaries for intersection modeling, integrates Webster's Formula calculation frameworks for standard signal transitions, and evaluates proximity thresholds for Emergency vehicle overrides.

---

## 3. System Architecture

```mermaid
graph TD
    User[User / Admin] -->|Interacts| FE[React Frontend]
    
    subgraph "Application Layer"
        FE -->|REST API (Upload/Save)| BE[Node.js Backend]
        FE -->|SSE Stream (Visualize)| AI[Python AI Engine]
    end
    
    subgraph "Data Layer"
        BE -->|Read/Write| DB[(Supabase PostgreSQL)]
        BE -->|Uploads| FS[Local File System / Storage]
    end
    
    subgraph "Intelligence Layer"
        AI -->|Load Model| YOLO[YOLOv8 Model]
        BE -->|Analyze Snapshot| GPT[OpenRouter / GPT-4o]
    end

    AI -.->|Snapshot| FS
    BE -.->|Read Snapshot| FS
```

---

## 4. Functional Workflows

### 4.1. Video Upload & Processing
1.  User selects a traffic video file on the **Dashboard/Simulation Page**.
2.  Frontend uploads file to Backend `POST /api/videos`.
3.  Backend saves file to `uploads/` and creates a record in `videos` table in Supabase.
4.  Video becomes available in the selection dropdown.

### 4.2. Simulation & Visualization (Real-Time)
1.  User selects a video and clicks **"Visualize"**.
2.  Frontend opens an `EventSource` connection to AI Engine: `GET /api/live-detect-sse/?file=...`.
3.  **AI Engine**:
    *   Reads video frame-by-frame using OpenCV.
    *   Runs **YOLOv8 Tracking** on each frame to detect vehicles (Car, Bus, Truck, Motorcycle) and Signal Lights.
    *   Assigns unique IDs to track total volume.
    *   Encodes processing frame to Base64.
    *   Streams JSON data (Frame + Counts + Status) back to Frontend.
4.  **Frontend**:
    *   Renders Base64 frame to `<img src>`.
    *   Updates Live Metrics (Vehicle Count, Congestion Status).
5.  **User Controls**:
    *   **Pause**: Freezes the UI updates while maintaining state.
    *   **Stop**: Ends the simulation and prepares data for saving.

### 4.3. Detailed Analysis & Reporting
1.  On completion (or Stop), AI Engine captures a **Snapshot** of the busiest frame.
2.  Frontend sends aggregated stats to Backend: `PUT /api/videos/:id/analysis`.
3.  **Backend**:
    *   Reads the Snapshot image.
    *   Sends Snapshot + Stats to **OpenRouter (GPT-4o)** via visual prompt.
    *   **Prompt**: "Analyze for accidents, infrastructure (lanes), and signal compliance."
4.  **OpenRouter** returns a natural language report.
5.  Backend saves the report and stats into `traffic_logs` table.
6.  Frontend displays the "AI Analysis Popup" immediately.

### 4.4. Headless SUMO Traffic Simulation
1. **Model Extraction:** The user mounts a specialized SUMO simulation zip archive (containing standard geometric `.net.xml` and route `.rou.xml` datasets) directly into the `SumoPage` Drag & Drop module.
2. **AI Simulation Parsing:** The `/api/sumo/analyze` module decompiles the map, isolating path coordinates, extracting edge events, mapping exact vehicle routing limits, and generating optimum default signal timings per junction (Webster's method).
3. **Live Geometry Telemetry (React Canvas State Machine):** 
   - A newly fabricated `<canvas>` engine locally mounts the pure mathematical map into 2D display tracks directly on the client machine.
   - Using decoupled Physics bounds, the system manually calculates localized intersection density levels, implements vehicle tracking collision queues (stopping vehicles sequentially without overlap).
   - An integrated 60-FPS AI Automaton constantly monitors exact vehicle bounding models to route active priority signals for Ambulance routing overrides perfectly synced with visual distance.
4. **Historical Access:** Processed data is sent to the Node Backend where it serializes natively to the Supabase log schemas, providing full interactive replay/metrics capability for previous executions.

---

## 5. Database Schema

### Table: `videos`
*   `id` (UUID): Primary Key
*   `filename` (Text): Original name
*   `filepath` (Text): Storage path
*   `status` (Text): processing / processed
*   `analysis_summary` (JSONB): Basic counts

### Table: `traffic_logs`
*   `id` (UUID): Primary Key
*   `video_id` (UUID): FK to videos
*   `vehicle_count` (Int): Total traffic volume
*   `detailed_analysis` (JSONB): Contains full `ai_report` text, congestion level, and breakdown.
*   `emergency_detected` (Boolean): True if Ambulance/Firetruck/Accident found.
*   `created_at` (Timestamp): Log time.

### Table: `sumo_sessions`
*   `id` (UUID): Primary Key
*   `session_id` (UUID): Process identifier
*   `network_name` (Text): Name of parsed XML map
*   `junction_count` (Int): Total analyzed intersections detected
*   `total_vehicles` (Int): Total vehicle paths simulated
*   `emergency_detected` (Boolean): Extracted existence of high-priority emergency logic hooks
*   `vehicle_summary` (JSONB): Raw mix counts parsed array (`car`, `bus`, `truck`, `motorcycle`, `ambulance`)
*   `junction_data` (JSONB): Contains exact dictionary layouts for Webster's green thresholds and density metrics per axis
*   `created_at` (Timestamp): Record time

---

## 6. Directory Structure

```text
smartway-traffic/
├── ai_engine/           # Python Service
│   ├── detector.py      # YOLO Logic & Tracking
│   ├── sumo_parser.py   # Headless XML Layout Parsing & Geometric Formulation
│   ├── main.py          # FastAPI Routes
│   └── requirements.txt
├── backend/             # Node.js Service
│   ├── index.js         # Express Server & Postgres Endpoint Bindings
│   ├── schema.sql       # Database definitions
│   └── uploads/         # Storage layer
└── smarttraffic-frontend/ # React App
    ├── src/
    │   ├── pages/       # Dashboard, Simulation, Profile, Create Event, SumoPage
    │   ├── components/  # Reusable UI, StreamView, MediaView, SumoVisualizer
    │   └── App.jsx      # Route map
    └── vite.config.js
```
