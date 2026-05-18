// Fleet Apex Intelligent AI — Core Types

export interface Company {
  id: string;
  name: string;
  tradingName?: string;
  domain?: string;
  subdomain?: string;
  branding: BrandingProfile;
  settings: CompanySettings;
  createdAt: string;
}

export interface BrandingProfile {
  logo?: string;
  logoDark?: string;
  favicon?: string;
  pwaIcon?: string;
  splashScreen?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontPreference: string;
  appName: string;
  welcomeMessage?: string;
  supportEmail?: string;
  supportPhone?: string;
  websiteUrl?: string;
  darkMode: "dark" | "light" | "auto";
  backgroundImage?: string;
}

export interface CompanySettings {
  speedThreshold: number;
  mandatoryBreakHours: number;
  maxDrivingHours: number;
  routeRestrictions: string[];
  vehicleRestrictions: string[];
  aiProvider: "openai" | "ollama" | "local";
  aiApiKeyVault?: string;
}

export interface Driver {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  licenseNumber: string;
  licenseExpiry: string;
  vehicleId?: string;
  status: "active" | "offline" | "on_break" | "emergency";
  safetyScore: number;
  currentLocation?: GeoPoint;
  currentRoute?: string;
  lastSeen?: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  registration: string;
  type: string;
  make: string;
  model: string;
  width: number;
  height: number;
  weight: number;
  motExpiry: string;
  insuranceExpiry: string;
  lastInspection: string;
  status: "active" | "maintenance" | "offline";
}

export interface Route {
  id: string;
  companyId: string;
  driverId: string;
  vehicleId: string;
  name: string;
  origin: GeoPoint;
  destination: GeoPoint;
  waypoints: GeoPoint[];
  status: "pending" | "active" | "completed" | "cancelled";
  estimatedDuration: number;
  distance: number;
  riskScore: number;
  aiOptimized: boolean;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Hazard {
  id: string;
  companyId: string;
  driverId: string;
  vehicleId: string;
  type: string;
  severity: "red" | "orange" | "yellow";
  location: GeoPoint;
  roadName?: string;
  description?: string;
  photos?: string[];
  voiceNote?: string;
  vehicleType: string;
  verified: boolean;
  resolved: boolean;
  reportedAt: string;
  resolvedAt?: string;
  affectedVehicleTypes: string[];
}

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp?: string;
}

export interface LocationUpdate {
  driverId: string;
  vehicleId: string;
  companyId: string;
  location: GeoPoint;
  routeId?: string;
  stopsCompleted: number;
  batteryLevel?: number;
  signalStrength?: number;
}

export interface AIRequest {
  id: string;
  companyId: string;
  type: "route_analysis" | "hazard_check" | "safety_score" | "coaching" | "report";
  context: AIContext;
  prompt: string;
  response?: string;
  validationStatus: "pending" | "approved" | "modified" | "flagged" | "blocked";
  riskScore?: number;
  auditLog: AIAuditEntry[];
  createdAt: string;
}

export interface AIContext {
  vehicleType?: string;
  vehicleWidth?: number;
  driverSafetyScore?: number;
  routeId?: string;
  hazardReports?: Hazard[];
  weatherConditions?: string;
  companyRules?: string[];
  driverHours?: number;
}

export interface AIAuditEntry {
  timestamp: string;
  action: string;
  reason?: string;
  validator: string;
}

export interface ComplianceAlert {
  id: string;
  companyId: string;
  driverId?: string;
  vehicleId?: string;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  resolved: boolean;
  createdAt: string;
}

export interface SafetyScore {
  driverId: string;
  score: number;
  speedingEvents: number;
  harshBraking: number;
  hazardsReported: number;
  incidentsInvolved: number;
  hoursCompliance: number;
  lastUpdated: string;
}
