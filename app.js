// GPS Coordinate Directory for Major US Nodes
const COORDINATES = {
  NY: { lat: 40.7128, lng: -74.0060, label: "New York (JFK)" },
  CHI: { lat: 41.8781, lng: -87.6298, label: "Chicago (ORD)" },
  MIA: { lat: 25.7617, lng: -80.1918, label: "Miami (MIA)" },
  CLE: { lat: 41.4993, lng: -81.6944, label: "Cleveland, OH" },
  KC: { lat: 39.0997, lng: -94.5786, label: "Kansas City, MO" },
  ATL: { lat: 33.7490, lng: -84.3880, label: "Atlanta, GA" },
  DEN: { lat: 39.7392, lng: -104.9903, label: "Denver, CO" },
  DAL: { lat: 32.7767, lng: -96.7970, label: "Dallas, TX" },
  PHX: { lat: 33.4484, lng: -112.0740, label: "Phoenix, AZ" },
  LA: { lat: 34.0522, lng: -118.2437, label: "Los Angeles (LAX)" },
  SEA: { lat: 47.6062, lng: -122.3321, label: "Seattle (SEA)" },
  SF: { lat: 37.7749, lng: -122.4194, label: "San Francisco (SFO)" }
};

// Transport Configurations
const TRANSPORT_SPECS = {
  Truck: { icon: "fa-truck", baseSpeed: 90, label: "Truck Carrier" },
  Plane: { icon: "fa-plane", baseSpeed: 850, label: "Cargo Jet" },
  Ship: { icon: "fa-ship", baseSpeed: 45, label: "Container Vessel" }
};

// Default Seed Data
const DEFAULT_SHIPMENTS = [
  {
    id: "UPS-78361092",
    customerName: "John Doe",
    customerEmail: "customer@ups.com",
    customerPhone: "+1 555 0199",
    address: "1024 Airport Way, Seattle, WA",
    weight: 820,
    desc: "Precision Calibration Instrumentation & Avionics",
    vessel: "Plane",
    origin: "Chicago, IL",
    destination: "Seattle, WA",
    originCode: "CHI",
    destCode: "SEA",
    eta: "2026-07-22",
    status: "In Transit",
    currentLocationName: "In Transit near Casper, WY",
    simulation: {
      active: true,
      currentProgress: 42,
      waypoints: ["CHI", "KC", "DEN", "SEA"],
      speedMultiplier: 2,
      status: "In Transit",
      logs: "Departed Denver Airspace; heading northwest at 31,000 feet."
    }
  },
  {
    id: "UPS-10492837",
    customerName: "John Doe",
    customerEmail: "customer@ups.com",
    customerPhone: "+1 555 0199",
    address: "300 Tech Center Blvd, Los Angeles, CA",
    weight: 12450,
    desc: "Modular Cooling Racks & High-Density Compute Servers",
    vessel: "Truck",
    origin: "New York, NY",
    destination: "Los Angeles, CA",
    originCode: "NY",
    destCode: "LA",
    eta: "2026-07-25",
    status: "Warehouse",
    currentLocationName: "Processing at regional distribution hub Chicago",
    simulation: {
      active: false,
      currentProgress: 25,
      waypoints: ["NY", "CLE", "CHI", "LA"],
      speedMultiplier: 1,
      status: "Warehouse",
      logs: "Shipment sorting completed; scheduled for local line-haul dispatch."
    }
  },
  {
    id: "UPS-99238472",
    customerName: "Jane Smith",
    customerEmail: "jane.smith@corporation.com",
    customerPhone: "+1 555 0341",
    address: "88 Market St, San Francisco, CA",
    weight: 6400,
    desc: "Automotive Lithium Traction Batteries",
    vessel: "Ship",
    origin: "Miami, FL",
    destination: "San Francisco, CA",
    originCode: "MIA",
    destCode: "SF",
    eta: "2026-07-18",
    status: "Delivered",
    currentLocationName: "Delivered at warehouse dock B",
    simulation: {
      active: false,
      currentProgress: 100,
      waypoints: ["MIA", "ATL", "PHX", "SF"],
      speedMultiplier: 1,
      status: "Delivered",
      logs: "Signature received. Delivered by cargo team."
    }
  }
];

const DEFAULT_CUSTOMERS = [
  { name: "John Doe", email: "customer@ups.com", volume: 2 },
  { name: "Jane Smith", email: "jane.smith@corporation.com", volume: 1 }
];

// Initialize LocalStorage Data
function initDatabase() {
  if (!localStorage.getItem("ups_shipments")) {
    localStorage.setItem("ups_shipments", JSON.stringify(DEFAULT_SHIPMENTS));
  }
  if (!localStorage.getItem("ups_customers")) {
    localStorage.setItem("ups_customers", JSON.stringify(DEFAULT_CUSTOMERS));
  }
  if (!localStorage.getItem("active_role")) {
    localStorage.setItem("active_role", "visitor");
  }
}

// Global Application State Manager
class AppState {
  static getShipments() {
    return JSON.parse(localStorage.getItem("ups_shipments") || "[]");
  }
  
  static saveShipments(shipments) {
    localStorage.setItem("ups_shipments", JSON.stringify(shipments));
  }

  static getCustomers() {
    return JSON.parse(localStorage.getItem("ups_customers") || "[]");
  }

  static saveCustomers(customers) {
    localStorage.setItem("ups_customers", JSON.stringify(customers));
  }

  static getActiveRole() {
    return localStorage.getItem("active_role") || "visitor";
  }

  static getActiveUserEmail() {
    const role = this.getActiveRole();
    if (role === "admin") return "admin@ups.com";
    if (role === "customer") return "customer@ups.com";
    return "";
  }

  static setActiveRole(role) {
    localStorage.setItem("active_role", role);
    
    // Adjust DOM state
    const authButtons = document.getElementById("header-auth-buttons");
    const userBlock = document.getElementById("header-user-block");
    const sidebar = document.getElementById("app-sidebar");
    const customerMenu = document.getElementById("sidebar-menu-customer");
    const adminMenu = document.getElementById("sidebar-menu-admin");
    const publicNav = document.getElementById("header-nav-public");

    // Toggle Role buttons
    document.querySelectorAll(".role-toggle-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.role === role);
    });

    if (role === "visitor") {
      authButtons.style.display = "flex";
      userBlock.style.display = "none";
      sidebar.style.display = "none";
      publicNav.style.display = "flex";
    } else {
      authButtons.style.display = "none";
      userBlock.style.display = "flex";
      sidebar.style.display = "flex";
      publicNav.style.display = "none";

      const userAvatar = document.getElementById("header-user-avatar");
      const userName = document.getElementById("header-user-name");

      if (role === "admin") {
        userAvatar.textContent = "AD";
        userAvatar.style.backgroundColor = "#D32F2F"; // Admin red tint
        userName.textContent = "Admin User";
        customerMenu.style.display = "none";
        adminMenu.style.display = "flex";
      } else {
        userAvatar.textContent = "JD";
        userAvatar.style.backgroundColor = "var(--color-primary-dark)";
        userName.textContent = "John Doe";
        customerMenu.style.display = "flex";
        adminMenu.style.display = "none";
        
        const custNameSpan = document.getElementById("span-customer-name");
        if (custNameSpan) custNameSpan.textContent = "John Doe";
      }
    }
  }
}

// Interpolation Engine: Calculates location coordinate at a percentage along a waypoint path
function getInterpolatedPoint(waypointsCodes, progressPercent) {
  if (!waypointsCodes || waypointsCodes.length === 0) return null;
  if (waypointsCodes.length === 1) return COORDINATES[waypointsCodes[0]];
  
  const points = waypointsCodes.map(code => COORDINATES[code]).filter(Boolean);
  if (points.length < 2) return null;
  
  const totalSegments = points.length - 1;
  const segmentWeight = 100 / totalSegments;
  
  // Find current segment index
  let segmentIndex = Math.floor(progressPercent / segmentWeight);
  if (segmentIndex >= totalSegments) {
    segmentIndex = totalSegments - 1;
  }
  
  const segmentStart = points[segmentIndex];
  const segmentEnd = points[segmentIndex + 1];
  
  // Calculate relative progress in this specific segment
  const segmentProgress = (progressPercent - (segmentIndex * segmentWeight)) / segmentWeight;
  const clampedProgress = Math.max(0, Math.min(1, segmentProgress));
  
  const lat = segmentStart.lat + (segmentEnd.lat - segmentStart.lat) * clampedProgress;
  const lng = segmentStart.lng + (segmentEnd.lng - segmentStart.lng) * clampedProgress;
  
  return { lat, lng };
}

// Router class to manage page views
class Router {
  constructor() {
    this.routes = {
      "#home": "landing-page",
      "#login": "login-page",
      "#dashboard": "customer-dashboard-view",
      "#tracking": "tracking-list-view",
      "#details": "shipment-details-view",
      "#admin": "admin-dashboard-view",
      "#appointment": "admin-appointment-view"
    };

    window.addEventListener("hashchange", () => this.handleRouting());
    // Initial Route
    setTimeout(() => this.handleRouting(), 50);
  }

  handleRouting() {
    let hash = window.location.hash || "#home";
    let queryParams = {};

    if (hash.includes("?")) {
      const parts = hash.split("?");
      hash = parts[0];
      const qs = parts[1];
      const params = new URLSearchParams(qs);
      for (const [key, value] of params.entries()) {
        queryParams[key] = value;
      }
    }

    const matchedViewId = this.routes[hash] || "landing-page";
    
    // Security check: Route permissions based on roles
    const currentRole = AppState.getActiveRole();
    if (["customer-dashboard-view", "tracking-list-view", "shipment-details-view"].includes(matchedViewId) && currentRole === "visitor") {
      window.location.hash = "#login";
      return;
    }
    if (["admin-dashboard-view", "admin-appointment-view"].includes(matchedViewId) && currentRole !== "admin") {
      window.location.hash = "#home";
      return;
    }

    // Toggle active classes
    document.querySelectorAll(".page-view").forEach(view => {
      view.classList.remove("active");
    });
    
    const activeView = document.getElementById(matchedViewId);
    if (activeView) {
      activeView.classList.add("active");
    }

    // Update active nav links in main header and sidebar
    document.querySelectorAll(".nav-link").forEach(link => {
      link.classList.toggle("active", link.getAttribute("href") === hash);
    });
    document.querySelectorAll(".sidebar-item").forEach(item => {
      item.classList.toggle("active", item.getAttribute("href") === hash);
    });

    // Custom view trigger handlers
    if (matchedViewId === "customer-dashboard-view") {
      this.initCustomerDashboard();
    } else if (matchedViewId === "tracking-list-view") {
      this.initTrackingList();
    } else if (matchedViewId === "shipment-details-view") {
      this.initShipmentDetails(queryParams.id);
    } else if (matchedViewId === "admin-dashboard-view") {
      this.initAdminDashboard();
    } else if (matchedViewId === "admin-appointment-view") {
      this.initAdminAppointment();
    }
  }

  initCustomerDashboard() {
    const shipments = AppState.getShipments().filter(s => s.customerEmail === AppState.getActiveUserEmail());
    
    // Stats calculation
    const total = shipments.length;
    const transit = shipments.filter(s => s.status === "In Transit").length;
    const delivered = shipments.filter(s => s.status === "Delivered").length;
    const pending = shipments.filter(s => ["Registered", "Picked Up", "Warehouse"].includes(s.status)).length;
    
    document.getElementById("dash-stat-total").textContent = total;
    document.getElementById("dash-stat-transit").textContent = transit;
    document.getElementById("dash-stat-delivered").textContent = delivered;
    document.getElementById("dash-stat-pending").textContent = pending;

    // Load recent active shipment
    const latestShipment = shipments.find(s => s.status !== "Delivered") || shipments[0];
    const infoBlock = document.getElementById("recent-shipment-info");
    const emptyBlock = document.getElementById("recent-shipment-empty");

    if (latestShipment) {
      infoBlock.style.display = "flex";
      emptyBlock.style.display = "none";
      
      document.getElementById("recent-tracking-id").textContent = latestShipment.id;
      document.getElementById("recent-eta").textContent = latestShipment.eta;
      document.getElementById("recent-loc").textContent = latestShipment.currentLocationName;
      document.getElementById("recent-transport-type").textContent = latestShipment.vessel;
      document.getElementById("recent-weight").textContent = latestShipment.weight;
      
      const badge = document.getElementById("recent-status-badge");
      badge.innerHTML = `<span class="status-badge badge-${latestShipment.status.replace(/\s+/g, '').toLowerCase()}">${latestShipment.status}</span>`;
      
      const trackBtn = document.getElementById("btn-quick-track");
      trackBtn.onclick = () => {
        window.location.hash = `#details?id=${latestShipment.id}`;
      };
    } else {
      infoBlock.style.display = "none";
      emptyBlock.style.display = "block";
    }
  }

  initTrackingList() {
    const shipments = AppState.getShipments().filter(s => s.customerEmail === AppState.getActiveUserEmail());
    const tbody = document.getElementById("tbody-customer-shipments");
    tbody.innerHTML = "";

    if (shipments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">No shipments found.</td></tr>`;
      return;
    }

    shipments.forEach(s => {
      const tr = document.createElement("tr");
      const cleanStatusClass = s.status.replace(/\s+/g, '').toLowerCase();
      
      tr.innerHTML = `
        <td class="tr-bold">${s.id}</td>
        <td>${s.origin}</td>
        <td>${s.destination}</td>
        <td><span class="status-badge badge-${cleanStatusClass}">${s.status}</span></td>
        <td>${s.eta}</td>
        <td>
          <a href="#details?id=${s.id}" class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;">
            <i class="fa-solid fa-map-location-dot"></i> Track
          </a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  initShipmentDetails(trackingId) {
    const shipments = AppState.getShipments();
    const shipment = shipments.find(s => s.id === trackingId);
    
    if (!shipment) {
      alert("Shipment tracking ID not found.");
      window.location.hash = "#tracking";
      return;
    }

    // Render Stats
    document.getElementById("detail-tracking-title").textContent = shipment.id;
    document.getElementById("detail-origin").textContent = shipment.origin;
    document.getElementById("detail-destination").textContent = shipment.destination;
    document.getElementById("detail-current-location").textContent = shipment.currentLocationName;
    document.getElementById("detail-eta").textContent = shipment.eta;
    document.getElementById("detail-specs").textContent = `${shipment.weight} lbs (${shipment.desc})`;
    document.getElementById("detail-vessel").textContent = `${TRANSPORT_SPECS[shipment.vessel].label} (${shipment.vessel})`;

    const statusPill = document.getElementById("detail-status-pill");
    const cleanStatusClass = shipment.status.replace(/\s+/g, '').toLowerCase();
    statusPill.className = `status-badge badge-${cleanStatusClass}`;
    statusPill.textContent = shipment.status;

    // Render Timeline Stepper progress
    const steps = ["Registered", "Picked Up", "Warehouse", "In Transit", "Customs", "Destination Country", "Out for Delivery", "Delivered"];
    const currentStepIndex = steps.indexOf(shipment.status);
    
    steps.forEach((step, idx) => {
      const nodeEl = document.getElementById(`step-${idx}`);
      if (nodeEl) {
        nodeEl.classList.remove("completed", "active");
        if (idx < currentStepIndex) {
          nodeEl.classList.add("completed");
        } else if (idx === currentStepIndex) {
          nodeEl.classList.add("active");
        }
      }
    });

    const progressPct = currentStepIndex >= 0 ? (currentStepIndex / (steps.length - 1)) * 100 : 0;
    document.getElementById("timeline-progress-bar").style.width = `${progressPct}%`;

    // Map Instantiation
    this.renderCustomerDetailMap(shipment);

    // Dynamic Side Update Indicators
    const updateSidePanel = (ship) => {
      document.getElementById("panel-live-status-txt").textContent = ship.status;
      document.getElementById("panel-live-log").textContent = ship.simulation.logs || "Connection active.";
      document.getElementById("panel-live-progress-fill").style.width = `${ship.simulation.currentProgress}%`;
      document.getElementById("panel-live-progress-pct").textContent = `${ship.simulation.currentProgress}%`;
      
      const speedKmh = TRANSPORT_SPECS[ship.vessel].baseSpeed * (ship.simulation.speedMultiplier || 1);
      document.getElementById("panel-speed-indicator").textContent = `${speedKmh} km/h (Active)`;
      
      const pts = ship.simulation.waypoints;
      const pt = getInterpolatedPoint(pts, ship.simulation.currentProgress);
      if (pt) {
        document.getElementById("panel-live-coords").textContent = `${pt.lat.toFixed(4)}°N, ${Math.abs(pt.lng).toFixed(4)}°W`;
      }
    };
    
    updateSidePanel(shipment);

    // Refresh Details panel if live simulation in play
    if (this.detailsTimer) clearInterval(this.detailsTimer);
    
    this.detailsTimer = setInterval(() => {
      const activeShip = AppState.getShipments().find(s => s.id === trackingId);
      if (activeShip) {
        updateSidePanel(activeShip);
        this.updateCustomerMarkerPosition(activeShip);
        
        // Refresh statuses in text details
        document.getElementById("detail-current-location").textContent = activeShip.currentLocationName;
        const freshStatusClass = activeShip.status.replace(/\s+/g, '').toLowerCase();
        statusPill.className = `status-badge badge-${freshStatusClass}`;
        statusPill.textContent = activeShip.status;

        // Steps refresh
        const freshStepIndex = steps.indexOf(activeShip.status);
        steps.forEach((step, idx) => {
          const nodeEl = document.getElementById(`step-${idx}`);
          if (nodeEl) {
            nodeEl.classList.remove("completed", "active");
            if (idx < freshStepIndex) nodeEl.classList.add("completed");
            else if (idx === freshStepIndex) nodeEl.classList.add("active");
          }
        });
        const freshPct = freshStepIndex >= 0 ? (freshStepIndex / (steps.length - 1)) * 100 : 0;
        document.getElementById("timeline-progress-bar").style.width = `${freshPct}%`;
      }
    }, 1500);

    // Map refresh
    document.getElementById("btn-refresh-shipment-details").onclick = () => {
      const freshShip = AppState.getShipments().find(s => s.id === trackingId);
      if (freshShip) {
        this.renderCustomerDetailMap(freshShip);
        updateSidePanel(freshShip);
      }
    };
  }

  renderCustomerDetailMap(shipment) {
    if (this.customerMap) {
      this.customerMap.remove();
      this.customerMap = null;
    }

    const container = document.getElementById("tracking-detail-map");
    if (!container) return;

    this.customerMap = L.map("tracking-detail-map", {
      zoomControl: true,
      scrollWheelZoom: false
    }).setView([39.8283, -98.5795], 4); // Centered on USA US

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors © CartoDB",
      maxZoom: 18
    }).addTo(this.customerMap);

    const activeWps = shipment.simulation.waypoints;
    if (!activeWps || activeWps.length < 2) return;

    const coordsList = activeWps.map(code => COORDINATES[code]).filter(Boolean);
    const latLngs = coordsList.map(c => [c.lat, c.lng]);

    // Draw Route Line
    const polyline = L.polyline(latLngs, {
      color: "var(--color-primary-dark)",
      weight: 4,
      opacity: 0.8,
      className: "active-route-line"
    }).addTo(this.customerMap);

    // Fit map bounds
    this.customerMap.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    // Place Origin and Destination Markers
    const startPin = L.divIcon({
      className: "custom-div-icon",
      html: `<div class="marker-pin"><i class="fa-solid fa-house-chimney"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
    L.marker(latLngs[0], { icon: startPin }).addTo(this.customerMap)
      .bindPopup(`<strong>Origin:</strong> ${COORDINATES[activeWps[0]].label}`);

    const endPin = L.divIcon({
      className: "custom-div-icon",
      html: `<div class="marker-pin" style="background-color: var(--color-status-delivered);"><i class="fa-solid fa-flag-checkered"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });
    L.marker(latLngs[latLngs.length - 1], { icon: endPin }).addTo(this.customerMap)
      .bindPopup(`<strong>Destination:</strong> ${COORDINATES[activeWps[activeWps.length - 1]].label}`);

    // Place Intermediate Stop Pins
    if (latLngs.length > 2) {
      for (let i = 1; i < latLngs.length - 1; i++) {
        const stopPin = L.divIcon({
          className: "custom-div-icon",
          html: `<div class="marker-pin" style="background-color:var(--color-primary); border-color:#fff; transform:rotate(-45deg) scale(0.85);"><i class="fa-solid fa-location-crosshairs" style="transform:rotate(45deg) scale(0.8);"></i></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        });
        L.marker(latLngs[i], { icon: stopPin }).addTo(this.customerMap)
          .bindPopup(`<strong>Stop ${i}:</strong> ${COORDINATES[activeWps[i]].label}`);
      }
    }

    // Vehicle live position Pin
    const currentLoc = getInterpolatedPoint(activeWps, shipment.simulation.currentProgress);
    if (currentLoc) {
      const vIcon = TRANSPORT_SPECS[shipment.vessel].icon;
      const vehicleMarkerIcon = L.divIcon({
        className: "custom-div-icon",
        html: `<div class="vehicle-pin"><i class="fa-solid ${vIcon}"></i></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      this.customerVehicleMarker = L.marker([currentLoc.lat, currentLoc.lng], { icon: vehicleMarkerIcon })
        .addTo(this.customerMap)
        .bindPopup(`<strong>Live Cargo Carrier</strong> (${shipment.vessel})`);
    }
  }

  updateCustomerMarkerPosition(shipment) {
    if (!this.customerVehicleMarker || !this.customerMap) return;
    const pt = getInterpolatedPoint(shipment.simulation.waypoints, shipment.simulation.currentProgress);
    if (pt) {
      this.customerVehicleMarker.setLatLng([pt.lat, pt.lng]);
    }
  }

  initAdminDashboard() {
    const shipments = AppState.getShipments();
    const customers = AppState.getCustomers();

    // Stats calculations
    document.getElementById("admin-stat-customers").textContent = customers.length;
    document.getElementById("admin-stat-shipments").textContent = shipments.length;
    document.getElementById("admin-stat-transit").textContent = shipments.filter(s => s.status === "In Transit").length;
    document.getElementById("admin-stat-delivered").textContent = shipments.filter(s => s.status === "Delivered").length;

    // Modern Tables population
    // 1. Shipment lists
    const shipmentTbody = document.getElementById("tbody-admin-shipments");
    shipmentTbody.innerHTML = "";
    
    shipments.forEach(s => {
      const tr = document.createElement("tr");
      const cleanClass = s.status.replace(/\s+/g, '').toLowerCase();
      
      tr.innerHTML = `
        <td class="tr-bold">${s.id}</td>
        <td>${s.customerName}</td>
        <td>${s.destination}</td>
        <td><i class="fa-solid ${TRANSPORT_SPECS[s.vessel].icon}"></i> ${s.vessel}</td>
        <td><span class="status-badge badge-${cleanClass}">${s.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-run-sim" data-id="${s.id}" style="padding: 4px 10px; font-size: 0.75rem;">
            <i class="fa-solid fa-gears"></i> Manage Sim
          </button>
        </td>
      `;
      shipmentTbody.appendChild(tr);
    });

    // 2. Customers
    const customerTbody = document.getElementById("tbody-admin-customers");
    customerTbody.innerHTML = "";
    customers.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="tr-bold">${c.name}</td>
        <td>${c.email}</td>
        <td>${c.volume} Cargo Units</td>
      `;
      customerTbody.appendChild(tr);
    });

    // Manage Sim buttons click delegates
    document.querySelectorAll(".btn-run-sim").forEach(btn => {
      btn.onclick = () => {
        const trkId = btn.dataset.id;
        window.location.hash = `#appointment`;
        // Load the simulator settings panel with this tracking ID
        setTimeout(() => {
          const control = new SimulationController();
          control.loadShipmentToSimulator(trkId);
        }, 100);
      };
    });
  }

  initAdminAppointment() {
    // Generate tracking ID initially if empty
    const trackingInput = document.getElementById("appt-tracking");
    if (trackingInput && !trackingInput.value) {
      trackingInput.value = "UPS-" + Math.floor(10000000 + Math.random() * 90000000);
    }

    // Set default date to future
    const dateInput = document.getElementById("appt-date");
    if (dateInput && !dateInput.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 4);
      dateInput.value = tomorrow.toISOString().split("T")[0];
    }

    // Instantiate mapping simulator preview panel
    if (!this.adminSimControl) {
      this.adminSimControl = new SimulationController();
    }
    this.adminSimControl.initPreviewMap();
  }
}

// Controller logic for Waypoints mapping, Simulation clicks, loops, and telemetry writes
class SimulationController {
  constructor() {
    this.activeShipmentId = localStorage.getItem("sim_current_id") || "UPS-78361092";
    this.timerId = null;
    this.setupViewListeners();
    this.syncActiveControls();
  }

  loadShipmentToSimulator(id) {
    this.activeShipmentId = id;
    localStorage.setItem("sim_current_id", id);
    this.syncActiveControls();
    this.initPreviewMap();
  }

  syncActiveControls() {
    const label = document.getElementById("sim-active-id");
    if (label) label.textContent = this.activeShipmentId;

    const ship = AppState.getShipments().find(s => s.id === this.activeShipmentId);
    if (!ship) return;

    // Map parameters from shipment state
    const waypoints = ship.simulation.waypoints || [];
    if (waypoints.length >= 4) {
      const startEl = document.getElementById("sim-waypoint-start");
      const wp1El = document.getElementById("sim-waypoint-1");
      const wp2El = document.getElementById("sim-waypoint-2");
      const endEl = document.getElementById("sim-waypoint-end");

      if (startEl) startEl.value = waypoints[0];
      if (wp1El) wp1El.value = waypoints[1];
      if (wp2El) wp2El.value = waypoints[2];
      if (endEl) endEl.value = waypoints[3];
    }

    // Status sync
    const statusDropdown = document.getElementById("sim-status-dropdown");
    if (statusDropdown) statusDropdown.value = ship.status;

    // Speed Sync
    const slider = document.getElementById("slider-sim-speed");
    const speedTxt = document.getElementById("txt-sim-speed");
    if (slider && speedTxt) {
      slider.value = ship.simulation.speedMultiplier || 1;
      speedTxt.textContent = `${slider.value}x (${slider.value > 1 ? 'Scaled' : 'Normal'})`;
    }

    // Toggle simulation buttons based on active states
    this.updateControlsState(ship.simulation.active);
  }

  updateControlsState(isSimRunning) {
    const play = document.getElementById("btn-sim-start");
    const pause = document.getElementById("btn-sim-pause");
    const stop = document.getElementById("btn-sim-stop");
    
    if (play && pause && stop) {
      if (isSimRunning) {
        play.disabled = true;
        pause.disabled = false;
        stop.disabled = false;
      } else {
        play.disabled = false;
        pause.disabled = true;
        stop.disabled = true;
      }
    }
  }

  setupViewListeners() {
    // Avoid double bindings
    if (window.simListenersBound) return;
    window.simListenersBound = true;

    // Waypoint Selector triggers
    ["sim-waypoint-start", "sim-waypoint-1", "sim-waypoint-2", "sim-waypoint-end"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", () => {
          this.rebuildRouteWaypoints();
        });
      }
    });

    // Main Simulation Controls
    const startBtn = document.getElementById("btn-sim-start");
    if (startBtn) {
      startBtn.addEventListener("click", () => this.startSimulation());
    }

    const pauseBtn = document.getElementById("btn-sim-pause");
    if (pauseBtn) {
      pauseBtn.addEventListener("click", () => this.pauseSimulation());
    }

    const stopBtn = document.getElementById("btn-sim-stop");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => this.stopSimulation());
    }

    const resetBtn = document.getElementById("btn-sim-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.resetSimulation());
    }

    // Position controls
    document.getElementById("btn-sim-forward")?.addEventListener("click", () => this.shiftPosition(2.5));
    document.getElementById("btn-sim-back")?.addEventListener("click", () => this.shiftPosition(-2.5));
    document.getElementById("btn-sim-next-wp")?.addEventListener("click", () => this.jumpWaypoint(1));
    document.getElementById("btn-sim-prev-wp")?.addEventListener("click", () => this.jumpWaypoint(-1));

    // Custom speeds slider
    const slider = document.getElementById("slider-sim-speed");
    if (slider) {
      slider.addEventListener("input", (e) => {
        const val = e.target.value;
        document.getElementById("txt-sim-speed").textContent = `${val}x (${val > 1 ? 'Scaled' : 'Normal'})`;
        
        const shipments = AppState.getShipments();
        const ship = shipments.find(s => s.id === this.activeShipmentId);
        if (ship) {
          ship.simulation.speedMultiplier = parseInt(val);
          AppState.saveShipments(shipments);
        }
      });
    }

    // Status drop triggers
    document.getElementById("sim-status-dropdown")?.addEventListener("change", (e) => {
      this.updateShipmentStatus(e.target.value);
    });

    // Register Form Handler
    document.getElementById("appointment-form")?.addEventListener("submit", (e) => {
      e.preventDefault();
      this.registerShippingAppointment();
    });
  }

  // Live registration of shipping components
  registerShippingAppointment() {
    const custName = document.getElementById("appt-cust-name").value;
    const custEmail = document.getElementById("appt-cust-email").value;
    const custPhone = document.getElementById("appt-cust-phone").value;
    const custAddr = document.getElementById("appt-cust-address").value;
    
    const trkId = document.getElementById("appt-tracking").value;
    const vessel = document.getElementById("appt-vessel").value;
    const origin = document.getElementById("appt-origin").value;
    const destination = document.getElementById("appt-destination").value;
    const weight = parseInt(document.getElementById("appt-weight").value);
    const eta = document.getElementById("appt-date").value;
    const desc = document.getElementById("appt-desc").value;

    const newShipment = {
      id: trkId,
      customerName: custName,
      customerEmail: custEmail,
      customerPhone: custPhone,
      address: custAddr,
      weight: weight,
      desc: desc,
      vessel: vessel,
      origin: origin,
      destination: destination,
      originCode: "CHI", // simulated default coordinates
      destCode: "SEA",   // maps to Chicago -> Seattle segment defaults
      eta: eta,
      status: "Registered",
      currentLocationName: `Scheduled for departure at ${origin}`,
      simulation: {
        active: false,
        currentProgress: 0,
        waypoints: ["CHI", "KC", "DEN", "SEA"],
        speedMultiplier: 1,
        status: "Registered",
        logs: "Shipping appointment created. Awaiting first courier scan."
      }
    };

    const shipments = AppState.getShipments();
    shipments.unshift(newShipment); // prepend to view first
    AppState.saveShipments(shipments);

    // Save Customer if new
    const customers = AppState.getCustomers();
    const existingCust = customers.find(c => c.email.toLowerCase() === custEmail.toLowerCase());
    if (existingCust) {
      existingCust.volume += 1;
    } else {
      customers.push({ name: custName, email: custEmail, volume: 1 });
    }
    AppState.saveCustomers(customers);

    alert(`Shipment registered successfully!\nTracking ID: ${trkId}`);
    
    // Clear and reset form
    document.getElementById("appointment-form").reset();
    document.getElementById("appt-tracking").value = "UPS-" + Math.floor(10000000 + Math.random() * 90000000);
    
    // Load local simulator control to newly created ID
    this.loadShipmentToSimulator(trkId);
  }

  rebuildRouteWaypoints() {
    const start = document.getElementById("sim-waypoint-start").value;
    const wp1 = document.getElementById("sim-waypoint-1").value;
    const wp2 = document.getElementById("sim-waypoint-2").value;
    const end = document.getElementById("sim-waypoint-end").value;

    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    
    if (ship) {
      ship.simulation.waypoints = [start, wp1, wp2, end];
      ship.origin = COORDINATES[start].label;
      ship.destination = COORDINATES[end].label;
      ship.originCode = start;
      ship.destCode = end;
      AppState.saveShipments(shipments);
      
      this.initPreviewMap();
    }
  }

  initPreviewMap() {
    if (this.previewMap) {
      this.previewMap.remove();
      this.previewMap = null;
    }

    const container = document.getElementById("admin-sim-map");
    if (!container) return;

    this.previewMap = L.map("admin-sim-map", {
      zoomControl: false,
      scrollWheelZoom: true
    }).setView([39.8283, -98.5795], 3);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png", {
      maxZoom: 18
    }).addTo(this.previewMap);

    const ship = AppState.getShipments().find(s => s.id === this.activeShipmentId);
    if (!ship) return;

    const activeWps = ship.simulation.waypoints;
    if (!activeWps || activeWps.length < 2) return;

    const coordsList = activeWps.map(code => COORDINATES[code]).filter(Boolean);
    const latLngs = coordsList.map(c => [c.lat, c.lng]);

    // Draw route preview line
    const polyline = L.polyline(latLngs, {
      color: "var(--color-primary)",
      weight: 3,
      opacity: 0.7
    }).addTo(this.previewMap);

    this.previewMap.fitBounds(polyline.getBounds(), { padding: [10, 10] });

    // Custom Origin and Destination markers
    L.circleMarker(latLngs[0], { radius: 6, color: "var(--color-primary-dark)", fillColor: "#fff", fillOpacity: 1 }).addTo(this.previewMap);
    L.circleMarker(latLngs[latLngs.length - 1], { radius: 6, color: "var(--color-status-delivered)", fillColor: "#fff", fillOpacity: 1 }).addTo(this.previewMap);

    // Intermediate nodes
    for (let i = 1; i < latLngs.length - 1; i++) {
       L.circleMarker(latLngs[i], { radius: 5, color: "#888", fillColor: "#fff", fillOpacity: 1 }).addTo(this.previewMap);
    }

    // Vehicle marker
    const currentLoc = getInterpolatedPoint(activeWps, ship.simulation.currentProgress);
    if (currentLoc) {
      const vIcon = TRANSPORT_SPECS[ship.vessel].icon;
      const vehicleMarkerIcon = L.divIcon({
        className: "custom-div-icon",
        html: `<div class="vehicle-pin" style="width:28px; height:28px; border-width:2px;"><i class="fa-solid ${vIcon}" style="font-size:0.8rem;"></i></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      this.previewVehicleMarker = L.marker([currentLoc.lat, currentLoc.lng], { icon: vehicleMarkerIcon }).addTo(this.previewMap);
    }
  }

  updatePreviewVehiclePosition(ship) {
    if (!this.previewVehicleMarker) return;
    const pt = getInterpolatedPoint(ship.simulation.waypoints, ship.simulation.currentProgress);
    if (pt) {
      this.previewVehicleMarker.setLatLng([pt.lat, pt.lng]);
    }
  }

  startSimulation() {
    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    if (!ship) return;

    ship.simulation.active = true;
    AppState.saveShipments(shipments);
    this.updateControlsState(true);

    if (this.timerId) clearInterval(this.timerId);

    // Set simulator status to transit initially if starting from zero
    if (ship.simulation.currentProgress === 0 && ship.status === "Registered") {
      this.updateShipmentStatus("In Transit");
      document.getElementById("sim-status-dropdown").value = "In Transit";
    }

    this.timerId = setInterval(() => {
      const freshShipments = AppState.getShipments();
      const freshShip = freshShipments.find(s => s.id === this.activeShipmentId);
      
      if (!freshShip || !freshShip.simulation.active) {
        clearInterval(this.timerId);
        this.updateControlsState(false);
        return;
      }

      // Step progress calculation based on speed multiplier
      let stepPercent = 1;
      if (freshShip.vessel === "Plane") stepPercent = 2; // air travels faster
      if (freshShip.vessel === "Ship") stepPercent = 0.5; // sea transit is slower

      freshShip.simulation.currentProgress += (stepPercent * freshShip.simulation.speedMultiplier);

      if (freshShip.simulation.currentProgress >= 100) {
        freshShip.simulation.currentProgress = 100;
        freshShip.simulation.active = false;
        freshShip.status = "Delivered";
        freshShip.currentLocationName = `Arrived at final destination: ${freshShip.destination}`;
        freshShip.simulation.logs = "Delivery completed. Recipient signature recorded.";
        
        clearInterval(this.timerId);
        this.updateControlsState(false);
        this.syncActiveControls();
      } else {
        // Dynamic logs simulation based on progress thresholds
        const prog = freshShip.simulation.currentProgress;
        const wps = freshShip.simulation.waypoints;
        const speedKms = TRANSPORT_SPECS[freshShip.vessel].baseSpeed * freshShip.simulation.speedMultiplier;
        
        freshShip.simulation.logs = `Carrier moving dynamically along coordinates. Ground velocity: ${speedKms} km/h. GPS Telemetry OK.`;
        
        if (prog < 25) {
          freshShip.status = "Picked Up";
          freshShip.currentLocationName = `In Transit between ${COORDINATES[wps[0]].label} and ${COORDINATES[wps[1]].label}`;
        } else if (prog >= 25 && prog < 50) {
          freshShip.status = "In Transit";
          freshShip.currentLocationName = `Approaching hub checkpoint: ${COORDINATES[wps[1]].label}`;
        } else if (prog >= 50 && prog < 75) {
          freshShip.status = "In Transit";
          freshShip.currentLocationName = `In Transit near ${COORDINATES[wps[2]].label}`;
        } else if (prog >= 75 && prog < 92) {
          freshShip.status = "Destination Country";
          freshShip.currentLocationName = `Arrived at regional sort facility: ${COORDINATES[wps[3]].label}`;
        } else if (prog >= 92 && prog < 100) {
          freshShip.status = "Out for Delivery";
          freshShip.currentLocationName = `Loaded on local delivery vehicle at hub ${COORDINATES[wps[3]].label}`;
        }
      }

      AppState.saveShipments(freshShipments);
      this.updatePreviewVehiclePosition(freshShip);
    }, 1000);
  }

  pauseSimulation() {
    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    if (ship) {
      ship.simulation.active = false;
      ship.simulation.logs = "Simulation paused by operations dashboard.";
      AppState.saveShipments(shipments);
      this.updateControlsState(false);
    }
    if (this.timerId) clearInterval(this.timerId);
  }

  stopSimulation() {
    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    if (ship) {
      ship.simulation.active = false;
      ship.simulation.currentProgress = 0;
      ship.status = "Warehouse";
      ship.currentLocationName = `Simulation term; holding at hub ${COORDINATES[ship.simulation.waypoints[0]].label}`;
      ship.simulation.logs = "Tracking signal terminated by dispatcher control.";
      AppState.saveShipments(shipments);
      this.updateControlsState(false);
      this.syncActiveControls();
      this.updatePreviewVehiclePosition(ship);
    }
    if (this.timerId) clearInterval(this.timerId);
  }

  resetSimulation() {
    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    if (ship) {
      ship.simulation.active = false;
      ship.simulation.currentProgress = 0;
      ship.status = "Registered";
      ship.currentLocationName = `Awaiting departure at ${ship.origin}`;
      ship.simulation.logs = "Telemetry statistics reset. Ready for dispatch.";
      AppState.saveShipments(shipments);
      this.updateControlsState(false);
      this.syncActiveControls();
      this.updatePreviewVehiclePosition(ship);
    }
    if (this.timerId) clearInterval(this.timerId);
  }

  shiftPosition(delta) {
    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    if (ship) {
      let newProgress = ship.simulation.currentProgress + delta;
      newProgress = Math.max(0, Math.min(100, newProgress));
      ship.simulation.currentProgress = newProgress;
      
      if (newProgress === 100) {
        ship.status = "Delivered";
        ship.currentLocationName = `Arrived at final destination: ${ship.destination}`;
        ship.simulation.logs = "Delivery completed.";
      }
      
      AppState.saveShipments(shipments);
      this.updatePreviewVehiclePosition(ship);
      this.syncActiveControls();
    }
  }

  jumpWaypoint(direction) {
    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    if (ship) {
      const idxSteps = [0, 33.3, 66.6, 100];
      const prog = ship.simulation.currentProgress;
      
      // Find closest node index
      let closestIdx = 0;
      let minDiff = 100;
      idxSteps.forEach((step, i) => {
        const diff = Math.abs(prog - step);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      });

      let targetIdx = closestIdx + direction;
      targetIdx = Math.max(0, Math.min(3, targetIdx));
      
      ship.simulation.currentProgress = idxSteps[targetIdx];
      
      // Set milestone status depending on waypoint location
      const wps = ship.simulation.waypoints;
      if (targetIdx === 0) {
        ship.status = "Registered";
        ship.currentLocationName = `Scheduled for departure at ${COORDINATES[wps[0]].label}`;
      } else if (targetIdx === 1) {
        ship.status = "In Transit";
        ship.currentLocationName = `Vessel arrival at stop: ${COORDINATES[wps[1]].label}`;
      } else if (targetIdx === 2) {
        ship.status = "In Transit";
        ship.currentLocationName = `Vessel arrival at stop: ${COORDINATES[wps[2]].label}`;
      } else if (targetIdx === 3) {
        ship.status = "Delivered";
        ship.currentLocationName = `Arrived at final destination: ${COORDINATES[wps[3]].label}`;
      }

      AppState.saveShipments(shipments);
      this.updatePreviewVehiclePosition(ship);
      this.syncActiveControls();
    }
  }

  updateShipmentStatus(status) {
    const shipments = AppState.getShipments();
    const ship = shipments.find(s => s.id === this.activeShipmentId);
    if (ship) {
      ship.status = status;
      
      // Sync progress roughly to status
      const steps = ["Registered", "Picked Up", "Warehouse", "In Transit", "Customs", "Destination Country", "Out for Delivery", "Delivered"];
      const sIdx = steps.indexOf(status);
      if (sIdx >= 0) {
        ship.simulation.currentProgress = Math.round((sIdx / (steps.length - 1)) * 100);
      }
      
      if (status === "Delivered") {
        ship.currentLocationName = `Arrived at final destination: ${ship.destination}`;
        ship.simulation.logs = "Delivery completed.";
      } else {
        ship.currentLocationName = `Status updated to ${status}. Details updated in operations registry.`;
        ship.simulation.logs = `Carrier checkpoint reached: Cargo status flagged as ${status}.`;
      }
      
      AppState.saveShipments(shipments);
      this.updatePreviewVehiclePosition(ship);
      this.syncActiveControls();
    }
  }
}

// Global initialization logic on Dom Loaded
document.addEventListener("DOMContentLoaded", () => {
  initDatabase();
  
  // Set initial role setup
  const startingRole = AppState.getActiveRole();
  AppState.setActiveRole(startingRole);

  const router = new Router();

  // Handle Login Submissions
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      
      if (email.includes("admin")) {
        AppState.setActiveRole("admin");
        window.location.hash = "#admin";
      } else {
        AppState.setActiveRole("customer");
        window.location.hash = "#dashboard";
      }
    });
  }

  // Floating design Role Switcher listeners
  ["btn-role-visitor", "btn-role-customer", "btn-role-admin"].forEach(id => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      const targetRole = e.target.dataset.role;
      AppState.setActiveRole(targetRole);
      
      if (targetRole === "visitor") {
        window.location.hash = "#home";
      } else if (targetRole === "customer") {
        window.location.hash = "#dashboard";
      } else if (targetRole === "admin") {
        window.location.hash = "#admin";
      }
    });
  });

  // Landing CTA Track search
  document.getElementById("btn-tracking-search")?.addEventListener("click", () => {
    const trkVal = document.getElementById("input-tracking-search").value.trim();
    if (trkVal) {
      // Find shipment under active role
      const role = AppState.getActiveRole();
      if (role === "visitor") {
        alert("Please login first to view tracking detailed maps.");
        window.location.hash = "#login";
      } else {
        const ships = AppState.getShipments();
        const matched = ships.find(s => s.id.toLowerCase() === trkVal.toLowerCase());
        if (matched) {
          window.location.hash = `#details?id=${matched.id}`;
        } else {
          alert(`Shipment "${trkVal}" not found under your customer docket.`);
        }
      }
    }
  });
});
