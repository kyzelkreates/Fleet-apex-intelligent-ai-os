// Fleet Apex Intelligent AI — Brand Constants
export const BRAND = {
  name: "Fleet Apex Intelligent AI",
  shortName: "Fleet Apex",
  tagline: "Intelligence Driving Every Journey",
  version: "1.0.0",
  defaultColors: {
    primary: "#0A1628",       // Deep Navy
    secondary: "#1E3A5F",     // Fleet Blue
    accent: "#00D4FF",        // Apex Cyan
    danger: "#FF3B3B",        // Alert Red
    warning: "#FF9500",       // Caution Orange
    success: "#34C759",       // Go Green
    background: "#050E1A",    // Void Black
    surface: "#0D1F35",       // Card Surface
    text: "#FFFFFF",
    textMuted: "#8899AA",
  },
  fonts: {
    primary: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, monospace",
  },
};

export const HAZARD_TYPES = [
  { id: "accident", label: "Accident", icon: "🚨", severity: "red" },
  { id: "road_closure", label: "Road Closure", icon: "🚧", severity: "red" },
  { id: "flooding", label: "Flooding", icon: "🌊", severity: "red" },
  { id: "ice", label: "Ice", icon: "🧊", severity: "orange" },
  { id: "fallen_tree", label: "Fallen Tree", icon: "🌲", severity: "orange" },
  { id: "construction", label: "Construction", icon: "👷", severity: "orange" },
  { id: "broken_vehicle", label: "Broken Down Vehicle", icon: "🚗", severity: "orange" },
  { id: "police_incident", label: "Police Incident", icon: "🚔", severity: "red" },
  { id: "dangerous_junction", label: "Dangerous Junction", icon: "⚠️", severity: "orange" },
  { id: "low_bridge", label: "Low Bridge", icon: "🌉", severity: "red" },
  { id: "weight_restriction", label: "Weight Restriction", icon: "⚖️", severity: "red" },
  { id: "potholes", label: "Potholes", icon: "🕳️", severity: "yellow" },
  { id: "unsafe_parking", label: "Unsafe Parking", icon: "🅿️", severity: "yellow" },
  { id: "traffic_congestion", label: "Traffic Congestion", icon: "🚦", severity: "yellow" },
  { id: "narrow_road", label: "Narrow Road", icon: "↔️", severity: "orange" },
  { id: "tight_road_parked", label: "TIGHT ROAD — CARS PARKED BOTH SIDES", icon: "🚐", severity: "red", critical: true },
];

export const VEHICLE_TYPES = [
  { id: "car", label: "Car", width: 1.9 },
  { id: "van", label: "Van", width: 2.1 },
  { id: "large_van", label: "Large Van", width: 2.4 },
  { id: "hgv", label: "HGV", width: 2.55 },
  { id: "artic", label: "Articulated Lorry", width: 2.55 },
  { id: "minibus", label: "Minibus", width: 2.2 },
  { id: "coach", label: "Coach", width: 2.55 },
];
