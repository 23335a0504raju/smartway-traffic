class TrafficController:
    def __init__(self):
        # Default timings (seconds)
        self.min_green_time = 10
        self.max_green_time = 60
        self.base_density_threshold = 5  # Vehicles per lane/view
        
    def calculate_signal_state(self, junctions_data):
        """
        Decides which junction should be Green based on density and priority.
        junctions_data: dict of junction_id -> {vehicle_count, has_emergency, ...}
        """
        updates = {}
        
        # 1. Check for Emergency Override
        emergency_junctions = [jid for jid, data in junctions_data.items() if data.get('emergency')]
        
        if emergency_junctions:
            # Grant green to the first emergency junction found
            priority_junction = emergency_junctions[0]
            for jid in junctions_data:
                updates[jid] = "green" if jid == priority_junction else "red"
            return updates, "EMERGENCY_OVERRIDE"

        # 2. Density Based Logic
        # Find junction with highest density
        sorted_junctions = sorted(
            junctions_data.items(), 
            key=lambda x: x[1].get('density', 0), 
            reverse=True
        )
        
        highest_density_junction = sorted_junctions[0][0]
        highest_density_val = sorted_junctions[0][1].get('density', 0)
        
        # Simple Logic: Highest density gets Green
        for jid in junctions_data:
            if jid == highest_density_junction and highest_density_val > 0:
                updates[jid] = "green"
            else:
                updates[jid] = "red"
                
        return updates, "DENSITY_OPTIMIZED"

    def dynamic_green_duration(self, vehicle_count):
        """
        Calculates how long the green light should stay on.
        """
        if vehicle_count == 0:
            return 0
        
        # Simple linear scaling: 2 seconds per vehicle, clamped
        duration = vehicle_count * 2
        return max(self.min_green_time, min(duration, self.max_green_time))
