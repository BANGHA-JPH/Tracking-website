import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, Plane, Ship, Activity, ClipboardList, PlusCircle, CheckCircle, 
  MapPin, LogOut, ArrowRight, Eye, EyeOff, Shield, Users, Package, RefreshCw, Mail, Lock,
  SlidersHorizontal, Download, Printer, Search, Trash
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://127.0.0.1:5000/api' 
    : `${window.location.origin}/api`);

const WS_BASE = import.meta.env.VITE_WS_BASE || 
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'ws://127.0.0.1:5000' 
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`);

const GPS_COORDINATES = {
  'CHI': [41.8781, -87.6298], // Chicago
  'KC':  [39.0997, -94.5786], // Kansas City
  'DEN': [39.7392, -104.9903], // Denver
  'SEA': [47.6062, -122.3321], // Seattle
  'NY':  [40.7128, -74.0060], // New York
  'CLE': [41.4993, -81.6944], // Cleveland
  'LA':  [34.0522, -118.2437], // Los Angeles
  'MIA': [25.7617, -80.1918], // Miami
  'ATL': [33.7490, -84.3880], // Atlanta
  'PHX': [33.4484, -112.0740], // Phoenix
  'SF':  [37.7749, -122.4194], // San Francisco
  'SIN': [1.3521, 103.8198],    // Singapore
  'BER': [52.5200, 13.4050],    // Berlin
  'JFK': [40.6413, -73.7781],   // New York JFK
  'LHR': [51.4700, -0.4543],    // London Heathrow
  'HND': [35.5494, 139.7798],   // Tokyo Haneda
  'LAX': [33.9416, -118.4085],  // Los Angeles LAX
  'DXB': [25.2532, 55.3657],    // Dubai
  'BOM': [19.0896, 72.8656],    // Mumbai
  'SZX': [22.6393, 113.8107]     // Shenzhen SZX
};

function getInterpolatedPosition(waypoints, progressPercentage) {
  if (!waypoints || waypoints.length === 0) return [0, 0];
  if (waypoints.length === 1) return GPS_COORDINATES[waypoints[0]] || [0, 0];

  const totalSegments = waypoints.length - 1;
  const progressRatio = progressPercentage / 100;
  const exactSegment = progressRatio * totalSegments;
  const activeSegmentIndex = Math.min(Math.floor(exactSegment), totalSegments - 1);
  const segmentProgress = exactSegment - activeSegmentIndex;

  const startStop = waypoints[activeSegmentIndex];
  const endStop = waypoints[activeSegmentIndex + 1];

  const startCoords = GPS_COORDINATES[startStop];
  const endCoords = GPS_COORDINATES[endStop];

  if (!startCoords || !endCoords) return [0, 0];

  const lat = startCoords[0] + (endCoords[0] - startCoords[0]) * segmentProgress;
  const lng = startCoords[1] + (endCoords[1] - startCoords[1]) * segmentProgress;

  return [lat, lng];
}

// Subcomponents: Interactive Leaflet Map Viewer
const LeafletMap = ({ shipment }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLineRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    const originCoords = GPS_COORDINATES[shipment.originCode] || [39.8283, -98.5795];
    mapInstanceRef.current = L.map(mapContainerRef.current, {
      zoomControl: true
    }).setView(originCoords, 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !shipment) return;

    // Clean old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLineRef.current) map.removeLayer(routeLineRef.current);
    if (vehicleMarkerRef.current) map.removeLayer(vehicleMarkerRef.current);

    // Plot Route Waypoints
    const routePoints = (shipment.simulation.waypoints || []).map(code => ({
      code,
      coords: GPS_COORDINATES[code]
    })).filter(pt => pt.coords);

    const latlngs = routePoints.map(pt => pt.coords);

    // Draw routing line
    if (latlngs.length > 0) {
      routeLineRef.current = L.polyline(latlngs, {
        color: '#FFB500',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10'
      }).addTo(map);

      // Plot Hub Pins
      routePoints.forEach((pt, index) => {
        const isEnd = index === routePoints.length - 1;
        const isStart = index === 0;

        const pinIcon = L.divIcon({
          html: `<div class="map-hub-pin ${isStart ? 'start' : isEnd ? 'end' : 'mid'}"><span>${pt.code}</span></div>`,
          className: 'custom-pin-container',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker(pt.coords, { icon: pinIcon })
          .addTo(map)
          .bindPopup(`<b>Hub: ${pt.code}</b><br/>Stop Index: ${index}`);
        markersRef.current.push(marker);
      });
    }

    // Set Vehicle Marker
    const vehiclePos = getInterpolatedPosition(shipment.simulation.waypoints, shipment.simulation.currentProgress);
    const vehicleIcon = L.divIcon({
      html: `<div class="sim-vehicle ${shipment.vessel.toLowerCase()}" style="transform: rotate(0deg);"><i class="fas fa-${shipment.vessel === 'Plane' ? 'plane' : shipment.vessel === 'Ship' ? 'ship' : 'truck'}"></i></div>`,
      className: 'custom-vehicle-container',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    vehicleMarkerRef.current = L.marker(vehiclePos, { icon: vehicleIcon })
      .addTo(map)
      .bindPopup(`<b>${shipment.id} (${shipment.vessel})</b><br/>Telemetry: ${shipment.simulation.currentProgress.toFixed(1)}% complete`);

    // Pan map to vehicle position
    map.panTo(vehiclePos);

  }, [shipment, shipment.simulation.currentProgress, shipment.simulation.waypoints]);

  return (
    <div style={{ height: '350px', width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }}></div>
    </div>
  );
};

const EmailCenterView = ({ shipments, API_BASE }) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [templateType, setTemplateType] = useState('CUSTOM_NOTICE');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '6px',
    background: '#1b1613',
    border: '1px solid var(--border-color, #3a322c)',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const handleSelectShipment = (shipmentId) => {
    setSelectedShipmentId(shipmentId);
    if (!shipmentId) return;
    const shipment = shipments.find(s => s.id === shipmentId);
    if (shipment) {
      if (shipment.customerEmail) setRecipientEmail(shipment.customerEmail);
      if (shipment.customerName) setRecipientName(shipment.customerName);
      applyTemplate(templateType, shipment);
    }
  };

  const applyTemplate = (type, shipment = null) => {
    setTemplateType(type);
    const activeShipment = shipment || shipments.find(s => s.id === selectedShipmentId);
    const code = activeShipment?.id || '[TRACKING_CODE]';

    if (type === 'SHIPMENT_UPDATE') {
      setSubject(`Shipment Update: UPS Package #${code}`);
      setMessageBody(`Your package #${code} has been updated to "${activeShipment?.status || 'In Transit'}". Current location: ${activeShipment?.currentLocationName || activeShipment?.origin || 'Hub'}.`);
    } else if (type === 'OUT_FOR_DELIVERY') {
      setSubject(`Out for Delivery: UPS Package #${code}`);
      setMessageBody(`Great news! Your UPS package #${code} is out for final delivery today. Please ensure someone is available to receive the package.`);
    } else if (type === 'DELAY_NOTICE') {
      setSubject(`Important Notice: Update on UPS Package #${code}`);
      setMessageBody(`We wanted to notify you that shipment #${code} is experiencing a slight delay due to logistics processing. Our team is actively resolving this to deliver your package as soon as possible.`);
    } else {
      setSubject(`Notice regarding your UPS Shipment #${code}`);
      setMessageBody(`Hello,\n\nWe are writing to provide an update regarding your parcel with UPS Logistics.\n\nThank you for choosing UPS Services.`);
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.trim()) {
      setFeedback({ type: 'error', text: 'Please provide a valid recipient email address.' });
      return;
    }
    if (!messageBody || !messageBody.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a message body before sending.' });
      return;
    }

    setSending(true);
    setFeedback({ type: '', text: '' });

    try {
      const trackUrl = selectedShipmentId ? `${window.location.origin}/#details?id=${selectedShipmentId}` : window.location.origin;

      const res = await fetch(`${API_BASE}/admin/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: recipientEmail,
          recipientName: recipientName || recipientEmail.split('@')[0],
          subject: subject,
          messageBody: messageBody,
          templateType: templateType,
          shipmentId: selectedShipmentId,
          buttonUrl: trackUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', text: `Email dispatched successfully to ${recipientEmail}!` });
      } else {
        setFeedback({ type: 'error', text: data.error || 'Failed to send email.' });
      }
    } catch (err) {
      setFeedback({ type: 'error', text: 'Error connecting to email dispatch server.' });
    } finally {
      setSending(false);
    }
  };

  const selectedShipment = shipments.find(s => s.id === selectedShipmentId);

  return (
    <section className="email-center-view" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mail style={{ color: '#ffb900' }} /> Admin Email Dispatch Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '6px 0 0 0', fontSize: '0.9rem' }}>
            Send transactional emails & updates directly to customers via Resend API
          </p>
        </div>
        <div style={{ background: 'rgba(255, 185, 0, 0.1)', border: '1px solid #ffb900', padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', color: '#ffb900', fontWeight: '700' }}>
          ✓ Resend Active: support@ups-global-shipping.com
        </div>
      </div>

      {feedback.text && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${feedback.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: feedback.type === 'success' ? '#4ade80' : '#f87171',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          {feedback.type === 'success' ? '✓ ' : 'Warning: '}{feedback.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Form Controls */}
        <div style={{ background: 'var(--card-bg, #2a2521)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffb900', marginTop: 0, marginBottom: '16px' }}>
            1. Compose Email
          </h3>

          <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Link Active Shipment (Auto-Fills Customer Info)
              </label>
              <select
                value={selectedShipmentId}
                onChange={(e) => handleSelectShipment(e.target.value)}
                style={inputStyle}
              >
                <option value="" style={{ background: '#1b1613', color: '#ffffff' }}>-- None (Manual Recipient) --</option>
                {shipments.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#1b1613', color: '#ffffff' }}>
                    {s.id} - {s.customerName || 'No Name'} ({s.customerEmail || 'No Email'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Recipient Email *
                </label>
                <input
                  type="email"
                  placeholder="customer@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Preset Email Template
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'SHIPMENT_UPDATE', label: 'Status Update' },
                  { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
                  { id: 'DELAY_NOTICE', label: 'Delay Notice' },
                  { id: 'CUSTOM_NOTICE', label: 'Custom Notice' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t.id)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '600',
                      border: templateType === t.id ? '1px solid #ffb900' : '1px solid var(--border-color)',
                      background: templateType === t.id ? 'rgba(255, 185, 0, 0.15)' : '#1b1613',
                      color: templateType === t.id ? '#ffb900' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Subject Line *
              </label>
              <input
                type="text"
                placeholder="Email Subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Message Content *
              </label>
              <textarea
                rows={5}
                placeholder="Write your email body message here..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                required
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              style={{
                marginTop: '10px',
                padding: '12px 20px',
                borderRadius: '8px',
                background: sending ? '#64748b' : 'linear-gradient(135deg, #ffb900 0%, #d89600 100%)',
                color: '#351C15',
                border: 'none',
                fontWeight: '800',
                fontSize: '0.95rem',
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {sending ? (
                <>Sending Email via Resend...</>
              ) : (
                <>Dispatch Email Now &rarr;</>
              )}
            </button>

          </form>
        </div>

        {/* Right Column: Live Preview (Dukascopy Bank Style) */}
        <div style={{ background: 'var(--card-bg, #2a2521)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffb900', marginTop: 0, marginBottom: '16px' }}>
            2. Live Email Preview
          </h3>

          <div style={{ background: '#eef2f5', color: '#2d3748', borderRadius: '8px', padding: '20px', fontFamily: 'Arial, Helvetica, sans-serif', border: '1px solid #cbd5e1' }}>
            
            {/* Top Logo */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <span style={{ fontSize: '24px', fontWeight: '900', color: '#351C15', letterSpacing: '1px' }}>UPS</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#d89600', marginLeft: '6px', textTransform: 'uppercase' }}>LOGISTICS</span>
            </div>

            {/* Main White Card 1 */}
            <div style={{ background: '#ffffff', borderRadius: '4px', padding: '20px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#2d3748', margin: '0 0 14px 0' }}>
                Dear {recipientName || 'Sir/Madam'},
              </p>

              <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#4a5568', whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                {messageBody || 'Your message content will render here...'}
              </div>

              {selectedShipment && (
                <div style={{ background: '#f7fafc', border: '1px solid #edf2f7', borderRadius: '2px', padding: '12px', marginBottom: '16px', fontSize: '12px' }}>
                  <div style={{ marginBottom: '4px' }}><strong>Tracking ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#351C15' }}>{selectedShipment.id}</span></div>
                  <div style={{ marginBottom: '4px' }}><strong>Status:</strong> {selectedShipment.status}</div>
                  <div><strong>Route:</strong> {selectedShipment.origin || 'N/A'} to {selectedShipment.destination || 'N/A'}</div>
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <span style={{ color: '#351C15', fontWeight: 'bold', fontSize: '13px', textDecoration: 'underline' }}>
                  Track Package Online &rarr;
                </span>
              </div>
            </div>

            {/* Footer White Card 2 */}
            <div style={{ background: '#ffffff', borderRadius: '4px', padding: '16px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#4a5568' }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#2d3748' }}>UPS Global Logistics Services</p>
              <p style={{ margin: '0 0 4px 0' }}>Website: ups-global-shipping.com</p>
              <p style={{ margin: '0', color: '#718096' }}>Email: support@ups-global-shipping.com</p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};


export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ups_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('home');
  const [shipments, setShipments] = useState([]);
  const [isFlashing, setIsFlashing] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab]);

  // Transition Flash Navigator
  const triggerNavigationWithFlash = (targetHash) => {
    setIsFlashing(true);
    setTimeout(() => {
      window.location.hash = targetHash;
    }, 250);
    setTimeout(() => {
      setIsFlashing(false);
    }, 750);
  };
  const [stats, setStats] = useState(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Shipping Form States
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerEmail, setFormCustomerEmail] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('+1');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formUploadedImage, setFormUploadedImage] = useState(null);
  const [formWeight, setFormWeight] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formVessel, setFormVessel] = useState('Truck');
  const [formOrigin, setFormOrigin] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formOriginCode, setFormOriginCode] = useState('CHI');
  const [formDestCode, setFormDestCode] = useState('SEA');
  const [formEta, setFormEta] = useState('2026-07-25');
  const [formRouteConfig, setFormRouteConfig] = useState('CHI-KC-DEN-SEA');
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [formTrackingId, setFormTrackingId] = useState(`UPS-${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [formShipmentType, setFormShipmentType] = useState('Standard');
  const [formInitialStatus, setFormInitialStatus] = useState('Manifest Prepared');
  const [formInternalNotes, setFormInternalNotes] = useState('');
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [showCustomerTrackPrompt, setShowCustomerTrackPrompt] = useState(false);
  const [customerTrackInput, setCustomerTrackInput] = useState('');
  const [trackPromptError, setTrackPromptError] = useState('');

  // Visitor Quick Tracking Modal States
  const [showVisitorTrackModal, setShowVisitorTrackModal] = useState(false);
  const [visitorTrackInput, setVisitorTrackInput] = useState('');
  const [visitorTrackError, setVisitorTrackError] = useState('');
  const [visitorTrackResult, setVisitorTrackResult] = useState(null);
  const [visitorTrackLoading, setVisitorTrackLoading] = useState(false);

  // Tracking Search
  const [searchTrackId, setSearchTrackId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Live simulator controls (for active admin telemetry toggles)
  const [simActiveShipmentId, setSimActiveShipmentId] = useState('');
  const [simSpeed, setSimSpeed] = useState(2);
  const [isSimRunning, setIsSimRunning] = useState(false);

  const shipmentsRef = useRef(shipments);
  useEffect(() => {
    shipmentsRef.current = shipments;
  }, [shipments]);

  const simActiveShipmentIdRef = useRef(simActiveShipmentId);
  useEffect(() => {
    simActiveShipmentIdRef.current = simActiveShipmentId;
  }, [simActiveShipmentId]);

  const simSpeedRef = useRef(simSpeed);
  useEffect(() => {
    simSpeedRef.current = simSpeed;
  }, [simSpeed]);

  const simIntervalRef = useRef(null);

  // Sync hash routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash || '#home';
      window.scrollTo(0, 0);
      if (hash.startsWith('#details?id=')) {
        const id = hash.split('=')[1];
        setSelectedShipmentId(id);
        setActiveTab('details');
      } else {
        setActiveTab(hash.replace('#', ''));
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash(); // initial trigger

    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Fetch initial core shipments / data
  const fetchShipments = async () => {
    if (!user) return;
    try {
      const emailQuery = user.role === 'admin' ? '' : `?email=${user.email}`;
      const res = await fetch(`${API_BASE}/shipments${emailQuery}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setShipments(data);
      } else {
        setShipments([]);
      }
      
      // Auto-set simulator target if empty
      if (Array.isArray(data) && data.length > 0 && !simActiveShipmentId) {
        setSimActiveShipmentId(data[0].id);
      }
    } catch (e) {
      console.error('Fetch shipments failed:', e);
      setShipments([]);
    }
  };

  const fetchStats = async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Fetch stats failed:', e);
    }
  };

  useEffect(() => {
    fetchShipments();
    fetchStats();
  }, [user]);

  // WebSocket Telemetry Connection Link
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;

    const connectWS = () => {
      ws = new WebSocket(WS_BASE);

      ws.onopen = () => {
        console.log('Connected to real-time telemetry Socket channel.');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'SHIPMENT_UPDATE') {
            const updated = msg.payload;
            
            // Sync live lists
            setShipments(prev => prev.map(s => s.id === updated.id ? updated : s));
            
            // If viewing this shipment map, update state
            if (selectedShipmentId && selectedShipmentId.toUpperCase() === updated.id.toUpperCase()) {
              setSelectedShipmentId(updated.id);
            }
          } else if (msg.type === 'SHIPMENT_DELETED') {
            const { id } = msg.payload;
            setShipments(prev => prev.filter(s => s.id !== id));
            if (selectedShipmentId && selectedShipmentId.toUpperCase() === id.toUpperCase()) {
              setSelectedShipmentId(null);
              if (window.location.hash.startsWith('#details?id=')) {
                window.location.hash = user && user.role === 'admin' ? '#admin' : '#dashboard';
              }
            }
          }
        } catch (error) {
          console.warn('Socket message parse error:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected. Attempting reconnect...');
        reconnectTimeout = setTimeout(connectWS, 3000);
      };
    };

    connectWS();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [selectedShipmentId]);

  // 1. User login trigger
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail) return;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Login authorization fail.');
      } else {
        localStorage.setItem('ups_user', JSON.stringify(data));
        setUser(data);
        window.location.hash = data.role === 'admin' ? '#admin' : '#dashboard';
      }
    } catch (err) {
      setLoginError('Could not link to backend server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ups_user');
    setUser(null);
    window.location.hash = '#home';
  };

  // 2. Direct Role switch bypass (for testing/proto verification)
  const handleRoleBypass = async (role) => {
    localStorage.removeItem('ups_user');
    setUser(null);
    
    if (role === 'visitor') {
      window.location.hash = '#home';
      return;
    }

    const testEmail = role === 'admin' ? 'admin@ups.com' : 'customer@ups.com';
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('ups_user', JSON.stringify(data));
        setUser(data);
        window.location.hash = role === 'admin' ? '#admin' : '#dashboard';
      }
    } catch (e) {
      alert('Bypass connection error. Is backend server running on port 5000?');
    }
  };

  // 3. Admin shipping appointment creation
  const handleCreateShipment = async (e) => {
    e.preventDefault();
    setFormMsg({ type: '', text: '' });

    if (!formCustomerEmail || !formCustomerName || !formOrigin || !formDestination) {
      setFormMsg({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }

    const waypointsArray = formRouteConfig.split('-');

    const shipmentPayload = {
      id: formTrackingId,
      customerName: formCustomerName,
      customerEmail: formCustomerEmail,
      customerPhone: formCustomerPhone ? `${formCountryCode} ${formCustomerPhone}`.trim() : '+1 555 0100',
      address: formAddress || 'Warehouse facility D',
      weight: parseFloat(formWeight) || 500,
      desc: formDesc || 'Commercial freight cargo items',
      vessel: formVessel,
      origin: formOrigin,
      destination: formDestination,
      originCode: formOriginCode,
      destCode: formDestCode,
      eta: formEta,
      waypoints: waypointsArray
    };

    try {
      const res = await fetch(`${API_BASE}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shipmentPayload)
      });
      const data = await res.json();

      if (res.ok) {
        setFormMsg({ type: 'success', text: `Appointment made! Code: ${data.id}` });
        if (data.credentials) {
          setCredentialsModal(data.credentials);
        }
        // Clear input form
        setFormCustomerName('');
        setFormCustomerEmail('');
        setFormCountryCode('+1');
        setFormCustomerPhone('');
        setFormAddress('');
        setFormUploadedImage(null);
        setFormWeight('');
        setFormDesc('');
        setFormTrackingId(`UPS-${Math.floor(10000000 + Math.random() * 90000000)}`);
        setFormInternalNotes('');
        fetchShipments();
        fetchStats();
      } else {
        setFormMsg({ type: 'error', text: data.error || 'Server rejected creation.' });
      }
    } catch (err) {
      setFormMsg({ type: 'error', text: 'Network connection write failure.' });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      setFormUploadedImage({
        name: file.name,
        size: `${sizeInMB} MB`,
        base64: reader.result
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateSimShipmentVessel = async (newVessel) => {
    if (!simActiveShipmentId) return;
    const shipment = shipments.find(s => s.id === simActiveShipmentId);
    if (!shipment) return;
    try {
      const res = await fetch(`${API_BASE}/shipments/${simActiveShipmentId}/simulation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vessel: newVessel,
          status: shipment.status,
          currentLocationName: shipment.currentLocationName,
          simulation: {
            active: simIntervalRef.current !== null,
            currentProgress: shipment.simulation.currentProgress,
            logs: shipment.simulation.logs
          }
        })
      });
      if (res.ok) {
        fetchShipments();
      }
    } catch (e) {
      console.warn("Vessel update error:", e);
    }
  };

  const handleUpdateSimSpeed = async (newSpeed) => {
    setSimSpeed(newSpeed);
    if (!simActiveShipmentId) return;
    try {
      const res = await fetch(`${API_BASE}/shipments/${simActiveShipmentId}/simulation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation: {
            speedMultiplier: newSpeed
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(prev => prev.map(s => s.id === data.id ? data : s));
      }
    } catch (e) {
      console.warn("Speed multiplier update failed:", e);
    }
  };

  const handleAddWaypoint = async (newWp) => {
    if (!simActiveShipmentId) return;
    const shipment = shipments.find(s => s.id === simActiveShipmentId);
    if (!shipment) return;

    let wps = [...(shipment.simulation.waypoints || [])];
    if (wps.length > 1) {
      wps.splice(wps.length - 1, 0, newWp);
    } else {
      wps.push(newWp);
    }

    try {
      const res = await fetch(`${API_BASE}/shipments/${simActiveShipmentId}/simulation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation: {
            waypoints: wps
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(prev => prev.map(s => s.id === data.id ? data : s));
      }
    } catch (e) {
      console.warn("Add waypoint failed:", e);
    }
  };

  const handleRemoveWaypoint = async (wpToRemove) => {
    if (!simActiveShipmentId) return;
    const shipment = shipments.find(s => s.id === simActiveShipmentId);
    if (!shipment) return;

    let wps = (shipment.simulation.waypoints || []).filter(wp => wp !== wpToRemove);
    if (wps.length === 0) {
      wps = [shipment.originCode || 'CHI'];
    }

    try {
      const res = await fetch(`${API_BASE}/shipments/${simActiveShipmentId}/simulation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulation: {
            waypoints: wps
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShipments(prev => prev.map(s => s.id === data.id ? data : s));
      }
    } catch (e) {
      console.warn("Remove waypoint failed:", e);
    }
  };

  // 4. Simulator Loop handlers
  const updateSimTelemetry = async (shipmentId, deltaProgress, forceLog) => {
    const shipment = shipmentsRef.current.find(s => s.id === shipmentId);
    if (!shipment) return;

    let newProgress = shipment.simulation.currentProgress + deltaProgress;
    if (newProgress > 100) newProgress = 100;
    if (newProgress < 0) newProgress = 0;

    // Compute status milestone
    let newStatus = shipment.status;
    let newLoc = shipment.currentLocationName;
    let newLog = forceLog || shipment.simulation.logs;

    if (newProgress === 0) {
      newStatus = 'Registered';
      newLoc = `Scheduled for departure at ${shipment.origin}`;
      newLog = 'Shipment details registered in terminal system database.';
    } else if (newProgress > 0 && newProgress < 30) {
      newStatus = 'Warehouse';
      newLoc = `Sorting at global distribution center ${shipment.simulation.waypoints[0] || shipment.origin}`;
      newLog = 'Passed gate check scanner; scheduled for line haul departure.';
    } else if (newProgress >= 30 && newProgress < 85) {
      newStatus = 'In Transit';
      newLoc = `En-route via ${shipment.vessel} to ${shipment.destination}`;
      if (!forceLog) {
        newLog = `Telemetry logs active. Speed multiplier: ${simSpeedRef.current}x. Vehicle coordinate shift update registered.`;
      }
    } else if (newProgress >= 85 && newProgress < 100) {
      newStatus = 'Out for Delivery';
      newLoc = `Final dispatch facility near ${shipment.simulation.waypoints[shipment.simulation.waypoints.length - 1] || shipment.destination}`;
      newLog = 'Sorted to local delivery truck. Expected to arrive today.';
    } else if (newProgress >= 100) {
      newStatus = 'Delivered';
      newLoc = `Arrived at recipient base address: ${shipment.address}`;
      newLog = 'Delivered safely. Certified signature uploaded.';
    }

    try {
      const res = await fetch(`${API_BASE}/shipments/${shipmentId}/simulation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          currentLocationName: newLoc,
          simulation: {
            active: simIntervalRef.current !== null,
            currentProgress: newProgress,
            logs: newLog
          }
        })
      });
      const data = await res.json();
      setShipments(prev => prev.map(s => s.id === data.id ? data : s));
    } catch (e) {
      console.error('Server sync telemetry failed:', e);
    }
  };

  const handleStartSim = () => {
    if (!simActiveShipmentId) return;
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);

    fetch(`${API_BASE}/shipments/${simActiveShipmentId}/simulation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        simulation: {
          active: true,
          speedMultiplier: simSpeedRef.current
        }
      })
    });

    const interval = setInterval(() => {
      updateSimTelemetry(simActiveShipmentId, simSpeedRef.current, null);
    }, 1500);

    simIntervalRef.current = interval;
    setIsSimRunning(true);
  };

  const handlePauseSim = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimRunning(false);
    
    if (simActiveShipmentId) {
      fetch(`${API_BASE}/shipments/${simActiveShipmentId}/simulation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulation: { active: false } })
      });
    }
  };

  const handleStopSim = () => {
    handlePauseSim();
    if (simActiveShipmentId) {
      updateSimTelemetry(simActiveShipmentId, -200, 'Simulator reset. Grounded in departure port.');
    }
  };

  // Sync active shipment simulation loop state
  useEffect(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimRunning(false);

    if (simActiveShipmentId) {
      const activeShip = shipmentsRef.current.find(s => s.id === simActiveShipmentId);
      if (activeShip && activeShip.simulation && activeShip.simulation.active) {
        const speed = activeShip.simulation.speedMultiplier || 2;
        setSimSpeed(speed);

        const interval = setInterval(() => {
          updateSimTelemetry(simActiveShipmentId, simSpeedRef.current, null);
        }, 1500);

        simIntervalRef.current = interval;
        setIsSimRunning(true);
      }
    }

    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
      setIsSimRunning(false);
    };
  }, [simActiveShipmentId]);

  const handleShiftSim = (direction) => {
    if (!simActiveShipmentId) return;
    const offset = direction === 'forward' ? 5 : -5;
    updateSimTelemetry(simActiveShipmentId, offset, `Manual coordinate shift of ${offset}% applied by Admin override.`);
  };

  const handleHubJump = (target) => {
    if (!simActiveShipmentId) return;
    const progress = target === 'destination' ? 100 : 0;
    const logText = target === 'destination' 
      ? 'Admin triggered automated telemetry jump: Arrived at destination.' 
      : 'Admin triggered automated telemetry jump: Returned to origin airport.';
    
    // Perform bulk shift update
    updateSimTelemetry(simActiveShipmentId, target === 'destination' ? 100 : -100, logText);
  };

  // 5. Landing page quick-track box trigger
  const handleQuickTrackSubmit = (e) => {
    e.preventDefault();
    if (!searchTrackId) return;
    const target = shipments.find(s => s.id.toUpperCase() === searchTrackId.trim().toUpperCase());
    if (target) {
      window.location.hash = `#details?id=${target.id}`;
    } else {
      alert('Tracking identity code not registered in system databases.');
    }
  };

  const handleDeleteShipment = async (shipmentId) => {
    if (!window.confirm(`Are you sure you want to permanently delete shipment #${shipmentId}? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/shipments/${shipmentId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShipments(prev => prev.filter(s => s.id !== shipmentId));
        if (selectedShipmentId === shipmentId) {
          setSelectedShipmentId(null);
        }
        if (simActiveShipmentId === shipmentId) {
          setSimActiveShipmentId(null);
        }
        fetchStats();
      } else {
        alert(data.error || 'Failed to delete shipment.');
      }
    } catch (err) {
      alert('Failed to connect to backend server for deletion.');
    }
  };

  const customerShipments = user && user.role === 'customer'
    ? shipments.filter(s => s.customerEmail && s.customerEmail.toLowerCase() === user.email.toLowerCase())
    : [];

  const displayedShipments = user && user.role === 'customer' ? customerShipments : shipments;

  const activeShipment = user && user.role === 'customer'
    ? customerShipments.find(s => s.id === selectedShipmentId)
    : shipments.find(s => s.id === selectedShipmentId);

  // Compute metric panels for customer
  const myTotalShipments = customerShipments.length;
  const myInTransit = customerShipments.filter(s => s.status === 'In Transit').length;
  const myDelivered = customerShipments.filter(s => s.status === 'Delivered').length;
  const myPending = customerShipments.filter(s => s.status === 'Registered' || s.status === 'Warehouse').length;

  return (
    <div>
      {isFlashing && <div className="screen-flash-overlay" />}
      {/* 🚀 Dynamic Header - Hidden on the Login Page */}
      {activeTab !== 'login' && (
        user ? (
          <header className="main-header select-none">
            <button 
              className="btn-mobile-menu"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle Navigation Sidebar"
            >
              <svg style={{ width: '22px', height: '22px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {mobileSidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="header-branding" onClick={() => window.location.hash = '#home'}>
              <div className="logo-ups">UPS</div>
              <span className="portal-title">Logistics</span>
            </div>

            <div className="header-search-container">
              <form className="header-search-form" onSubmit={handleQuickTrackSubmit}>
                <span className="search-icon-wrapper">
                  <svg className="search-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </span>
                <input 
                  type="text" 
                  placeholder="Track Shipment..." 
                  value={searchTrackId}
                  onChange={(e) => setSearchTrackId(e.target.value)}
                  className="header-search-input"
                />
              </form>
            </div>

            {user.role === 'admin' && (
              <div className="header-profile-widget">
                <div className="profile-info-text">
                  <span className="profile-name">
                    Administrator Profile
                  </span>
                  <span className="profile-role">
                    Fleet Manager ID: #UPS-8821
                  </span>
                </div>
                <img 
                  className="profile-avatar-circle" 
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&fit=crop&q=80"
                  alt="User Profile" 
                />
              </div>
            )}
          </header>
        ) : (
          <header className="main-header">
            <div className="header-branding" onClick={() => window.location.hash = '#home'}>
              <div className="logo-ups">UPS</div>
              <span className="portal-title">Logistics</span>
            </div>

            <nav className="header-nav">
              {/* Header navigation links emptied for a clean welcome screen */}
            </nav>

            <div className="header-ctrls-right">
              {activeTab !== 'home' && (
                <form className="header-search" onSubmit={handleQuickTrackSubmit}>
                  <input 
                    type="text" 
                    placeholder="Track ID..." 
                    value={searchTrackId}
                    onChange={(e) => setSearchTrackId(e.target.value)}
                  />
                  <svg className="header-search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </form>
              )}

              {activeTab !== 'home' && (
                <a href="#login" className="header-login-link">Login</a>
              )}
            </div>
          </header>
        )
      )}

      {/* 🚀 Main Core Layout Wrapper */}
      <div className="portal-wrapper">
        
        {/* Render Sidebar Navigation if logged in and not on Home or Login page */}
        {user && activeTab !== 'home' && activeTab !== 'login' && (
          <>
            {mobileSidebarOpen && (
              <div className="sidebar-mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
            )}
            <aside className={`main-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
            <div className="sidebar-brand-block">
              <h1 className="sidebar-brand-name">Global Logistics</h1>
              <span className="sidebar-brand-sub">Enterprise Portal</span>
            </div>

            <nav className="sidebar-nav-links">
              {user.role === 'customer' ? (
                <>
                  <a href="#dashboard" className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`}>
                    <Activity className="nav-icon" /> Dashboard
                  </a>
                  <a 
                    href="#tracking" 
                    onClick={(e) => {
                      e.preventDefault();
                      setCustomerTrackInput('');
                      setTrackPromptError('');
                      setShowCustomerTrackPrompt(true);
                    }}
                    className={`sidebar-link ${activeTab === 'details' || showCustomerTrackPrompt ? 'active' : ''}`}
                  >
                    <ClipboardList className="nav-icon" /> Tracking
                  </a>
                </>
              ) : (
                <>
                  <a href="#admin" className={`sidebar-link ${activeTab === 'admin' ? 'active' : ''}`}>
                    <Activity className="nav-icon" /> Dashboard
                  </a>
                  <a href="#appointment" className={`sidebar-link ${activeTab === 'appointment' ? 'active' : ''}`}>
                    <PlusCircle className="nav-icon" /> Shipping Appointment
                  </a>
                  <a href="#tracking" className={`sidebar-link ${activeTab === 'tracking' ? 'active' : ''}`}>
                    <ClipboardList className="nav-icon" /> Shipments
                  </a>
                  <a href="#email-center" className={`sidebar-link ${activeTab === 'email-center' ? 'active' : ''}`}>
                    <Mail className="nav-icon" /> Email Center
                  </a>
                  <div className="sidebar-action-btn-container">
                    <button 
                      onClick={() => window.location.hash = '#appointment'} 
                      className="btn-sidebar-new-shipment"
                    >
                      + New Shipment
                    </button>
                  </div>
                </>
              )}
            </nav>

            <div className="sidebar-bottom-links">
              {user.role === 'admin' && (
                <a href="#dashboard" className="sidebar-link bottom-link" onClick={(e) => { e.preventDefault(); alert("Assistance request flagged. A representative will contact you shortly."); }}>
                  <Users className="nav-icon" /> Support
                </a>
              )}
              <button onClick={handleLogout} className="sidebar-link bottom-link btn-sidebar-logout">
                <LogOut className="nav-icon" /> Logout
              </button>
            </div>
          </aside>
        </>
      )}

        {/* 🚀 Render SPA Views Routing Context */}
        <main className={`main-content ${!user ? 'full-width' : ''}`}>
          
          {/* LANDING PAGE VIEW */}
          {activeTab === 'home' && (
            <section className="landing-view">
              {/* 1. Hero Layout */}
              <div className="hero-row">
                <div className="hero-text-block">
                  <div className="hero-sticker">
                    <span className="sticker-bullet">✓</span>
                    <span>Trusted Global Logistics Partner</span>
                  </div>
                  <h1>
                    Track Your Shipment <br />
                    <span className="highlight">Anytime, Anywhere</span>
                  </h1>
                  <p>
                    Experience next-generation logistics with secure end-to-end tracking, real-time status updates, and enterprise-grade fleet management tailored for your business needs.
                  </p>
                  
                  <div className="hero-action-buttons">
                    <button className="btn-hero-primary" onClick={() => triggerNavigationWithFlash('#login')}>
                      Login to Portal
                    </button>
                    <button 
                      className="btn-hero-secondary" 
                      onClick={() => {
                        setVisitorTrackInput('');
                        setVisitorTrackError('');
                        setVisitorTrackResult(null);
                        setShowVisitorTrackModal(true);
                      }}
                    >
                      <svg className="btn-hero-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 8h7a1 1 0 011 1v3H13V8z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19 12h2a1 1 0 011 1v3h-3v-4z" /></svg>
                      Track Shipment
                    </button>
                  </div>

                  <div className="hero-social-trust">
                    <div className="avatar-stack">
                      <img className="profile-avatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=80" alt="avatar" />
                      <img className="profile-avatar" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=80" alt="avatar" />
                      <img className="profile-avatar" src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&fit=crop&q=80" alt="avatar" />
                    </div>
                    <span className="trust-caption">12,000+ Businesses Trust Our Global Network</span>
                  </div>
                </div>

                <div className="hero-visual-col">
                  <div className="hero-main-img-card">
                    <img className="hero-main-img" src="/hero-bg-2.jpg" alt="Warehouse logistics hub" />
                    
                    <div className="image-text-overlay">
                      <div className="overlay-title">GLOBAL LOGISTICS</div>
                      <div className="overlay-desc">Real-time visibility for your supply chain</div>
                      <button className="btn-overlay-quote">GET A QUOTE</button>
                    </div>

                    {/* Floating Status card over image */}
                    <div className="floating-overlay-card">
                      <div className="float-header-row">
                        <span className="float-code">Shipment #230248</span>
                        <span className="float-badge">
                          <span className="float-green-dot"></span>
                          <span>ONLINE</span>
                        </span>
                      </div>
                      <div className="float-body">In Transit - London</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Solutions grid */}
              <div className="landing-solutions-section">
                <div className="sec-header-center">
                  <h2>Comprehensive Logistics Solutions</h2>
                  <p>Precision-engineered tools to streamline your supply chain, from local deliveries to international freight forwarding.</p>
                </div>

                <div className="solutions-cards-grid">
                  <div className="solution-card-mock">
                    <div className="solution-badge-icon">
                      <svg className="sol-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <h3>Shipment Tracking</h3>
                    <p>Get instantaneous updates on your package location with centimeter-level precision.</p>
                    <a href="#login">Learn More →</a>
                  </div>

                  <div className="solution-card-mock">
                    <div className="solution-badge-icon">
                      <svg className="sol-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <h3>Live Monitoring</h3>
                    <p>24/7 telemetry and environmental monitoring for sensitive or high-value cargo.</p>
                    <a href="#login">View Dashboard →</a>
                  </div>

                  <div className="solution-card-mock">
                    <div className="solution-badge-icon">
                      <svg className="sol-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h3>Fast & Secure</h3>
                    <p>Redundant security protocols and expedited handling for priority shipments.</p>
                    <a href="#login">Security Protocol →</a>
                  </div>

                  <div className="solution-card-mock">
                    <div className="solution-badge-icon">
                      <svg className="sol-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                    </div>
                    <h3>Logistics Solutions</h3>
                    <p>Custom enterprise workflows and API integrations for seamless operations.</p>
                    <a href="#login">Enterprise API →</a>
                  </div>
                </div>
              </div>

              {/* 3. Streamlined Journey Timeline */}
              <div className="journey-ticks-section">
                <div className="ticks-header-flex">
                  <div className="title-block">
                    <h2>A Streamlined Journey</h2>
                    <p>From the moment your package enters our system to the final doorstep delivery, we provide transparency at every milestone.</p>
                  </div>
                  <a href="#login" className="ticks-nav-manual">
                    <svg style={{width:'16px', height:'16px'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Detailed Process Guide
                  </a>
                </div>

                <div className="journey-sequence-row">
                  <div className="seq-node-card">
                    <div className="seq-circle-wrapper">
                      <div className="seq-circle-base">
                        <svg className="seq-icon-inner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="seq-index-badge">1</div>
                    </div>
                    <h4>Shipment Registered</h4>
                    <p>Your order is logged into our global dispatch network instantly.</p>
                  </div>

                  <div className="seq-node-card">
                    <div className="seq-circle-wrapper">
                      <div className="seq-circle-base">
                        <svg className="seq-icon-inner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L22 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="seq-index-badge">2</div>
                    </div>
                    <h4>Receive Credentials</h4>
                    <p>Secure login details are sent via encrypted notification channels.</p>
                  </div>

                  <div className="seq-node-card">
                    <div className="seq-circle-wrapper">
                      <div className="seq-circle-base">
                        <svg className="seq-icon-inner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                      </div>
                      <div className="seq-index-badge">3</div>
                    </div>
                    <h4>Secure Login</h4>
                    <p>Access your private dashboard with multi-factor authentication.</p>
                  </div>

                  <div className="seq-node-card">
                    <div className="seq-circle-wrapper">
                      <div className="seq-circle-base">
                        <svg className="seq-icon-inner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <div className="seq-index-badge">4</div>
                    </div>
                    <h4>Live Tracking</h4>
                    <p>Watch your package move across the map in high-resolution.</p>
                  </div>

                  <div className="seq-node-card">
                    <div className="seq-circle-wrapper">
                      <div className="seq-circle-base">
                        <svg className="seq-icon-inner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div className="seq-index-badge">5</div>
                    </div>
                    <h4>Delivered</h4>
                    <p>Package arrived confirmation with digital signature capture.</p>
                  </div>
                </div>
              </div>

              {/* 4. Customer Reviews & Ratings Section */}
              <div className="landing-reviews-section">
                <div className="sec-header-center" style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <div className="hero-sticker" style={{ margin: '0 auto 16px auto', display: 'inline-flex' }}>
                    <span className="sticker-bullet">★</span>
                    <span>4.9 / 5.0 Rating Across 12,000+ Shippers</span>
                  </div>
                  <h2 style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 10px 0' }}>What Our Customers Say</h2>
                  <p style={{ color: '#cbd5e1', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem' }}>
                    Read real experiences from business owners and individuals who rely on UPS Global Logistics every day.
                  </p>
                </div>

                <div className="reviews-cards-grid">
                  
                  {/* Review 1 */}
                  <div className="review-card">
                    <div className="review-card-header">
                      <img className="reviewer-avatar" src="/review-1.jpg" alt="Marcus Vance" />
                      <div className="reviewer-meta">
                        <h4 className="reviewer-name">Marcus Vance</h4>
                        <span className="reviewer-role">Verified Enterprise Shipper &bull; Chicago, IL</span>
                      </div>
                    </div>
                    <div className="review-stars-row">
                      ★★★★★ <span className="review-rating-score">5.0 / 5.0</span>
                    </div>
                    <p className="review-comment-text">
                      "UPS Global Logistics has completely transformed our supply chain. The real-time telemetry tracking and instant email dispatch alerts keep our business operating smoothly with zero delivery surprises."
                    </p>
                    <div className="review-date-badge">Verified Customer Review &bull; July 2026</div>
                  </div>

                  {/* Review 2 */}
                  <div className="review-card">
                    <div className="review-card-header">
                      <img className="reviewer-avatar" src="/review-2.jpg" alt="David Miller" />
                      <div className="reviewer-meta">
                        <h4 className="reviewer-name">David Miller</h4>
                        <span className="reviewer-role">Freight Customer &bull; Denver, CO</span>
                      </div>
                    </div>
                    <div className="review-stars-row">
                      ★★★★★ <span className="review-rating-score">5.0 / 5.0</span>
                    </div>
                    <p className="review-comment-text">
                      "Super fast delivery and crystal clear tracking! I received my tracking link and credentials via email instantly when the appointment was created. Couldn't ask for a smoother logistics service."
                    </p>
                    <div className="review-date-badge">Verified Customer Review &bull; July 2026</div>
                  </div>

                  {/* Review 3 */}
                  <div className="review-card">
                    <div className="review-card-header">
                      <img className="reviewer-avatar" src="/review-3.jpg" alt="Chloe Sterling" />
                      <div className="reviewer-meta">
                        <h4 className="reviewer-name">Chloe Sterling</h4>
                        <span className="reviewer-role">E-commerce Operations Lead &bull; Seattle, WA</span>
                      </div>
                    </div>
                    <div className="review-stars-row">
                      ★★★★★ <span className="review-rating-score">5.0 / 5.0</span>
                    </div>
                    <p className="review-comment-text">
                      "The live map tracking and automated email alerts are absolute game changers for our support team. 10/10 service, excellent customer care, and zero shipment delays!"
                    </p>
                    <div className="review-date-badge">Verified Customer Review &bull; July 2026</div>
                  </div>

                </div>
              </div>

              {/* 5. Orange CTA Banner */}
              <div className="cta-banner-wrapper">
                <div className="cta-banner-card">
                  <h2>Ready to Optimize Your Logistics?</h2>
                  <p>Join thousands of enterprises using UPS Global Logistics Portal to scale their delivery operations efficiently.</p>
                  <div className="cta-action-row">
                    <button className="btn-cta-black" onClick={() => window.location.hash = '#login'}>Create Business Account</button>
                    <button className="btn-cta-outline" onClick={() => window.location.hash = '#login'}>Contact Sales Expert</button>
                  </div>
                </div>
              </div>

              {/* 5. Fine Footer */}
              <footer className="global-footer">
                <div className="footer-columns-grid">
                  <div className="footer-info-brand">
                    <h3>Global Logistics</h3>
                    <p>Connecting businesses and communities worldwide through innovative logistics and shipping solutions since 1907.</p>
                  </div>

                  <div className="footer-col-links">
                    <h4>Services</h4>
                    <ul>
                      <li><a href="#home">E-commerce</a></li>
                      <li><a href="#home">Healthcare</a></li>
                      <li><a href="#home">Manufacturing</a></li>
                      <li><a href="#home">Custom Solutions</a></li>
                    </ul>
                  </div>

                  <div className="footer-col-links">
                    <h4>Support</h4>
                    <ul>
                      <li><a href="#home">Help Center</a></li>
                      <li><a href="#home">Tracking FAQ</a></li>
                      <li><a href="#home">Shipping Tools</a></li>
                      <li><a href="#home">Claims</a></li>
                    </ul>
                  </div>

                  <div className="footer-col-links">
                    <h4>Company</h4>
                    <ul>
                      <li><a href="#home">About Us</a></li>
                      <li><a href="#home">Sustainability</a></li>
                      <li><a href="#home">Investors</a></li>
                      <li><a href="#home">Press Room</a></li>
                    </ul>
                  </div>

                  <div className="footer-col-links">
                    <h4>Social</h4>
                    <div className="footer-social-circles">
                      <button className="social-circle-btn"><Plane style={{width:'14px', height:'14px'}} /></button>
                      <button className="social-circle-btn"><Ship style={{width:'14px', height:'14px'}} /></button>
                    </div>
                  </div>
                </div>

                <div className="footer-divider-line"></div>

                <div className="footer-bottom-row">
                  <span>© 2026 United Parcel Service of America, Inc. All rights reserved.</span>
                  <div className="footer-bottom-links">
                    <a href="#home">Privacy Notice</a>
                    <a href="#home">Service Terms</a>
                    <a href="#home">Cookie Settings</a>
                  </div>
                </div>
              </footer>
            </section>
          )}

          {/* LOGIN VIEW */}
          {activeTab === 'login' && (
            <section className="login-view-container">
              {/* Subtle watermarks behind */}
              <div className="login-watermark-bg">
                <Truck className="login-watermark-icon one" />
                <Plane className="login-watermark-icon two" />
                <Ship className="login-watermark-icon three" />
                <Package className="login-watermark-icon four" />
              </div>

              <div className="login-wrapper-outer">
                {/* Shield badge */}
                <div className="login-shield-badge">UPS</div>

                <h2 className="login-brand-title">Logistics Portal</h2>
                <p className="login-brand-tagline">Manage your global fleet and shipments</p>

                <div className="login-card-custom">
                  {loginError && <div className="error-banner" style={{marginBottom:'20px'}}>{loginError}</div>}
                  
                  <form onSubmit={handleLogin}>
                    <div className="login-form-label-row">
                      <label>Email Address</label>
                    </div>
                    <div className="login-input-wrapper">
                      <Mail className="login-input-icon-left" />
                      <input 
                        type="email" 
                        placeholder="name@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="login-form-label-row">
                      <label>Password</label>
                      <a href="#login" className="login-forgot-link" onClick={(e) => { e.preventDefault(); alert("Verification code reset links have been dispatched to registered emails."); }}>Forgot Password?</a>
                    </div>
                    <div className="login-input-wrapper">
                      <Lock className="login-input-icon-left" />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="••••••••" 
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="login-input-icon-right-btn" 
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="login-icon-size" /> : <Eye className="login-icon-size" />}
                      </button>
                    </div>

                    <div className="login-remember-row">
                      <input type="checkbox" id="rememberDevice" defaultChecked />
                      <label htmlFor="rememberDevice">Remember this device</label>
                    </div>

                    <button type="submit" className="btn-login-submit-gold">
                      Login <ArrowRight className="btn-arrow" />
                    </button>
                  </form>

                  <div className="login-divider-line"></div>

                  <div className="login-new-label">New to the enterprise portal?</div>
                  <button className="btn-login-outline-access" onClick={() => handleRoleBypass('customer')}>
                    Request Portal Access
                  </button>
                </div>

                <div className="login-page-subfooter">
                  <a href="#home" className="login-page-sublink">
                    <svg style={{width:'14px', height:'14px'}} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Support
                  </a>
                  <a href="#home" className="login-page-sublink">
                    <Shield style={{width:'14px', height:'14px'}} />
                    Privacy Policy
                  </a>
                </div>
              </div>
            </section>
          )}

          {/* CUSTOMER DASHBOARD VIEW */}
          {activeTab === 'dashboard' && user && (
            <section className="customer-dashboard">
              {/* Statistics Row */}
              <div className="dashboard-stats-row">
                <div className="stat-card-custom">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">Total Shipments</span>
                  </div>
                  <div className="stat-card-value-container">
                    <span className="stat-card-value">{user.role === 'admin' ? shipments.length : myTotalShipments}</span>
                    <span className="stat-badge-pill yellow">+12%</span>
                  </div>
                </div>
                
                <div className="stat-card-custom">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">In Transit</span>
                  </div>
                  <div className="stat-card-value-container">
                    <span className="stat-card-value">{user.role === 'admin' ? shipments.filter(s => s.status === 'In Transit').length : myInTransit}</span>
                  </div>
                  <div className="stat-card-icon-container yellow-truck">
                    <Truck style={{ width: '20px', height: '20px' }} />
                  </div>
                </div>

                <div className="stat-card-custom">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">Delivered</span>
                  </div>
                  <div className="stat-card-value-container">
                    <span className="stat-card-value">{user.role === 'admin' ? shipments.filter(s => s.status === 'Delivered').length : myDelivered}</span>
                    <span className="stat-badge-pill grey">On Time</span>
                  </div>
                </div>

                <div className="stat-card-custom">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">Pending</span>
                  </div>
                  <div className="stat-card-value-container">
                    <span className="stat-card-value">{user.role === 'admin' ? shipments.filter(s => s.status === 'Registered' || s.status === 'Warehouse').length : myPending}</span>
                  </div>
                  <div className="stat-card-icon-container">
                    <ClipboardList style={{ width: '20px', height: '20px' }} />
                  </div>
                </div>
            </div>


              {/* Footer attribution */}
              <footer className="portal-footer-note select-none">
                <p>© 2026 United Parcel Service of America, Inc. UPS, the UPS brandmark, and the color brown are trademarks of United Parcel Service of America, Inc. All rights reserved.</p>
                <div className="portal-footer-links">
                  <a href="#dashboard" onClick={(e) => { e.preventDefault(); alert("Privacy Notice details logged under enterprise guidelines."); }}>Privacy Policy</a>
                  <a href="#dashboard" onClick={(e) => { e.preventDefault(); alert("Service terms terms & conditions registered."); }}>Terms of Use</a>
                  <a href="#dashboard" onClick={(e) => { e.preventDefault(); alert("Cookie configuration settings saved."); }}>Cookie Settings</a>
                </div>
              </footer>
            </section>
          )}

          {/* TRACKING LIST VIEW */}
          {activeTab === 'tracking' && user && user.role === 'customer' && (
            <section className="tracking-list-view">
              <div className="table-search-header">
                <div>
                  <h2 className="tracking-title-custom">Shipment Tracking</h2>
                  <p className="tracking-subtitle-custom">Manage and monitor {displayedShipments.length} active global shipments across your fleet.</p>
                </div>
                <div className="tracker-header-actions">
                  <button className="btn-tracker-filter" onClick={() => alert("Filter criteria: Active / Pending / Delayed.")}>
                    <SlidersHorizontal style={{ width: '15px', height: '15px', marginRight: '6px' }} /> Filters
                  </button>
                  <button className="btn-tracker-export" onClick={() => alert("Exporting 4 cargo logs as CSV...")}>
                    <Download style={{ width: '15px', height: '15px', marginRight: '6px' }} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Metrics cards row */}
              <div className="tracking-stats-row">
                <div className="track-stat-card">
                  <span className="track-stat-label">In Transit</span>
                  <div className="track-stat-value-container">
                    <span className="track-stat-val">84</span>
                    <span className="track-stat-badge green">~12%</span>
                  </div>
                </div>

                <div className="track-stat-card">
                  <span className="track-stat-label">Delayed</span>
                  <div className="track-stat-value-container">
                    <span className="track-stat-val text-red">06</span>
                    <span className="track-stat-badge red">▲ 2%</span>
                  </div>
                </div>

                <div className="track-stat-card">
                  <span className="track-stat-label">Delivered Today</span>
                  <div className="track-stat-value-container">
                    <span className="track-stat-val">34</span>
                    <span className="track-stat-badge gray">+8</span>
                  </div>
                </div>

                <div className="track-stat-card">
                  <span className="track-stat-label">Avg. Duration</span>
                  <div className="track-stat-value-container">
                    <span className="track-stat-val">2.4d</span>
                    <span className="track-stat-badge gray">-0.2</span>
                  </div>
                </div>
              </div>

              {/* Shipment Tracking Table */}
              <div className="table-container-custom">
                <table className="portal-table-custom">
                  <thead>
                    <tr>
                      <th>TRACKING NUMBER</th>
                      <th>ORIGIN</th>
                      <th>DESTINATION</th>
                      <th>STATUS</th>
                      <th>EST. DELIVERY</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedShipments.map((shipment) => {
                      let originSub = '';
                      let destSub = '';
                      
                      if (shipment.id === 'UPS-8271-4492') {
                        originSub = 'Changi Logistics Hub';
                        destSub = 'Brandenburg Facility';
                      } else if (shipment.id === 'UPS-9302-1184') {
                        originSub = 'Terminal 4 Cargo';
                        destSub = 'Heathrow Distribution';
                      } else if (shipment.id === 'UPS-7721-0032') {
                        originSub = 'Haneda Port Services';
                        destSub = "Ontario Int'l Depot";
                      } else if (shipment.id === 'UPS-1104-9923') {
                        originSub = "Al Maktoum Int'l";
                        destSub = 'Navi Mumbai Port';
                      } else {
                        originSub = 'Regional Sorting Hub';
                        destSub = 'Delivery Depot';
                      }

                      // Map status classes
                      let statusClass = 'in-transit';
                      if (shipment.status === 'Pending') statusClass = 'pending';
                      if (shipment.status === 'Delayed') statusClass = 'delayed';
                      if (shipment.status === 'Out for Delivery') statusClass = 'out-of-delivery';

                      return (
                        <tr key={shipment.id}>
                          <td className="tracking-num-cell">
                            <div className="table-package-icon">
                              <Package style={{ width: '15px', height: '15px', color: '#7B5804' }} />
                            </div>
                            <span className="bold-num">{shipment.id}</span>
                          </td>
                          <td>
                            <div className="location-cell">
                              <span className="main-city">{shipment.origin}</span>
                              <span className="sub-hub">{originSub}</span>
                            </div>
                          </td>
                          <td>
                            <div className="location-cell">
                              <span className="main-city">{shipment.destination}</span>
                              <span className="sub-hub">{destSub}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`status-pill ${statusClass}`}>
                              <span className="pill-dot"></span>
                              {shipment.status}
                            </span>
                          </td>
                          <td>
                            <div className="delivery-cell">
                              <span className="delivery-date">
                                {shipment.id === 'UPS-8271-4492' ? 'Oct 24, 2023' : 
                                 shipment.id === 'UPS-9302-1184' ? 'Oct 26, 2023' :
                                 shipment.id === 'UPS-7721-0032' ? 'Oct 22, 2023' :
                                 shipment.id === 'UPS-1104-9923' ? 'Today' : shipment.eta}
                              </span>
                              <span className={`delivery-time-info ${shipment.status === 'Delayed' ? 'text-red' : ''}`}>
                                {shipment.id === 'UPS-8271-4492' && 'by 18:00 PM'}
                                {shipment.id === 'UPS-9302-1184' && 'Scheduled'}
                                {shipment.id === 'UPS-7721-0032' && 'Overdue'}
                                {shipment.id === 'UPS-1104-9923' && 'Expected 2h'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <button 
                              className="btn-track-action-gold"
                              onClick={() => window.location.hash = `#details?id=${shipment.id}`}
                            >
                              Track
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {displayedShipments.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                          No shipments registered under this customer account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mock Pagination Footer */}
              <div className="table-pagination-row">
                <span className="pagination-info">Showing 1 to 4 of 124 shipments</span>
                <div className="pagination-pages">
                  <button className="page-nav-btn">&lt;</button>
                  <button className="page-num-btn active">1</button>
                  <button className="page-num-btn">2</button>
                  <button className="page-num-btn">3</button>
                  <button className="page-nav-btn">&gt;</button>
                </div>
              </div>

              {/* Bottom Live Fleet View Map widget */}
              <div className="live-fleet-map-section">
                <div className="fleet-map-container-relative">
                  {displayedShipments.length > 0 ? (
                    <div style={{ height: '320px', width: '100%' }}>
                      <LeafletMap shipment={displayedShipments[0]} />
                    </div>
                  ) : (
                    <div style={{ height: '320px', backgroundColor: '#e5e7eb' }}></div>
                  )}

                  {/* View Live Map overlay glass badge */}
                  <div className="fleet-map-overlay-center">
                    <button 
                      className="btn-view-live-map" 
                      onClick={() => {
                        if (displayedShipments.length > 0) {
                          window.location.hash = `#details?id=${displayedShipments[0].id}`;
                        } else {
                          alert("No shipments are currently online.");
                        }
                      }}
                    >
                      <MapPin style={{ width: '16px', height: '16px', marginRight: '6px' }} />
                      View Live Map
                    </button>
                  </div>

                  {/* Map corner telemetry footer info */}
                  <div className="fleet-map-overlay-footer">
                    <h4>Live Fleet View</h4>
                    <p>Currently tracking 42 vehicles in North American sector.</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SHIPMENT DETAILS / DYNAMIC MAP VIEW */}
          {activeTab === 'details' && activeShipment && (() => {
            const etaDetails = (() => {
              const eta = activeShipment.eta || '';
              if (!eta) return { date: 'Pending', time: 'Scheduled' };
              const splitter = eta.includes('by') ? 'by' : eta.includes('Expected') ? 'Expected' : eta.includes('Scheduled') ? 'Scheduled' : 'Overdue';
              const parts = eta.split(splitter);
              const date = parts[0]?.trim() || 'Oct 24, 2023';
              const time = (splitter + (parts[1] || '')).trim();
              return { date, time };
            })();

            const originInfo = (() => {
              switch(activeShipment.originCode) {
                case 'SIN': return { city: 'Singapore, SG', hub: 'Changi Logistics Hub - Gate 12' };
                case 'JFK': return { city: 'New York, US', hub: 'JFK Terminal 4 Cargo' };
                case 'HND': return { city: 'Tokyo, JP', hub: 'Haneda Port Services' };
                case 'DXB': return { city: 'Dubai, AE', hub: "Al Maktoum Int'l Terminal" };
                case 'SZX': return { city: 'Shenzhen, CN', hub: 'SZX Hub - Gate 42' };
                default: return { city: activeShipment.origin || 'Origin Port', hub: 'Regional Sorting Hub' };
              }
            })();

            const destInfo = (() => {
              switch(activeShipment.destCode) {
                case 'BER': return { city: 'Berlin, DE', hub: 'Brandenburg Facility - Gate B4' };
                case 'LHR': return { city: 'London, UK', hub: 'Heathrow Distribution Hub' };
                case 'LAX': return { city: 'Los Angeles, US', hub: 'LAX Logistics Center - Dock 4' };
                case 'BOM': return { city: 'Mumbai, IN', hub: 'Navi Mumbai Port Hub' };
                default: return { city: activeShipment.destination || 'Destination Port', hub: 'Delivery Depot' };
              }
            })();

            const displayWeight = activeShipment.id === 'UPS-8271-4492' ? '1,240.50 kg' : `${(activeShipment.weight || 0).toLocaleString()} lbs`;
            const transportDesc = activeShipment.vessel === 'Plane' ? 'Express Air Freight' : activeShipment.vessel === 'Ship' ? 'Ocean Cargo Freight' : 'Expedited Ground Freight';
            const packageDesc = activeShipment.id === 'UPS-8271-4492' ? '3x Euro Pallet' : activeShipment.desc || 'Standard Freight';
            const serviceLevel = activeShipment.vessel === 'Plane' ? 'Priority Global' : activeShipment.vessel === 'Ship' ? 'Standard Economy' : 'Next-Day Ground';

            // Next update countdown dynamically relative to progress
            const progress = activeShipment.simulation.currentProgress || 0;
            const nextUpdateMins = Math.max(5, Math.round(60 - (progress % 30)));
            const displayProgress = Math.round(progress);

            // Stepper checkpoints array
            const checkpoints = [
              { label: 'Registered', date: 'Oct 18, 08:30', threshold: 0, icon: <CheckCircle style={{width:'15px', height:'15px'}} /> },
              { label: 'Picked Up', date: 'Oct 19, 14:15', threshold: 15, icon: <CheckCircle style={{width:'15px', height:'15px'}} /> },
              { label: 'Warehouse', date: 'Oct 19, 22:00', threshold: 30, icon: <CheckCircle style={{width:'15px', height:'15px'}} /> },
              { label: 'In Transit', date: 'Oct 20, 04:45', threshold: 50, icon: <Plane style={{width:'15px', height:'15px'}} /> },
              { label: 'Customs', date: 'Expected Oct 22', threshold: 75, icon: <Users style={{width:'15px', height:'15px'}} /> },
              { label: 'Local Hub', date: 'Expected Oct 23', threshold: 90, icon: <Truck style={{width:'15px', height:'15px'}} /> },
              { label: 'Delivered', date: 'Expected Oct 24', threshold: 100, icon: <CheckCircle style={{width:'15px', height:'15px'}} /> },
            ];

            return (
              <section className="shipment-details-view">
                {/* BACK NAVIGATION */}
                <div className="back-nav-row">
                  <button 
                    onClick={() => {
                      window.location.hash = user && user.role === 'admin' ? '#admin' : '#dashboard';
                    }} 
                    className="btn-back-link"
                  >
                    {user && user.role === 'admin' ? '← BACK TO SHIPMENTS' : '← BACK TO DASHBOARD'}
                  </button>
                </div>

                {/* DETAILS HEADER */}
                <div className="details-header-flex">
                  <h2>Shipment Details #{activeShipment.id}</h2>
                  {user.role === 'admin' && (
                    <button className="btn-print-label" onClick={() => window.print()}>
                      <Printer style={{ width: '16px', height: '16px', marginRight: '6px' }} />
                      Print Label
                    </button>
                  )}
                </div>

                {/* METADATA MATRIX CARD */}
                <div className="details-top-card-grid">
                  <div className="details-metadata-matrix">
                    <div className="matrix-row">
                      <div className="matrix-item">
                        <span className="matrix-label">CURRENT STATUS</span>
                        <div className="matrix-val">
                          <span className={`status-pill ${activeShipment.status.toLowerCase().replace(/ /g, '-')}`}>
                            <span className="pill-dot"></span>
                            {activeShipment.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="matrix-item">
                        <span className="matrix-label">ESTIMATED DELIVERY</span>
                        <div className="matrix-val">
                          <strong className="main-val-text">{etaDetails.date}</strong>
                          <span className="sub-val-text">{etaDetails.time}</span>
                        </div>
                      </div>
                      <div className="matrix-item">
                        <span className="matrix-label">ORIGIN</span>
                        <div className="matrix-val">
                          <strong className="main-val-text">{originInfo.city}</strong>
                          <span className="sub-val-text">{originInfo.hub}</span>
                        </div>
                      </div>
                      <div className="matrix-item">
                        <span className="matrix-label">DESTINATION</span>
                        <div className="matrix-val">
                          <strong className="main-val-text">{destInfo.city}</strong>
                          <span className="sub-val-text">{destInfo.hub}</span>
                        </div>
                      </div>
                    </div>

                    <div className="matrix-separator"></div>

                    <div className="matrix-row">
                      <div className="matrix-item">
                        <span className="matrix-label">WEIGHT</span>
                        <div className="matrix-val">
                          <strong className="main-val-text">{displayWeight}</strong>
                        </div>
                      </div>
                      <div className="matrix-item">
                        <span className="matrix-label">TRANSPORT TYPE</span>
                        <div className="matrix-val transport-val">
                          {activeShipment.vessel === 'Plane' ? <Plane className="transport-icon" /> :
                           activeShipment.vessel === 'Ship' ? <Ship className="transport-icon" /> : <Truck className="transport-icon" />}
                          <span className="transport-text">{transportDesc}</span>
                        </div>
                      </div>
                      <div className="matrix-item">
                        <span className="matrix-label">PACKAGE TYPE</span>
                        <div className="matrix-val">
                          <strong className="main-val-text">{packageDesc}</strong>
                        </div>
                      </div>
                      <div className="matrix-item">
                        <span className="matrix-label">SERVICE LEVEL</span>
                        <div className="matrix-val">
                          <strong className="main-val-text">{serviceLevel}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="next-update-progress-card">
                    <span className="update-label">NEXT UPDATE IN</span>
                    <h2 className="countdown-val">{nextUpdateMins}<span>m</span></h2>
                    
                    <div className="progress-footer-block">
                      <div className="progress-label-row">
                        <span>JOURNEY PROGRESS</span>
                        <span>{displayProgress}%</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${displayProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEPPER MILESTONES CARD */}
                <div className="milestones-stepper-card">
                  <h3 className="stepper-section-title">Shipment Milestones</h3>
                  
                  <div className="stepper-horizontal-container">
                    <div className="stepper-track-line">
                      <div className="stepper-track-fill" style={{ width: `${Math.min(100, Math.max(0, (progress / 100) * 100))}%` }}></div>
                    </div>
                    
                    <div className="stepper-nodes-row">
                      {checkpoints.map((cp, idx) => {
                        const isCompleted = progress >= cp.threshold;
                        const isActive = idx === 0 
                          ? (progress < 15)
                          : idx === 6
                            ? (progress >= 100)
                            : (progress >= cp.threshold && progress < checkpoints[idx + 1].threshold);
                            
                        let statusClass = 'pending';
                        if (isCompleted) statusClass = 'completed';
                        if (isActive) statusClass = 'active';

                        return (
                          <div className={`step-node-col ${statusClass}`} key={idx}>
                            <div className="step-badge-circle">
                              {isCompleted && !isActive ? <span className="check-mark-symbol">✓</span> : cp.icon}
                            </div>
                            <span className="step-node-label">{cp.label}</span>
                            <span className="step-node-date">{cp.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* BOTTOM MAP & LIVE STATUS CONTAINER */}
                <div className="details-map-live-section">
                  <div className="details-map-side-wrapper">
                    <LeafletMap shipment={activeShipment} />
                    
                    {/* Floating Legend Overlay */}
                    <div className="map-legend-footer">
                      <div className="legend-item"><span className="legend-dot express"></span> Express</div>
                      <div className="legend-item"><span className="legend-dot ground"></span> Ground</div>
                      <div className="legend-item"><span className="legend-dot ports"></span> Ports</div>
                    </div>

                    {/* Floating Live Status Card */}
                    <div className="live-status-floating-card">
                      <div className="live-status-card-header">
                        <span className="red-pulse-indicator"></span>
                        <h4>Live Status</h4>
                      </div>

                      <div className="live-status-body">
                        <div className="live-status-item">
                          <span className="live-item-label">CURRENT LOCATION</span>
                          <span className="live-item-val">{activeShipment.currentLocationName || 'Mid-Pacific Operations Area'}</span>
                        </div>
                        <div className="live-status-item">
                          <span className="live-item-label">LAST UPDATED</span>
                          <span className="live-item-val">12 Minutes ago</span>
                        </div>
                        <div className="live-status-item">
                          <span className="live-item-label">ESTIMATED SPEED</span>
                          <span className="live-item-val">
                            {activeShipment.vessel === 'Plane' ? '854 km/h' : activeShipment.vessel === 'Ship' ? '42 km/h' : '85 km/h'}
                          </span>
                        </div>
                        <div className="live-status-item">
                          <span className="live-item-label">EST. ARRIVAL HUB</span>
                          <span className="live-item-val">Tomorrow, 06:00 AM</span>
                        </div>
                      </div>

                      {/* Expandable Logs Button */}
                      <button 
                        className="btn-toggle-tracking-logs"
                        onClick={(e) => {
                          e.preventDefault();
                          const panel = document.getElementById('floating-logs-panel');
                          if (panel) {
                            panel.classList.toggle('visible');
                          }
                        }}
                      >
                        Full Tracking Logs <span className="down-arrow-symbol">▼</span>
                      </button>

                      {/* Collapsed Logs Drawer Area */}
                      <div id="floating-logs-panel" className="floating-logs-drawer">
                        <div className="logs-feed">
                          <div className="log-entry">
                            <div className="log-point"></div>
                            <div className="log-text-block">
                              <span className="log-time">LIVE UPDATES</span>
                              <p className="log-message">{activeShipment.simulation.logs}</p>
                            </div>
                          </div>
                          <div className="log-entry">
                            <div className="log-point grey"></div>
                            <div className="log-text-block">
                              <span className="log-time">SYSTEM HISTORY</span>
                              <p className="log-message">Global route coordinates interpolated successfully. Hub sequence: {activeShipment.simulation.waypoints.join(' → ')}.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ADMIN DASHBOARD VIEW */}
          {activeTab === 'admin' && user && user.role === 'admin' && (
            <section className="admin-dashboard-view">
              <div className="admin-dashboard-header">
                <h2>Admin Dashboard</h2>
                <p className="admin-dashboard-subtitle">Overview of global operations and customer activity.</p>
              </div>

              {/* Status Metrics Cards Grid */}
              <div className="admin-stats-grid">
                <div className="admin-stat-card">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">TOTAL CUSTOMERS</span>
                    <span className="stat-badge green-trend">Active</span>
                  </div>
                  <h3 className="stat-card-number">{stats?.metrics?.customers ?? 0}</h3>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">TOTAL SHIPMENTS</span>
                    <span className="stat-badge green-trend">Registered</span>
                  </div>
                  <h3 className="stat-card-number">{stats?.metrics?.shipments ?? 0}</h3>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">IN TRANSIT</span>
                    <span className="stat-badge orange-badge">Live</span>
                  </div>
                  <h3 className="stat-card-number">{stats?.metrics?.transit ?? 0}</h3>
                </div>

                <div className="admin-stat-card">
                  <div className="stat-header-flex">
                    <span className="stat-card-label">DELIVERED</span>
                    <span className="stat-badge green-badge">Done</span>
                  </div>
                  <h3 className="stat-card-number">{stats?.metrics?.delivered ?? 0}</h3>
                </div>
              </div>

              {/* Main Panel Grid */}
              <div className="admin-panels-grid">
                
                {/* Recent Shipments Directory */}
                <div className="admin-panel-shipments">
                  <div className="panel-header-row">
                    <h3>Recent Shipments</h3>
                    <a href="#tracking" className="panel-link-btn">View All</a>
                  </div>

                  <div className="admin-table-wrapper">
                    <table className="admin-dashboard-table">
                      <thead>
                        <tr>
                          <th>SHIPMENT ID</th>
                          <th>ORIGIN / DESTINATION</th>
                          <th>STATUS</th>
                          <th>DATE</th>
                          <th>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shipments.slice(0, 4).map(s => {
                          const dateStr = s.createdAt 
                            ? new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Oct 30, 2023';
                          
                          let statusClass = 'in-transit';
                          if (s.status === 'Delivered') statusClass = 'delivered';
                          if (s.status === 'Registered' || s.status === 'Warehouse') statusClass = 'pending';
                          if (s.status === 'Delayed') statusClass = 'delayed';

                          return (
                            <tr key={s.id}>
                              <td className="shipment-id-cell" onClick={() => window.location.hash = `#details?id=${s.id}`}>
                                <Package className="table-row-pkg-icon" />
                                <span className="bold-id-text">{s.id}</span>
                              </td>
                              <td>
                                <div className="route-cell">
                                  <span className="route-cities">{s.origin} to {s.destination}</span>
                                  <span className="route-codes">{s.originCode} ➔ {s.destCode}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`status-pill ${statusClass}`}>
                                  <span className="pill-dot"></span>
                                  {s.status}
                                </span>
                              </td>
                              <td className="date-cell">{dateStr}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button 
                                    className="btn-tracker-filter" 
                                    style={{ padding: '6px 10px', height: 'auto', fontSize: '0.8rem', background: 'rgba(255, 185, 0, 0.08)', border: '1px solid rgba(255, 185, 0, 0.3)', color: '#ffb900' }}
                                    onClick={() => {
                                      setSimActiveShipmentId(s.id);
                                      window.location.hash = '#appointment';
                                    }}
                                    title="Control Live Simulation"
                                  >
                                    <Activity style={{ width: '13px', height: '13px' }} />
                                    <span style={{ marginLeft: '4px' }}>Simulate</span>
                                  </button>
                                  <button 
                                    className="btn-tracker-filter" 
                                    style={{ padding: '6px 10px', height: 'auto', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                                    onClick={() => handleDeleteShipment(s.id)}
                                    title="Permanently Delete Tracking"
                                  >
                                    <Trash style={{ width: '13px', height: '13px' }} />
                                    <span style={{ marginLeft: '4px' }}>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {shipments.length === 0 && (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                              No active database rows registered in shipments cluster.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Bottom Real-time Monitoring Map */}
              <div className="admin-monitoring-section">
                <div className="monitoring-header">
                  <div className="monitoring-title-flex">
                    <h3>Fleet Real-time Monitoring</h3>
                    <div className="live-badge-glow">
                      <span className="glow-dot"></span>
                      <span>Live Updates</span>
                    </div>
                  </div>
                </div>

                <div className="monitoring-map-wrapper">
                  {shipments.length > 0 ? (
                    <LeafletMap shipment={shipments[0]} />
                  ) : (
                    <div style={{ height: '350px', backgroundColor: 'var(--card-bg)', borderRadius: '12px' }}></div>
                  )}

                  {/* Fleet velocity overlay card */}
                  <div className="fleet-velocity-overlay-card">
                    <span className="velocity-label">FLEET VELOCITY</span>
                    <h4 className="velocity-value">94.2% Efficiency</h4>
                    
                    {/* Simulated visual bar graph */}
                    <div className="velocity-bars-visual">
                      <div className="v-bar" style={{ height: '14px' }}></div>
                      <div className="v-bar" style={{ height: '24px' }}></div>
                      <div className="v-bar" style={{ height: '18px' }}></div>
                      <div className="v-bar yellow" style={{ height: '32px' }}></div>
                      <div className="v-bar" style={{ height: '20px' }}></div>
                      <div className="v-bar" style={{ height: '28px' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* SHIPPING APPOINTMENT VIEW */}
          {activeTab === 'appointment' && user && user.role === 'admin' && (() => {
            const selectedShipmentForSim = shipments.find(s => s.id === simActiveShipmentId);
            const selectedShipmentSimProg = selectedShipmentForSim?.simulation?.currentProgress || 0;
            const selectedShipmentSimVessel = selectedShipmentForSim?.vessel || 'Truck';
            
            let selectedShipmentSimProgressCoords = { lat: 39.8283, lng: -98.5795 };
            if (selectedShipmentForSim && selectedShipmentForSim.simulation && selectedShipmentForSim.simulation.waypoints && selectedShipmentForSim.simulation.waypoints.length > 0) {
              const wps = selectedShipmentForSim.simulation.waypoints;
              const progress = selectedShipmentSimProg / 100;
              const totalSegments = wps.length - 1;
              if (totalSegments > 0) {
                const segmentProgress = progress * totalSegments;
                const index = Math.min(Math.floor(segmentProgress), totalSegments - 1);
                const frac = segmentProgress - index;
                const startHubName = wps[index];
                const endHubName = wps[index + 1];
                const startCoords = GPS_COORDINATES[startHubName] || [34.05, -118.24];
                const endCoords = GPS_COORDINATES[endHubName] || [40.71, -74.00];
                selectedShipmentSimProgressCoords = {
                  lat: startCoords[0] + (endCoords[0] - startCoords[0]) * frac,
                  lng: startCoords[1] + (endCoords[1] - startCoords[1]) * frac
                };
              } else if (wps.length === 1) {
                const singleCoords = GPS_COORDINATES[wps[0]] || [39.8283, -98.5795];
                selectedShipmentSimProgressCoords = { lat: singleCoords[0], lng: singleCoords[1] };
              }
            }
            
            let selectedShipmentSimEtaString = '0h 0m';
            if (selectedShipmentForSim) {
              const remainingFraction = (100 - selectedShipmentSimProg) / 100;
              const totalMinutesSim = selectedShipmentSimVessel === 'Plane' ? 180 : selectedShipmentSimVessel === 'Ship' ? 1440 : 480;
              const remainingMinutes = Math.max(0, Math.round(totalMinutesSim * remainingFraction));
              const hours = Math.floor(remainingMinutes / 60);
              const mins = remainingMinutes % 60;
              selectedShipmentSimEtaString = `${hours}h ${mins}m`;
            }
            
            return (
              <section className="shipping-appointment-view">
                <div className="appointment-page-container">
                  {/* Page Header Area */}
                  <div className="appointment-header-section">
                    <div className="appointment-breadcrumb">
                      <span>Shipments</span>
                      <svg className="breadcrumb-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      <span className="active">New Registration</span>
                    </div>

                    <div className="appointment-title-row">
                      <div className="title-left">
                        <h2>Register Customer Shipment</h2>
                        <p className="appointment-subtitle">Populate details to generate tracking and logistical scheduling.</p>
                      </div>
                      <div className="title-actions">
                        <button type="button" className="btn-discard-draft" onClick={() => {
                          if (window.confirm("Are you sure you want to discard this draft?")) {
                            setFormCustomerName('');
                            setFormCustomerEmail('');
                            setFormCustomerPhone('');
                            setFormAddress('');
                            setFormWeight('');
                            setFormDesc('');
                            setFormVessel('Truck');
                            setFormOrigin('Los Angeles (LAX)');
                            setFormOriginCode('LA');
                            setFormDestination('New York (JFK)');
                            setFormDestCode('NY');
                            setFormRouteConfig('LA-KC-CHI-NY');
                          }
                        }}>Discard Draft</button>
                        
                        <button type="button" className="btn-submit-registration" onClick={handleCreateShipment}>Submit Registration</button>
                      </div>
                    </div>
                  </div>

                  {formMsg.text && (
                    <div className={formMsg.type === 'success' ? 'success-banner mb-20' : 'error-banner mb-20'}>
                      {formMsg.text}
                    </div>
                  )}

                  {/* Main Grid split layout */}
                  <div className="appointment-form-grid">
                    {/* Left Column: Customer Info & Shipment Details */}
                    <div className="appointment-form-left-col">
                      {/* Customer Information Card */}
                      <div className="appointment-card">
                        <div className="card-header">
                          <Users className="card-header-icon" />
                          <h3>Customer Information</h3>
                        </div>
                        
                        <div className="card-body">
                          <div className="form-double-row">
                            <div className="input-field">
                              <label>FULL NAME</label>
                              <input 
                                type="text" 
                                placeholder=""
                                value={formCustomerName}
                                onChange={(e) => setFormCustomerName(e.target.value)}
                              />
                            </div>
                            <div className="input-field">
                              <label>EMAIL ADDRESS</label>
                              <input 
                                type="email" 
                                placeholder=""
                                value={formCustomerEmail}
                                onChange={(e) => setFormCustomerEmail(e.target.value)}
                              />
                            </div>
                          </div>
                          
                          <div className="form-double-row mt-15">
                            <div className="input-field">
                              <label>PHONE NUMBER</label>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <input 
                                  type="text" 
                                  placeholder="+1"
                                  value={formCountryCode}
                                  onChange={(e) => setFormCountryCode(e.target.value)}
                                  style={{ width: '70px', textAlign: 'center' }}
                                />
                                <input 
                                  type="tel" 
                                  placeholder=""
                                  value={formCustomerPhone}
                                  onChange={(e) => setFormCustomerPhone(e.target.value)}
                                  style={{ flex: 1 }}
                                />
                              </div>
                            </div>
                            <div className="input-field">
                              <label>FULL ADDRESS</label>
                              <input 
                                type="text" 
                                placeholder=""
                                value={formAddress}
                                onChange={(e) => setFormAddress(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Shipment Details Card */}
                      <div className="appointment-card mt-24">
                        <div className="card-header">
                          <Package className="card-header-icon" />
                          <h3>Shipment Details</h3>
                        </div>
                        
                        <div className="card-body">
                          <div className="form-triple-row">
                            <div className="input-field">
                              <label>TRACKING NUMBER</label>
                              <div className="tracking-number-badge-input">
                                <span className="tracking-number-code">{formTrackingId}</span>
                                <button type="button" className="btn-copy-tracking" onClick={() => {
                                  navigator.clipboard.writeText(formTrackingId);
                                  alert("Copied tracking ID to clipboard!");
                                }}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '14px', height: '14px'}}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                </button>
                              </div>
                            </div>
                            
                            <div className="input-field">
                              <label>SHIPMENT TYPE</label>
                              <select className="custom-select" value={formShipmentType} onChange={(e) => setFormShipmentType(e.target.value)}>
                                <option value="Standard">Standard Freight</option>
                                <option value="Express">Express Deliveries</option>
                                <option value="Priority">Priority Air Cargo</option>
                              </select>
                            </div>
                            
                            <div className="input-field">
                              <label>TRANSPORT TYPE</label>
                              <div className="transport-type-btn-group">
                                <button 
                                  type="button" 
                                  className={`transport-btn ${formVessel === 'Truck' ? 'active' : ''}`}
                                  onClick={() => setFormVessel('Truck')}
                                >
                                  <Truck style={{width: '18px', height: '18px'}} />
                                </button>
                                <button 
                                  type="button" 
                                  className={`transport-btn ${formVessel === 'Plane' ? 'active' : ''}`}
                                  onClick={() => setFormVessel('Plane')}
                                >
                                  <Plane style={{width: '18px', height: '18px'}} />
                                </button>
                                <button 
                                  type="button" 
                                  className={`transport-btn ${formVessel === 'Ship' ? 'active' : ''}`}
                                  onClick={() => setFormVessel('Ship')}
                                >
                                  <Ship style={{width: '18px', height: '18px'}} />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="form-double-row mt-15">
                            <div className="input-field">
                              <label>ORIGIN HUB</label>
                              <div className="origin-hub-flex-input">
                                <select className="hub-code-select" value={formOriginCode} onChange={(e) => setFormOriginCode(e.target.value)}>
                                  {Object.keys(GPS_COORDINATES).map(code => (
                                    <option key={code} value={code}>{code}</option>
                                  ))}
                                </select>
                                <input 
                                  type="text" 
                                  placeholder="Los Angeles, CA - LAX04"
                                  value={formOrigin}
                                  onChange={(e) => setFormOrigin(e.target.value)}
                                />
                              </div>
                            </div>
                            
                            <div className="input-field">
                              <label>DESTINATION HUB</label>
                              <div className="dest-hub-flex-input">
                                <select className="hub-code-select" value={formDestCode} onChange={(e) => setFormDestCode(e.target.value)}>
                                  {Object.keys(GPS_COORDINATES).map(code => (
                                    <option key={code} value={code}>{code}</option>
                                  ))}
                                </select>
                                <input 
                                  type="text" 
                                  placeholder="New York City, NY - JFK01"
                                  value={formDestination}
                                  onChange={(e) => setFormDestination(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="form-triple-row mt-15">
                            <div className="input-field">
                              <label>WEIGHT (KG)</label>
                              <input 
                                type="number" 
                                placeholder="0.00"
                                value={formWeight}
                                onChange={(e) => setFormWeight(e.target.value)}
                              />
                            </div>
                            
                            <div className="input-field">
                              <label>EST. DELIVERY</label>
                              <input 
                                type="date" 
                                value={formEta}
                                onChange={(e) => setFormEta(e.target.value)}
                              />
                            </div>

                            <div className="input-field">
                              <label>INITIAL STATUS</label>
                              <select className="custom-select" value={formInitialStatus} onChange={(e) => setFormInitialStatus(e.target.value)}>
                                <option value="Manifest Prepared">Manifest Prepared</option>
                                <option value="In Transit">In Transit</option>
                                <option value="Warehouse">Warehouse arrival</option>
                                <option value="Out for Delivery">Out for Delivery</option>
                              </select>
                            </div>
                          </div>

                          <div className="input-field mt-15">
                            <label>CONTENT DESCRIPTION</label>
                            <textarea 
                              rows="3" 
                              placeholder="Describe the items being shipped for insurance and customs..."
                              value={formDesc}
                              onChange={(e) => setFormDesc(e.target.value)}
                            />
                          </div>
                          
                          <div className="input-field mt-15">
                            <label>SIMULATION SEQUENCE (ROUTE HASH)</label>
                            <input 
                              type="text" 
                              placeholder="e.g. LA-KC-CHI-NY"
                              value={formRouteConfig}
                              onChange={(e) => setFormRouteConfig(e.target.value)}
                            />
                            <small style={{display: 'block', color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.78rem'}}>Waypoints separated by dash (available: CHI, KC, DEN, SEA, NY, CLE, LA, MIA, ATL, PHX, SF)</small>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Upload Image & Internal Notes */}
                    <div className="appointment-form-right-col">
                      {/* Package Image Card */}
                      <div className="appointment-card">
                        <div className="card-header">
                          <svg className="card-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '20px', height: '20px'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          <h3>Package Image</h3>
                        </div>
                        
                        <div className="card-body">
                          <div 
                            className="upload-dropzone" 
                            onClick={() => document.getElementById('package-image-upload').click()}
                            style={{ cursor: 'pointer' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="upload-cloud-icon"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span className="dropzone-text">Click to upload or drag & drop</span>
                            <span className="dropzone-sub">PNG, JPG up to 10MB</span>
                            <input 
                              type="file" 
                              id="package-image-upload" 
                              style={{ display: 'none' }} 
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </div>
                          
                          {formUploadedImage ? (
                            <div className="uploaded-files-list">
                              <div className="file-list-item">
                                <img 
                                  className="file-preview-img-icon" 
                                  src={formUploadedImage.base64} 
                                  alt="shipment box" 
                                  style={{width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover'}} 
                                />
                                <div className="file-item-meta">
                                  <span className="file-item-name">{formUploadedImage.name}</span>
                                  <span className="file-item-size">{formUploadedImage.size} &bull; Ready</span>
                                </div>
                                <button 
                                  type="button" 
                                  className="btn-delete-file" 
                                  onClick={() => setFormUploadedImage(null)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '16px', height: '16px'}}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ textAlign: 'center', padding: '15px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                              No package photo uploaded yet.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Internal Notes Card */}
                      <div className="appointment-card mt-24">
                        <div className="card-header">
                          <svg className="card-header-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '20px', height: '20px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <h3>Internal Notes</h3>
                        </div>
                        
                        <div className="card-body">
                          <textarea 
                            rows="5" 
                            placeholder="Add administrative notes, route exceptions, or specific handling instructions..." 
                            value={formInternalNotes}
                            onChange={(e) => setFormInternalNotes(e.target.value)}
                          />
                          <div className="notes-privacy-banner">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lock-icon" style={{width: '12px', height: '12px'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            <span>These notes are only visible to UPS staff.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Panel: Live Tracking Simulation */}
                  <div className="appointment-simulation-panel mt-24">
                    <div className="sim-panel-header">
                      <div className="header-left">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pulse-icon"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        <div className="sim-panel-titles">
                          <h3>Live Tracking Simulation</h3>
                          <span className="sim-panel-subtitle">PREVIEW LOGISTICS PIPELINE BEFORE COMMIT</span>
                        </div>
                      </div>
                      <div className="header-right">
                        <div className="sim-pill-group">
                          <span className="sim-pill active">REAL-TIME</span>
                          <span className="sim-pill">SIMULATED</span>
                        </div>
                        <button type="button" className="btn-fullscreen-toggle" onClick={() => alert("Simulation Fullscreen Mode Enabled")}>FULL SCREEN</button>
                      </div>
                    </div>
                    
                    <div className="sim-panel-content-split">
                      {/* Map Column */}
                      <div className="sim-panel-map-col">
                        {selectedShipmentForSim ? (
                          <LeafletMap shipment={selectedShipmentForSim} />
                        ) : (
                          <div style={{ height: '400px', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', borderRadius: '8px' }}>
                            No active shipment selected for simulation. Select a shipment from the sidebar on the right.
                          </div>
                        )}
                        
                        {/* Floating Telemetry Screen on Map */}
                        {selectedShipmentForSim && (
                          <div className="map-sim-telemetry-badge">
                            <span className="telemetry-title">SIMULATION TELEMETRY</span>
                            
                            <div className="telemetry-row">
                              <span className="tel-lbl">Speed:</span>
                              <span className="tel-val gold">{selectedShipmentSimVessel === 'Plane' ? '820 km/h' : selectedShipmentSimVessel === 'Ship' ? '35 km/h' : '85 km/h'}</span>
                            </div>
                            <div className="telemetry-row">
                              <span className="tel-lbl">Coordinates:</span>
                              <span className="tel-val">{selectedShipmentSimProgressCoords?.lat?.toFixed(4)}&deg;N, {selectedShipmentSimProgressCoords?.lng?.toFixed(4)}&deg;W</span>
                            </div>
                            <div className="telemetry-row">
                              <span className="tel-lbl">ETA:</span>
                              <span className="tel-val">{selectedShipmentSimEtaString}</span>
                            </div>
                            
                            <div className="telemetry-progress-track">
                              <div className="telemetry-progress-fill" style={{ width: `${selectedShipmentSimProg}%` }}></div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Controller Column */}
                      <div className="sim-panel-controls-col">
                        <div className="controller-section">
                          <span className="section-label">PATH SETUP</span>
                          
                          <div className="control-group">
                            <label>SELECT SHIPMENT TO TELEMETER</label>
                            <select 
                              className="sim-shipment-select"
                              value={simActiveShipmentId} 
                              onChange={(e) => setSimActiveShipmentId(e.target.value)}
                            >
                              <option value="">-- Select Shipment --</option>
                              {shipments.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.id} ({s.customerName} - {s.vessel})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="control-group mt-10">
                            <label>ORDER HUB</label>
                            <div className="mock-control-input-read">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '14px', height: '14px', color: '#ffb900'}}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                              <span>{selectedShipmentForSim?.originCode || 'LAX-04'}</span>
                            </div>
                          </div>
                          
                          <div className="control-group mt-10">
                            <label>WAYPOINTS</label>
                            <div className="waypoints-flex-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                              {selectedShipmentForSim?.simulation?.waypoints?.map((wp, idx) => (
                                <span key={idx} className="wp-badge" style={{
                                  background: 'rgba(255, 185, 0, 0.1)',
                                  border: '1px solid var(--primary-color)',
                                  color: 'var(--primary-color)',
                                  padding: '2.5px 7px',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontWeight: '500'
                                }}>
                                  {wp}
                                  {selectedShipmentForSim?.simulation?.waypoints?.length > 1 && (
                                    <span 
                                      onClick={() => handleRemoveWaypoint(wp)} 
                                      style={{ cursor: 'pointer', fontWeight: 'bold', marginLeft: '2px', color: '#ff4d4d' }}
                                      title="Remove waypoint"
                                    >
                                      &times;
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                            <select 
                              className="sim-waypoint-select custom-select" 
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAddWaypoint(e.target.value);
                                  e.target.value = '';
                                }
                              }}
                              style={{
                                width: '100%',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '6px',
                                fontSize: '0.85rem'
                              }}
                            >
                              <option value="">-- Add Waypoint --</option>
                              {Object.keys(GPS_COORDINATES)
                                .filter(code => !selectedShipmentForSim?.simulation?.waypoints?.includes(code))
                                .map(code => (
                                  <option key={code} value={code}>{code}</option>
                                ))
                              }
                            </select>
                          </div>

                          <div className="control-group mt-10">
                            <label>DESTINATION HUB</label>
                            <div className="mock-control-input-read">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: '14px', height: '14px', color: '#ff4d4d'}}><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                              <span>{selectedShipmentForSim?.destCode || 'JFK-01'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="controller-section mt-15">
                          <span className="section-label">SIMULATION MODE</span>
                          <div className="simulation-mode-icons-row">
                            <button 
                              type="button" 
                              className={`sim-mode-btn ${selectedShipmentSimVessel === 'Truck' ? 'active' : ''}`}
                              onClick={() => handleUpdateSimShipmentVessel('Truck')}
                            >
                              <Truck style={{width: '16px', height: '16px'}} />
                              <span>Truck</span>
                            </button>
                            <button 
                              type="button" 
                              className={`sim-mode-btn ${selectedShipmentSimVessel === 'Plane' ? 'active' : ''}`}
                              onClick={() => handleUpdateSimShipmentVessel('Plane')}
                            >
                              <Plane style={{width: '16px', height: '16px'}} />
                              <span>Plane</span>
                            </button>
                            <button 
                              type="button" 
                              className={`sim-mode-btn ${selectedShipmentSimVessel === 'Ship' ? 'active' : ''}`}
                              onClick={() => handleUpdateSimShipmentVessel('Ship')}
                            >
                              <Ship style={{width: '16px', height: '16px'}} />
                              <span>Ship</span>
                            </button>
                          </div>
                        </div>

                        <div className="controller-section mt-15">
                          <div className="slider-header-flex">
                            <span className="section-label">SIMULATION SPEED</span>
                            <span className="speed-val-badge">x{simSpeed}.0</span>
                          </div>
                          <input 
                            type="range" 
                            className="sim-speed-range-slider"
                            min="1" 
                            max="10" 
                            value={simSpeed}
                            onChange={(e) => handleUpdateSimSpeed(parseInt(e.target.value))}
                          />
                        </div>

                        <div className="controller-section mt-15">
                          <span className="section-label">PLAYBACK CONTROLS</span>
                          
                          <div className="playback-grid-buttons">
                            <button 
                              type="button" 
                              className={`btn-play-ctrl start ${isSimRunning ? 'active' : ''}`}
                              onClick={handleStartSim}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '12px', height: '12px'}}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              <span>START</span>
                            </button>
                            
                            <button 
                              type="button" 
                              className={`btn-play-ctrl pause ${!isSimRunning && selectedShipmentSimProg > 0 ? 'active' : ''}`}
                              onClick={handlePauseSim}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '12px', height: '12px'}}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                              <span>PAUSE</span>
                            </button>
                            
                            <button 
                              type="button" 
                              className="btn-play-ctrl reset"
                              onClick={handleStopSim}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: '12px', height: '12px'}}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                              <span>RESET</span>
                            </button>
                            
                            <button 
                              type="button" 
                              className="btn-play-ctrl stop"
                              onClick={() => {
                                handlePauseSim();
                                handleHubJump('origin');
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '12px', height: '12px'}}><rect x="4" y="4" width="16" height="16"/></svg>
                              <span>STOP</span>
                            </button>
                          </div>

                          <div className="playback-navigation-row mt-12">
                            <button className="btn-jump-step" onClick={() => handleShiftSim('backward')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: '12px', height: '12px'}}><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
                            </button>
                            <span className="jump-txt">JUMP TO LOC</span>
                            <button className="btn-jump-step" onClick={() => handleShiftSim('forward')}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{width: '12px', height: '12px'}}><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
                            </button>
                          </div>

                          <div className="control-group mt-15">
                            <label>UPDATE STATUS OVERRIDE</label>
                            <select className="override-select" value={selectedShipmentForSim?.status || 'Manifest Prepared'} onChange={(e) => {
                              if (selectedShipmentForSim) {
                                fetch(`http://localhost:5000/api/shipments/${selectedShipmentForSim.id}/simulation`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: e.target.value })
                                })
                                .then(() => fetchShipments());
                              }
                            }}>
                              <option value="Manifest Prepared">Manual Position Update</option>
                              <option value="Warehouse">Warehouse Arrival</option>
                              <option value="In Transit">In Transit</option>
                              <option value="Out for Delivery">Out for Delivery</option>
                              <option value="Delivered">Delivered</option>
                            </select>
                          </div>
                        </div>

                        <button type="button" className="btn-save-tracking-config" onClick={() => alert("Simulation Config Saved!")}>
                          Save Tracking Config
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </section>
            );
          })()}

          {activeTab === 'email-center' && user?.role === 'admin' && (
            <EmailCenterView shipments={shipments} API_BASE={API_BASE} />
          )}

        </main>
      </div>
      {credentialsModal && (
        <div className="credentials-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="credentials-modal" style={{
            background: 'var(--card-bg, #2a2521)',
            border: '1px solid var(--primary-color, #ffb900)',
            borderRadius: '12px',
            padding: '24px',
            width: '420px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            color: 'var(--text-primary, #ffffff)',
            animation: 'fadeInCode 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                background: 'rgba(255, 185, 0, 0.1)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-key" style={{ color: '#ffb900', fontSize: '18px' }}></i>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffb900' }}>Customer Portal Created</h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #cccccc)', marginBottom: '16px', lineHeight: '1.4' }}>
              A customer portal account has been created. The customer can log in using these credentials to track their shipment and view live simulation telemetry.
            </p>

            <div style={{
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid #22c55e',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#4ade80',
              fontSize: '0.85rem',
              fontWeight: '600',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>✓ Automated confirmation email with credentials & tracking link sent to <strong>{credentialsModal.email}</strong>.</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tracking ID</label>
                <div style={{ display: 'flex', background: 'var(--bg-secondary, #1b1613)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{credentialsModal.trackingId}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsModal.trackingId);
                      alert("Tracking ID copied!");
                    }} 
                    style={{ background: 'none', border: 'none', color: '#ffb900', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Username / Email</label>
                <div style={{ display: 'flex', background: 'var(--bg-secondary, #1b1613)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace' }}>{credentialsModal.email}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsModal.email);
                      alert("Email copied!");
                    }} 
                    style={{ background: 'none', border: 'none', color: '#ffb900', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Auto-Generated Password</label>
                <div style={{ display: 'flex', background: 'var(--bg-secondary, #1b1613)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#ffb900' }}>{credentialsModal.password}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsModal.password);
                      alert("Password copied!");
                    }} 
                    style={{ background: 'none', border: 'none', color: '#ffb900', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setCredentialsModal(null)} 
                style={{
                  background: 'linear-gradient(135deg, #ffb900 0%, #d89600 100%)',
                  color: '#1b1613',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                CONFIRM & CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showCustomerTrackPrompt && (
        <div className="credentials-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <form className="credentials-modal" onSubmit={(e) => {
            e.preventDefault();
            if (!customerTrackInput.trim()) {
              setTrackPromptError('Please enter a tracking number.');
              return;
            }
            const target = customerShipments.find(s => s.id.trim().toUpperCase() === customerTrackInput.trim().toUpperCase());
            if (target) {
              setShowCustomerTrackPrompt(false);
              setSelectedShipmentId(target.id);
              window.location.hash = `#details?id=${target.id}`;
            } else {
              setTrackPromptError('Tracking ID not found in your account.');
            }
          }} style={{
            background: 'var(--card-bg, #2a2521)',
            border: '1px solid var(--primary-color, #ffb900)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            color: 'var(--text-primary, #ffffff)',
            animation: 'fadeInCode 0.25s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                background: 'rgba(255, 185, 0, 0.1)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#ffb900" strokeWidth="2.5" style={{width: '20px', height: '20px'}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffb900' }}>Track Your Shipment</h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #cccccc)', marginBottom: '20px', lineHeight: '1.4' }}>
              Please enter your 8-digit tracking ID number to view live simulation path updates, ETA checkpoints, and status notifications.
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Tracking Number</label>
              <input 
                type="text"
                value={customerTrackInput}
                onChange={(e) => {
                  setCustomerTrackInput(e.target.value);
                  setTrackPromptError('');
                }}
                placeholder="e.g. UPS-31518784"
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary, #1b1613)',
                  border: '1px solid var(--border-color, #444)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              {trackPromptError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>
                  {trackPromptError}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                type="button" 
                onClick={() => setShowCustomerTrackPrompt(false)}
                style={{
                  background: 'none',
                  color: 'var(--text-secondary, #cccccc)',
                  border: '1px solid var(--border-color, #444)',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                style={{
                  background: 'linear-gradient(135deg, #ffb900 0%, #d89600 100%)',
                  color: '#1b1613',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                TRACK SHIPMENT
              </button>
            </div>
          </form>
        </div>
      )}

      {showVisitorTrackModal && (
        <div className="credentials-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="credentials-modal" style={{
            background: 'rgba(30, 24, 21, 0.95)',
            border: '1px solid #ffb900',
            borderRadius: '12px',
            padding: '24px',
            width: '420px',
            color: '#fff',
            boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                background: '#ffb900',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1b1613'
              }}>
                <Search style={{ width: '16px', height: '16px' }} />
              </div>
              <h3 style={{ margin: 0, color: '#ffb900', fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif' }}>
                Track Your Shipment
              </h3>
            </div>

            {!visitorTrackResult ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setVisitorTrackError('');
                if (!visitorTrackInput.trim()) {
                  setVisitorTrackError('Please enter a tracking number.');
                  return;
                }
                setVisitorTrackLoading(true);
                try {
                  const res = await fetch(`${API_BASE}/shipments/${visitorTrackInput.trim().toUpperCase()}`);
                  const data = await res.json();
                  if (res.ok && data && data.id) {
                    setVisitorTrackResult(data);
                  } else {
                    setVisitorTrackError('Tracking ID not found in system databases. Please verify and try again.');
                  }
                } catch (err) {
                  setVisitorTrackError('Server is currently offline.');
                } finally {
                  setVisitorTrackLoading(false);
                }
              }}>
                <p style={{ fontSize: '0.85rem', color: '#cccccc', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                  Please enter the 8-digit tracking ID reference printed on your receipt or dispatch email.
                </p>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#ffb900', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 'bold' }}>
                    TRACKING NUMBER
                  </label>
                  <input 
                    type="text"
                    placeholder="UPS-00000000"
                    value={visitorTrackInput}
                    onChange={(e) => setVisitorTrackInput(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid #ffb900',
                      borderRadius: '6px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '0.95rem',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  {visitorTrackError && (
                    <span style={{ display: 'block', color: '#ff4d4d', fontSize: '0.75rem', marginTop: '6px' }}>
                      {visitorTrackError}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowVisitorTrackModal(false)}
                    style={{
                      background: 'none',
                      color: '#ccc',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit" 
                    disabled={visitorTrackLoading}
                    style={{
                      background: 'linear-gradient(135deg, #ffb900 0%, #d89600 100%)',
                      color: '#1b1613',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      opacity: visitorTrackLoading ? 0.7 : 1
                    }}
                  >
                    {visitorTrackLoading ? 'SEARCHING...' : 'TRACK SHIPMENT'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {/* 📄 Written Information Cargo Slip */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed rgba(255, 185, 0, 0.4)',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  lineHeight: '1.6',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed rgba(255,185,0,0.2)', paddingBottom: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffb900' }}>UPS CARGO RECEIPT</span>
                  </div>
                  <div><strong>TRACKING ID:</strong> {visitorTrackResult.id}</div>
                  <div><strong>RECIPIENT:</strong> {visitorTrackResult.customerName}</div>
                  <div><strong>DESTINATION:</strong> {visitorTrackResult.address}</div>
                  <div><strong>CARGO WEIGHT:</strong> {visitorTrackResult.weight} lbs</div>
                  <div><strong>VESSEL TYPE:</strong> {visitorTrackResult.vessel}</div>
                  <div style={{ height: '8px' }}></div>
                  <div style={{ borderTop: '1px dashed rgba(255,185,0,0.2)', paddingTop: '8px' }}>
                    <strong>STATUS:</strong> <span style={{ color: '#ffb900', fontWeight: 'bold' }}>{visitorTrackResult.status}</span>
                  </div>
                  <div><strong>LAST LOCATION:</strong> {visitorTrackResult.currentLocationName}</div>
                  <div><strong>EST. DELIVERY:</strong> {visitorTrackResult.eta || 'Pending'}</div>
                </div>

                {/* Promotional banner calling to login */}
                <div style={{
                  background: 'rgba(255, 185, 0, 0.1)',
                  borderLeft: '4px solid #ffb900',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '20px',
                  fontSize: '0.8rem',
                  color: '#fff',
                  lineHeight: '1.4'
                }}>
                  🔑 Please login into your account to keep track of thier details on live map how they are moving still it gets to tier destination
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setVisitorTrackResult(null)}
                    style={{
                      background: 'none',
                      color: '#ccc',
                      border: '1px solid #444',
                      borderRadius: '6px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    BACK
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowVisitorTrackModal(false);
                      window.location.hash = '#login';
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #ffb900 0%, #d89600 100%)',
                      color: '#1b1613',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 20px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    GO TO LOGIN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
