import React, { useEffect, useRef, useState } from 'react';
import { FiPlay, FiPause, FiRotateCcw } from 'react-icons/fi';

const SumoVisualizer = ({ geometry, vehicles, junctions, onTelemetry }) => {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const [isPlaying, setIsPlaying] = useState(false);
    const [simTime, setSimTime] = useState(0);
    const [speedMultiplier, setSpeedMultiplier] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(3.0);
    const [dashboardData, setDashboardData] = useState([]);
    
    // Mutable state for the physics engine to avoid React render cycle overhead
    const engineState = useRef({
        time: 0,
        activeVehicles: [],
        vehicleIndex: 0,
        lastTick: performance.now(),
        edgeLengths: {},
        edgePaths: {},
        endOfEdgeEvents: {},
        cityDecors: { buildings: [], trees: [] },
        bounds: null
    });

    // 1. Pre-process geometry for faster lookups and FULL city generation
    useEffect(() => {
        if (!geometry || !geometry.edges) return;
        
        const lengths = {};
        const paths = {};
        
        Object.entries(geometry.edges).forEach(([edgeId, edgeData]) => {
            if (!edgeData.lanes || edgeData.lanes.length === 0) return;
            const shape = edgeData.lanes[0].shape;
            if (!shape || shape.length < 2) return;
            
            paths[edgeId] = shape;
            let totalDist = 0;
            for (let i = 0; i < shape.length - 1; i++) {
                const dx = shape[i+1][0] - shape[i][0];
                const dy = shape[i+1][1] - shape[i][1];
                totalDist += Math.sqrt(dx * dx + dy * dy);
            }
            lengths[edgeId] = totalDist;
        });

        // Pre-process junction events
        const events = {};
        if (junctions) {
            Object.entries(junctions).forEach(([jId, jData]) => {
                Object.entries(paths).forEach(([edgeId, shape]) => {
                     if (edgeId.startsWith(':')) return; // Explicitly filter out internal junction link geometries
                     
                     const end = shape[shape.length - 1];
                     const dist = Math.hypot(end[0] - jData.x, end[1] - jData.y);
                     if (dist < 30) {
                         const p1 = shape[shape.length - 2];
                         const dx = end[0] - p1[0];
                         const dy = end[1] - p1[1];
                         const isHorizontal = Math.abs(dx) > Math.abs(dy);
                         events[edgeId] = { jId, dir: isHorizontal ? 'WE' : 'NS', signals: jData.signals || { ns_green_secs: 25, we_green_secs: 25 }, endPoint: end };
                     }
                });
            });
        }
        
        // ========== FULL PROCEDURAL CITYSCAPE GENERATION ==========
        // This creates a dense, breathing city that fills the ENTIRE canvas area
        const decors = { buildings: [], trees: [] };
        
        // Determine Optimal Camera Viewport (Focus on Intersection)
        let bounds = null;
        if (junctions && Object.keys(junctions).length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            Object.values(junctions).forEach(j => {
                minX = Math.min(minX, j.x);
                minY = Math.min(minY, j.y);
                maxX = Math.max(maxX, j.x);
                maxY = Math.max(maxY, j.y);
            });
            // Generate city for the widest possible zoom (pad=330)
            const pad = 330;
            bounds = { xmin: minX - pad, xmax: maxX + pad, ymin: minY - pad, ymax: maxY + pad };
        } else if (geometry.bounds) {
            bounds = geometry.bounds;
        } else if (Object.values(paths).length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            Object.values(paths).forEach(shape => {
                shape.forEach(([x, y]) => {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                });
            });
            bounds = { xmin: minX - 50, xmax: maxX + 50, ymin: minY - 50, ymax: maxY + 50 };
        }
        
        if (bounds) {
            // Function to check if a point is near any road
            const isNearRoad = (x, y, threshold = 28) => {
                return Object.values(paths).some(shape => {
                    for(let i = 0; i < shape.length - 1; i++) {
                        const p1 = shape[i], p2 = shape[i+1];
                        const dx = p2[0] - p1[0];
                        const dy = p2[1] - p1[1];
                        const len = Math.hypot(dx, dy);
                        if (len < 0.001) continue;
                        const t = ((x - p1[0]) * dx + (y - p1[1]) * dy) / (len * len);
                        const clampedT = Math.max(0, Math.min(1, t));
                        const projX = p1[0] + clampedT * dx;
                        const projY = p1[1] + clampedT * dy;
                        if (Math.hypot(x - projX, y - projY) < threshold) return true;
                    }
                    return false;
                });
            };
            
            // Expand the generation area to fill the entire viewport
            // The canvas is 1800x900, we want buildings EVERYWHERE around roads
            const expandX = 280;  // meters beyond road network
            const expandY = 280;
            
            const startX = bounds.xmin - expandX;
            const endX = bounds.xmax + expandX;
            const startY = bounds.ymin - expandY;
            const endY = bounds.ymax + expandY;
            
            // Dynamic grid spacing - denser for more city feel
            const spacing = 22; // meters between building attempts
            
            console.log(`Generating city from (${startX},${startY}) to (${endX},${endY})`);
            
            for (let x = startX; x <= endX; x += spacing) {
                for (let y = startY; y <= endY; y += spacing) {
                    // Skip if too close to roads
                    if (isNearRoad(x, y, 26)) continue;
                    
                    // Use deterministic but varied placement
                    const seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + 43758.5453)) * 10000;
                    const typeRoll = Math.floor(seed % 100);
                    
                    // Add slight jitter for organic feel
                    const jitterX = (seed % 12) - 6;
                    const jitterY = ((seed * 7) % 12) - 6;
                    const finalX = x + jitterX;
                    const finalY = y + jitterY;
                    
                    // 60% buildings, 30% trees, 10% empty patches for variation
                    if (typeRoll < 60) {
                        // BUILDINGS - varied sizes and colors for realistic city blocks
                        const buildingWidth = 10 + (seed % 14);
                        const buildingHeight = 10 + ((seed * 3) % 16);
                        const colorIdx = Math.floor(seed % 6);
                        let buildingColor;
                        if (colorIdx < 2) buildingColor = '#334155';      // slate
                        else if (colorIdx < 4) buildingColor = '#475569'; // gray slate
                        else buildingColor = '#1e293b';                   // dark slate
                        
                        // Add occasional commercial buildings (lighter)
                        if (typeRoll < 15) buildingColor = '#5b6e8c';
                        if (typeRoll > 52 && typeRoll < 58) buildingColor = '#7f8c8d';
                        
                        decors.buildings.push({
                            x: finalX, y: finalY,
                            w: buildingWidth,
                            h: buildingHeight,
                            color: buildingColor,
                            heightVariant: Math.floor(seed % 3) // for visual depth
                        });
                    } else if (typeRoll < 90) {
                        // TREES - lush greenery
                        const treeSize = 4 + (seed % 7);
                        const treeColor = typeRoll < 75 ? '#2d6a4f' : '#1f5e3a';
                        decors.trees.push({
                            x: finalX, y: finalY,
                            r: treeSize,
                            color: treeColor
                        });
                    }
                }
            }
            
            // Add additional random small bushes / park elements
            for (let i = 0; i < 400; i++) {
                const randX = startX + Math.random() * (endX - startX);
                const randY = startY + Math.random() * (endY - startY);
                if (!isNearRoad(randX, randY, 24)) {
                    if (Math.random() > 0.7) {
                        decors.trees.push({
                            x: randX, y: randY,
                            r: 3 + Math.random() * 4,
                            color: '#3c7840'
                        });
                    }
                }
            }
            
            console.log(`Generated ${decors.buildings.length} buildings and ${decors.trees.length} trees`);
        }
        
        engineState.current.edgeLengths = lengths;
        engineState.current.edgePaths = paths;
        engineState.current.endOfEdgeEvents = events;
        engineState.current.cityDecors = decors;
        engineState.current.bounds = bounds;
        
        resetSimulation();
    }, [geometry, vehicles, junctions]);

    // Dedicated effect to handle Zoom Level without resetting the simulation physics or regenerating the city
    useEffect(() => {
        if (!junctions || Object.keys(junctions).length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        Object.values(junctions).forEach(j => {
            minX = Math.min(minX, j.x);
            minY = Math.min(minY, j.y);
            maxX = Math.max(maxX, j.x);
            maxY = Math.max(maxY, j.y);
        });
        const pad = 330 / zoomLevel;
        engineState.current.bounds = { xmin: minX - pad, xmax: maxX + pad, ymin: minY - pad, ymax: maxY + pad };
        if (!isPlaying) drawFrame();
    }, [zoomLevel, junctions]);

    const getSignalColor = (event) => {
        const state = engineState.current;
        if (!state.signalAutomaton) return 'red';
        const phase = state.signalAutomaton.phase;
        
        if (event.dir === 'NS') {
            if (phase === 'NS_GREEN') return 'green';
            if (phase === 'NS_YELLOW') return 'yellow';
            return 'red';
        } else {
            if (phase === 'WE_GREEN') return 'green';
            if (phase === 'WE_YELLOW') return 'yellow';
            return 'red';
        }
    };

    const resetSimulation = () => {
        engineState.current.time = 0;
        engineState.current.activeVehicles = [];
        engineState.current.vehicleIndex = 0;
        engineState.current.lastTick = performance.now();
        engineState.current.signalAutomaton = { phase: 'NS_GREEN', timer: 0 };
        setSimTime(0);
        setIsPlaying(false);
        drawFrame();
    };

    const togglePlay = () => {
        if (!isPlaying) engineState.current.lastTick = performance.now();
        setIsPlaying(!isPlaying);
    };

    const drawFrame = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // FILL ENTIRE CANVAS with rich grass base
        ctx.fillStyle = '#0f3b2c';
        ctx.fillRect(0, 0, width, height);
        
        // Add subtle grass texture (tiny noise dots)
        ctx.fillStyle = '#2d6a4f';
        for (let i = 0; i < 600; i++) {
            ctx.globalAlpha = 0.15;
            ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
        }
        ctx.globalAlpha = 1;

        if (!engineState.current.bounds || !engineState.current.edgePaths) return;

        const bounds = engineState.current.bounds;
        const netWidth = bounds.xmax - bounds.xmin || 200;
        const netHeight = bounds.ymax - bounds.ymin || 200;
        
        // Use full canvas dimensions for projection (fills screen)
        const padding = 50;
        const scaleX = (width - padding * 2) / netWidth;
        const scaleY = (height - padding * 2) / netHeight;
        const scale = Math.min(scaleX, scaleY);
        
        const offsetX = (width - netWidth * scale) / 2 - bounds.xmin * scale;
        const offsetY = (height - netHeight * scale) / 2 + bounds.ymax * scale;

        const project = (x, y) => [
            x * scale + offsetX,
            offsetY - y * scale
        ];

        // ========== DRAW FULL CITYSCAPE (Buildings & Trees) ==========
        if (engineState.current.cityDecors) {
            // Draw buildings first (background layer)
            engineState.current.cityDecors.buildings.forEach(b => {
                const [px, py] = project(b.x, b.y);
                const w = b.w * scale;
                const h = b.h * scale;
                if (px + w < 0 || px - w > width || py + h < 0 || py - h > height) return;
                
                // Main building body
                ctx.fillStyle = b.color;
                ctx.fillRect(px - w/2, py - h/2, w, h);
                
                // Add depth with windows effect (simple lines)
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = Math.max(0.5, 1 * scale);
                ctx.strokeRect(px - w/2, py - h/2, w, h);
                
                // Windows / details for larger buildings
                if (w > 12 * scale && h > 12 * scale) {
                    ctx.fillStyle = '#facc15';
                    ctx.fillRect(px - w/4, py - h/6, w * 0.15, h * 0.1);
                    ctx.fillRect(px + w/8, py - h/6, w * 0.15, h * 0.1);
                }
            });
            
            // Draw trees with lush canopy
            engineState.current.cityDecors.trees.forEach(t => {
                const [px, py] = project(t.x, t.y);
                const r = t.r * scale;
                if (px + r < 0 || px - r > width) return;
                
                // Tree trunk
                ctx.fillStyle = '#5a3e2b';
                ctx.fillRect(px - 2 * scale, py - r/2, 4 * scale, r * 0.7);
                
                // Tree foliage (layered circles)
                ctx.beginPath();
                ctx.arc(px, py - r * 0.4, r * 0.9, 0, Math.PI * 2);
                ctx.fillStyle = t.color;
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px - r * 0.3, py - r * 0.1, r * 0.6, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(px + r * 0.3, py - r * 0.1, r * 0.6, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // ========== DRAW ROADS WITH REALISTIC ASPHALT ==========
        const drawPaths = (lineWidth, strokeStyle, isDashed = false) => {
            ctx.beginPath();
            Object.values(engineState.current.edgePaths).forEach(shape => {
                if (shape.length < 2) return;
                const [startX, startY] = project(shape[0][0], shape[0][1]);
                ctx.moveTo(startX, startY);
                for (let i = 1; i < shape.length; i++) {
                    const [x, y] = project(shape[i][0], shape[i][1]);
                    ctx.lineTo(x, y);
                }
            });
            if (isDashed) ctx.setLineDash([12, 12]);
            else ctx.setLineDash([]);
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = strokeStyle;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'round';
            ctx.stroke();
        };
        
        // 1. Thick Bright Boundary (Forms the two outer white edge lines)
        drawPaths(32 * scale, '#cbd5e1', false);
        // 2. Lighter Grey Asphalt (Provides the actual driving surface)
        drawPaths(28 * scale, '#475569', false);
        // 3. Yellow Dashed Center Divider
        ctx.setLineDash([15 * scale, 15 * scale]);
        drawPaths(2 * scale, '#fbbf24', true);
        ctx.setLineDash([]);
        
        // ========== INTERSECTION STOP BARS & TRAFFIC LIGHTS ==========
        if (engineState.current.endOfEdgeEvents) {
            Object.entries(engineState.current.endOfEdgeEvents).forEach(([edgeId, event]) => {
                const shape = engineState.current.edgePaths[edgeId];
                if (!shape || shape.length < 2) return;
                // Traffic light phase calculation with Emergency Preemption
                const stateStr = getSignalColor(event);
                
                // Stop bar position (end of edge)
                const endPoint = shape[shape.length - 1];
                const prevPoint = shape[shape.length - 2];
                const dx = endPoint[0] - prevPoint[0];
                const dy = endPoint[1] - prevPoint[1];
                const angle = Math.atan2(-dy, dx);
                const len = Math.hypot(dx, dy) || 1;
                const cx = endPoint[0] - (dx/len) * 8;
                const cy = endPoint[1] - (dy/len) * 8;
                
                const [px, py] = project(cx, cy);
                
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angle);
                
                // Draw 3-Bulb Traffic Light Housing (Right Edge)
                const poleOffsetX = 7 * scale;
                const poleOffsetY = -18 * scale;
                
                // Main dark housing body
                ctx.fillStyle = '#1e293b'; 
                ctx.fillRect(poleOffsetX - 3*scale, poleOffsetY - 11*scale, 6*scale, 22*scale);
                // Yellow casing rim
                ctx.lineWidth = 0.5 * scale;
                ctx.strokeStyle = '#f59e0b';
                ctx.strokeRect(poleOffsetX - 3*scale, poleOffsetY - 11*scale, 6*scale, 22*scale);
                
                // Helper to draw realistic lit/unlit bulbs
                const drawBulb = (yOffset, activeColor, dimColor, isActive) => {
                    ctx.beginPath();
                    ctx.arc(poleOffsetX, poleOffsetY + yOffset, 2 * scale, 0, Math.PI * 2);
                    ctx.fillStyle = isActive ? activeColor : dimColor;
                    if (isActive) {
                        ctx.shadowColor = activeColor;
                        ctx.shadowBlur = 8 * scale;
                    }
                    ctx.fill();
                    ctx.shadowBlur = 0;
                };

                // Draw Top (Red), Middle (Yellow), Bottom (Green)
                drawBulb(-7 * scale, '#ef4444', '#451a1a', stateStr === 'red');
                drawBulb(0, '#facc15', '#4d4107', stateStr === 'yellow');
                drawBulb(7 * scale, '#22c55e', '#0b3d1b', stateStr === 'green');
                
                // Draw Stop Line across the road
                ctx.lineWidth = 5 * scale;
                ctx.beginPath();
                ctx.moveTo(0, -12 * scale);
                ctx.lineTo(0, 12 * scale);
                if (stateStr === 'red') ctx.strokeStyle = '#ef4444';
                else if (stateStr === 'yellow') ctx.strokeStyle = '#f59e0b';
                else ctx.strokeStyle = '#22c55e';
                ctx.stroke();

                ctx.restore();
            });
        }

        // ========== DRAW VEHICLES WITH DETAIL ==========
        engineState.current.activeVehicles.forEach(v => {
            if (!v.pos) return;
            const [px, py] = project(v.pos[0], v.pos[1]);
            
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(v.angle || 0);
            
            // Determine vehicle type and color
            let vColor = '#facc15'; // default car gold
            let isEmergency = false;
            let typeKey = (v.type || 'car').toLowerCase();
            
            if (typeKey === 'truck') vColor = '#3b82f6';
            else if (typeKey === 'bus') vColor = '#f97316';
            else if (typeKey === 'motorcycle') vColor = '#a855f7';
            else if (typeKey === 'emergency' || typeKey === 'ambulance') { vColor = '#ef4444'; isEmergency = true; }
            else {
                // color variation for cars
                const carHash = v.id?.split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 0;
                if (carHash % 3 === 0) vColor = '#facc15';
                else if (carHash % 3 === 1) vColor = '#94a3b8';
                else vColor = '#dc2626';
            }
            
            let length = 14 * scale;
            let width = 7 * scale;
            if (typeKey === 'truck') { length = 24 * scale; width = 9 * scale; }
            if (typeKey === 'bus') { length = 28 * scale; width = 9.5 * scale; }
            if (typeKey === 'motorcycle') { length = 8 * scale; width = 3.5 * scale; }
            
            // Car body
            ctx.fillStyle = vColor;
            ctx.shadowBlur = 3 * scale;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.roundRect(-length/2, -width/2, length, width, 3 * scale);
            ctx.fill();
            
            // Windows
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-length/3, -width/3, length/2.5, width/1.8);
            ctx.fillRect(length/6, -width/3, length/3, width/1.8);
            
            // Emergency lights
            if (isEmergency) {
                ctx.fillStyle = '#ff5555';
                ctx.beginPath();
                ctx.arc(length/3, -2 * scale, 3 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff8888';
                ctx.beginPath();
                ctx.arc(-length/3, -2 * scale, 3 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.shadowBlur = 0;
            ctx.restore();
            
            // Emergency pulse effect
            if (isEmergency && engineState.current.time % 0.5 < 0.25) {
                ctx.beginPath();
                ctx.arc(px, py, 16 * scale, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
                ctx.fill();
            }
        });
        
        // Draw intersection points (pedestrian islands)
        if (junctions) {
            Object.values(junctions).forEach(j => {
                const [jx, jy] = project(j.x, j.y);
                ctx.beginPath();
                ctx.arc(jx, jy, 6 * scale, 0, Math.PI * 2);
                ctx.fillStyle = '#4a5b6e';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(jx, jy, 3 * scale, 0, Math.PI * 2);
                ctx.fillStyle = '#facc15';
                ctx.fill();
            });
        }
    };

    const updatePhysics = (dt) => {
        const state = engineState.current;
        state.time += dt;
        
        // Spawn vehicles based on depart time
        while (state.vehicleIndex < vehicles.length && vehicles[state.vehicleIndex].depart <= state.time) {
            const vData = vehicles[state.vehicleIndex];
            state.activeVehicles.push({
                ...vData,
                currentRouteIndex: 0,
                progress: 0, 
                pos: null,
                angle: 0
            });
            state.vehicleIndex++;
        }

        // Advanced Density & Emergency Traffic Signal Automaton
        if (!state.signalAutomaton) state.signalAutomaton = { phase: 'NS_GREEN', timer: 0 };
        const sig = state.signalAutomaton;
        sig.timer += dt;
        
        let nsCount = 0, weCount = 0;
        let nsEmergency = false, weEmergency = false;
        
        // Track live vehicle composition for the current frame
        const liveComposition = { car: 0, bus: 0, truck: 0, motorcycle: 0 };
        
        state.activeVehicles.forEach(v => {
            if (!v.pos) return;
            const tk = (v.type || '').toLowerCase();
            const edgeId = v.route[v.currentRouteIndex];
            const evt = state.endOfEdgeEvents[edgeId];
            
            let distToJunc = Infinity;
            if (evt && evt.endPoint) {
                distToJunc = Math.hypot(v.pos[0] - evt.endPoint[0], v.pos[1] - evt.endPoint[1]);
            }

            if (tk.includes('ambulance') || tk.includes('emergency')) {
                // Determine if ambulance is physically close to the intersection (within 300 visual meters)
                if (distToJunc < 300) {
                    if (evt.dir === 'NS') nsEmergency = true;
                    if (evt.dir === 'WE') weEmergency = true;
                }
            } 
            else if (tk.includes('bus')) liveComposition.bus++;
            else if (tk.includes('truck') || tk.includes('trailer') || tk.includes('delivery')) liveComposition.truck++;
            else if (tk.includes('motorcycle') || tk.includes('moped')) liveComposition.motorcycle++;
            else liveComposition.car++;
            
            // Only feed vehicles physically approaching the 180m visual threshold into the traffic logic arrays
            if (evt && distToJunc < 180) {
                if (evt.dir === 'NS') {
                    nsCount++;
                } else if (evt.dir === 'WE') {
                    weCount++;
                }
            }
        });

        state.telemetry = {
            nsCount, weCount,
            nsEmergency, weEmergency,
            liveComposition,
            phase: sig.phase,
            timer: sig.timer,
            activeCount: state.activeVehicles.length
        };

        // State Machine Transitions
        if (sig.phase === 'NS_GREEN') {
            if (weEmergency && !nsEmergency) { sig.phase = 'NS_YELLOW'; sig.timer = 0; }
            else if (nsEmergency) { /* Hold green by swallowing logic execution, but do not reset timer so phase instantly switches when passed */ } 
            else if (sig.timer > 20 && weCount > nsCount + 2) { sig.phase = 'NS_YELLOW'; sig.timer = 0; }
            else if (sig.timer > 60) { sig.phase = 'NS_YELLOW'; sig.timer = 0; }
        } else if (sig.phase === 'NS_YELLOW') {
            if (nsEmergency && !weEmergency) { sig.phase = 'NS_GREEN'; sig.timer = 0; }
            else if (sig.timer > 3.0) { sig.phase = 'WE_GREEN'; sig.timer = 0; }
        } else if (sig.phase === 'WE_GREEN') {
            if (nsEmergency && !weEmergency) { sig.phase = 'WE_YELLOW'; sig.timer = 0; }
            else if (weEmergency) { /* Hold green by swallowing logic execution, but do not reset timer so phase instantly switches when passed */ } 
            else if (sig.timer > 20 && nsCount > weCount + 2) { sig.phase = 'WE_YELLOW'; sig.timer = 0; }
            else if (sig.timer > 60) { sig.phase = 'WE_YELLOW'; sig.timer = 0; }
        } else if (sig.phase === 'WE_YELLOW') {
            if (weEmergency && !nsEmergency) { sig.phase = 'WE_GREEN'; sig.timer = 0; }
            else if (sig.timer > 3.0) { sig.phase = 'NS_GREEN'; sig.timer = 0; }
        }

        const speed = 13.2; // ~47 km/h realistic city speed
        const distanceToMove = speed * dt;
        const edgeQueues = {};

        // Update each vehicle position (Iterate from oldest to newest to build queues naturally)
        for (let j = 0; j < state.activeVehicles.length; j++) {
            const v = state.activeVehicles[j];
            const edgeId = v.route[v.currentRouteIndex];
            const edgeLength = state.edgeLengths[edgeId];
            const shape = state.edgePaths[edgeId];

            if (!edgeLength || !shape) {
                state.activeVehicles.splice(j, 1);
                j--; // adjust iterator for splice
                continue;
            }
            
            let maxProgress = edgeLength;
            
            // 1) Enforce traffic signal stopping bounds
            const edgeEvent = state.endOfEdgeEvents[edgeId];
            if (edgeEvent && v.currentRouteIndex + 1 < v.route.length) {
                const signalStateStr = getSignalColor(edgeEvent);
                if (signalStateStr !== 'green') {
                    maxProgress = edgeLength - 10;
                }
            }
            
            // 2) Enforce traffic queue stacking bounds (cars stop 8 meters behind the car in front of them)
            if (edgeQueues[edgeId] !== undefined) {
                maxProgress = Math.min(maxProgress, edgeQueues[edgeId] - 8);
            }

            let newProgress = v.progress + distanceToMove;
            if (newProgress > maxProgress) {
                newProgress = Math.max(v.progress, maxProgress);
            }
            v.progress = newProgress;
            edgeQueues[edgeId] = v.progress;

            // Move to next edge if at the end
            if (v.progress >= edgeLength && maxProgress >= edgeLength) {
                v.currentRouteIndex++;
                if (v.currentRouteIndex >= v.route.length) {
                    state.activeVehicles.splice(j, 1);
                    continue;
                } else {
                    v.progress = v.progress - edgeLength;
                }
            }

            // Interpolate position along current edge shape
            let currentDist = 0;
            let found = false;
            for (let i = 0; i < shape.length - 1; i++) {
                const dx = shape[i+1][0] - shape[i][0];
                const dy = shape[i+1][1] - shape[i][1];
                const segLen = Math.hypot(dx, dy);
                if (currentDist + segLen >= v.progress) {
                    const ratio = segLen === 0 ? 0 : (v.progress - currentDist) / segLen;
                    const x = shape[i][0] + dx * ratio;
                    const y = shape[i][1] + dy * ratio;
                    v.pos = [x, y];
                    v.angle = Math.atan2(-dy, dx);
                    found = true;
                    break;
                }
                currentDist += segLen;
            }
            if (!found && shape.length >= 2) {
                v.pos = shape[shape.length - 1];
                const dx = shape[shape.length - 1][0] - shape[shape.length - 2][0];
                const dy = shape[shape.length - 1][1] - shape[shape.length - 2][1];
                v.angle = Math.atan2(-dy, dx);
            }
        }
    };

    const animate = (timestamp) => {
        if (!isPlaying) return;
        
        const state = engineState.current;
        let dt = (timestamp - state.lastTick) / 1000.0;
        state.lastTick = timestamp;
        if (dt > 0.05) dt = 0.05;
        dt *= speedMultiplier;
        
        updatePhysics(dt);
        drawFrame();
        
        if (Math.floor(state.time) !== Math.floor(simTime)) {
            setSimTime(Math.floor(state.time));
        }
        
        // Update dashboard every 0.25 seconds to minimize React renders while feeling smooth
        if (Math.floor(state.time * 4) !== Math.floor((state.time - dt) * 4)) {
            if (state.endOfEdgeEvents) {
                const dash = [];
                Object.entries(state.endOfEdgeEvents).forEach(([edgeId, event]) => {
                    let count = 0;
                    state.activeVehicles.forEach(v => {
                        if (v.route[v.currentRouteIndex] === edgeId) count++;
                    });
                    
                    let dirName = "Unknown Road";
                    if (edgeId.toLowerCase().includes("north")) dirName = "Northbound In";
                    else if (edgeId.toLowerCase().includes("south")) dirName = "Southbound In";
                    else if (edgeId.toLowerCase().includes("east")) dirName = "Eastbound In";
                    else if (edgeId.toLowerCase().includes("west")) dirName = "Westbound In";
                    else dirName = edgeId;

                    dash.push({
                        edgeId,
                        dirName,
                        dir: event.dir,
                        signal: getSignalColor(event),
                        count
                    });
                });
                
                // Sort to keep table order consistent
                dash.sort((a, b) => a.dirName.localeCompare(b.dirName));
                setDashboardData(dash);
                
                if (onTelemetry && state.telemetry) {
                    onTelemetry({
                        ...state.telemetry,
                        dash
                    });
                }
            }
        }
        
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        if (isPlaying) {
            engineState.current.lastTick = performance.now();
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, speedMultiplier]);

    useEffect(() => {
        drawFrame();
    }, [geometry]);

    return (
        <div className="bg-[#0f172a] rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
            <div className="p-4 bg-[#1e293b] border-b border-gray-700 flex flex-wrap justify-between items-center gap-3">
               <div className="flex items-center gap-3">
                    <button 
                        onClick={togglePlay}
                        className={`flex items-center justify-center p-3 rounded-full transition-all ${isPlaying ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'}`}
                    >
                        {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} className="ml-0.5" />}
                    </button>
                    <button 
                        onClick={resetSimulation}
                        className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
                        title="Reset Simulation"
                    >
                        <FiRotateCcw size={18} />
                    </button>
                    <div className="h-6 w-px bg-gray-700 mx-1"></div>
                    <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
                        {[1, 2, 5, 10].map(mult => (
                            <button
                                key={mult}
                                onClick={() => setSpeedMultiplier(mult)}
                                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors ${speedMultiplier === mult ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                            >
                                {mult}x
                            </button>
                        ))}
                    </div>
                    <div className="h-6 w-px bg-gray-700 mx-1"></div>
                    <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                        <span className="text-xs text-gray-400 font-bold tracking-widest">ZOOM</span>
                        <input 
                            type="range" 
                            min="1" 
                            max="8" 
                            step="0.5" 
                            value={zoomLevel}
                            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                            className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer hover:bg-blue-500 transition-colors"
                        />
                        <span className="text-xs text-blue-400 font-mono w-6 text-right">{zoomLevel}x</span>
                    </div>
               </div>
               
               <div className="flex items-center gap-5 bg-gray-900/50 px-4 py-1.5 rounded-full">
                    <div className="text-sm font-mono text-gray-400">
                        TIME <span className="text-white ml-2 text-xl font-bold">{Math.floor(simTime / 60).toString().padStart(2, '0')}:{(simTime % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="text-sm font-mono text-gray-400">
                        ACTIVE <span className="text-emerald-400 ml-2 text-xl font-bold">{engineState.current.activeVehicles.length}</span> / {vehicles.length}
                    </div>
               </div>
            </div>

            <div className="w-full bg-[#0a2f1f] relative" style={{ minHeight: '680px' }}>
                <canvas 
                    ref={canvasRef} 
                    width={1800} 
                    height={900} 
                    className="w-full h-auto max-h-[78vh] object-contain shadow-inner"
                />
            </div>
            
            <div className="absolute bottom-6 left-6 flex gap-4 p-2.5 bg-gray-900/80 backdrop-blur-md rounded-xl border border-gray-700 z-10 shadow-xl">
                <div className="flex items-center gap-2"><div className="w-4 h-2 rounded-sm bg-yellow-400"></div><span className="text-xs text-gray-300">Car</span></div>
                <div className="flex items-center gap-2"><div className="w-5 h-2 rounded-sm bg-blue-500"></div><span className="text-xs text-gray-300">Truck</span></div>
                <div className="flex items-center gap-2"><div className="w-5 h-2 rounded-sm bg-orange-500"></div><span className="text-xs text-gray-300">Bus</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-1.5 rounded-sm bg-purple-400"></div><span className="text-xs text-gray-300">Moto</span></div>
                <div className="w-px h-4 bg-gray-700 mx-1"></div>
                <div className="flex items-center gap-2"><div className="w-4 h-2 rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div><span className="text-xs font-bold text-red-400">Emergency</span></div>
            </div>
            
            {dashboardData.length > 0 && (
                <div className="p-5 border-t border-gray-800 bg-[#0f172a]">
                    <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-500 rounded-sm"></span> Active Intersection Diagnostics
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {dashboardData.map((row) => (
                            <div key={row.edgeId} className="bg-[#1e293b] rounded-xl p-4 border border-gray-700 shadow-lg relative overflow-hidden transition-all hover:scale-[1.02]">
                                <div className={`absolute top-0 left-0 w-full h-1.5 ${
                                    row.signal === 'green' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.9)]' :
                                    row.signal === 'yellow' ? 'bg-yellow-400' :
                                    'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                                }`}></div>
                                <div className="flex justify-between items-start mt-1 mb-3">
                                    <div>
                                        <div className="text-gray-400 text-xs font-mono font-bold tracking-widest">{row.dir} AXIS</div>
                                        <div className="text-white font-bold text-lg">{row.dirName}</div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                        row.signal === 'green' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                        row.signal === 'yellow' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                        'bg-red-500/20 text-red-400 border border-red-500/50'
                                    }`}>
                                        {row.signal}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                    <span className="text-gray-400 text-xs font-bold tracking-widest">VEHICLE DENSITY</span>
                                    <span className="text-3xl font-bold font-mono text-emerald-400">{row.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper for rounded rect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.moveTo(x+r, y);
        this.lineTo(x+w-r, y);
        this.quadraticCurveTo(x+w, y, x+w, y+r);
        this.lineTo(x+w, y+h-r);
        this.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
        this.lineTo(x+r, y+h);
        this.quadraticCurveTo(x, y+h, x, y+h-r);
        this.lineTo(x, y+r);
        this.quadraticCurveTo(x, y, x+r, y);
        return this;
    };
}

export default SumoVisualizer;