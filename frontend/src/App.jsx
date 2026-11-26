import { useState, useEffect, useCallback, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = "http://localhost:5000/api";
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/* ============================================================
   LANDING PAGE — Choose Login Type
   ============================================================ */
function LandingPage({ onSelect }) {
  return (
    <div className="auth-container">
      <div className="auth-brand">
        <h1>🗑️ Dustbin Finder</h1>
        <p>Locate the nearest dustbin in your area</p>
      </div>

      <div className="landing-card">
        <div className="landing-header">
          <div className="auth-icon">🏠</div>
          <h2>Welcome!</h2>
          <p className="auth-subtitle">Please choose how you want to sign in</p>
        </div>

        <div className="role-cards">
          {/* User Card */}
          <button className="role-card role-card-user" onClick={() => onSelect("user")}>
            <div className="role-icon">👤</div>
            <div className="role-info">
              <h3>User Login</h3>
              <p>Find dustbins near you & report full bins</p>
            </div>
            <span className="role-arrow">→</span>
          </button>

          {/* Admin Card */}
          <button className="role-card role-card-admin" onClick={() => onSelect("admin")}>
            <div className="role-icon">🛡️</div>
            <div className="role-info">
              <h3>Admin Login</h3>
              <p>Manage dustbins, view reports & analytics</p>
            </div>
            <span className="role-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   USER AUTH PAGE  (Login · Register · Forgot Password)
   ============================================================ */
function UserAuthPage({ setUser, setPage }) {
  const [slide, setSlide] = useState(0); // 0=login 1=register 2=forgot

  return (
    <div className="auth-container">
      <div className="auth-brand">
        <h1>🗑️ Dustbin Finder</h1>
        <p>User Portal</p>
      </div>

      <div className="slider-wrapper">
        <div className="slider-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
          <UserLoginSlide setUser={setUser} setPage={setPage} goToSlide={setSlide} />
          <RegisterSlide goToSlide={setSlide} />
          <ForgotSlide goToSlide={setSlide} />
        </div>
      </div>

      <div className="slide-nav">
        {["Login", "Register", "Reset"].map((label, i) => (
          <button key={i} className={"dot" + (slide === i ? " active" : "")} onClick={() => setSlide(i)} title={label} />
        ))}
      </div>

      <button className="back-to-landing" onClick={() => setPage("landing")}>
        ← Back to Home
      </button>
    </div>
  );
}

/* ============================================================
   ADMIN AUTH PAGE  (Admin Login only)
   ============================================================ */
function AdminAuthPage({ setUser, setPage }) {
  return (
    <div className="auth-container auth-container-admin">
      <div className="auth-brand">
        <h1>🗑️ Dustbin Finder</h1>
        <p>Admin Portal</p>
      </div>

      <div className="slider-wrapper">
        <AdminLoginSlide setUser={setUser} setPage={setPage} />
      </div>

      <button className="back-to-landing" onClick={() => setPage("landing")}>
        ← Back to Home
      </button>
    </div>
  );
}

const mapContainerStyle = { width: "100%", height: "400px", borderRadius: "12px" };
const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };

function createPinIcon(color) {
  return L.divIcon({
    className: "custom-leaflet-pin",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/* ============================================================
   LEAFLET OPENSTREETMAP FALLBACK (No API Key / Billing Required)
   ============================================================ */
function LeafletMap({ dustbins, userLocation, pinMode, onPinSelect, onUserLocationChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userMarkerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] : [INDIA_CENTER.lat, INDIA_CENTER.lng];
    const initialZoom = userLocation ? 15 : 5;

    const map = L.map(containerRef.current).setView(initialCenter, initialZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  // Handle click-to-pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    containerRef.current.style.cursor = pinMode ? "crosshair" : "";
    const handleClick = (e) => {
      if (!pinMode || !onPinSelect) return;
      onPinSelect({ lat: e.latlng.lat, lng: e.latlng.lng });
    };
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [pinMode, onPinSelect]);

  // Update user marker & pan
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 15, { animate: true });
      const marker = L.marker([userLocation.lat, userLocation.lng], {
        icon: createPinIcon("#1e88e5"),
        draggable: Boolean(onUserLocationChange),
        title: "Your Location",
      }).addTo(map);
      marker.bindPopup("<b>📍 Your Location</b>");
      if (onUserLocationChange) {
        marker.on("dragend", (e) => {
          const pos = e.target.getLatLng();
          onUserLocationChange({ lat: pos.lat, lng: pos.lng });
        });
      }
      userMarkerRef.current = marker;
    }
  }, [userLocation, onUserLocationChange]);

  // Update dustbin markers
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    dustbins.forEach((bin) => {
      if (typeof bin.latitude !== "number" || typeof bin.longitude !== "number") return;
      const isFull = bin.status === "Full";
      const marker = L.marker([bin.latitude, bin.longitude], {
        icon: createPinIcon(isFull ? "#e53935" : "#43a047"),
      }).addTo(layer);
      marker.bindPopup(
        `<div style="min-width:160px">
          <b>${bin.binId}</b><br/>
          <span>${bin.street}, ${bin.area}, ${bin.city}</span><br/>
          ${bin.landmark ? `<span>📌 ${bin.landmark}</span><br/>` : ""}
          <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;background:${isFull ? "#ffebee" : "#e8f5e9"};color:${isFull ? "#c62828" : "#2e7d32"}">
            ${isFull ? "🔴 Full" : "🟢 Available"}
          </span>
        </div>`
      );
    });
  }, [dustbins]);

  return <div ref={containerRef} style={mapContainerStyle} />;
}

/* ============================================================
   MAP COMPONENT (Powered by Leaflet / OpenStreetMap - 100% Free & Reliable)
   ============================================================ */
function DustbinMap({ dustbins = [], userLocation, locationLoading, onUserLocationChange }) {
  const [pinMode, setPinMode] = useState(false);

  const handlePinSelect = useCallback((loc) => {
    if (onUserLocationChange) {
      onUserLocationChange(loc);
    }
    setPinMode(false);
  }, [onUserLocationChange]);

  return (
    <div style={{ position: "relative" }}>
      {locationLoading && (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 1000,
          padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.95)",
          color: "#667eea", fontWeight: 600, fontSize: 13,
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
        }}>
          📡 Detecting your location…
        </div>
      )}

      {onUserLocationChange && (
        <button
          type="button"
          onClick={() => setPinMode((p) => !p)}
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 1000,
            padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
            background: pinMode ? "#667eea" : "#fff",
            color: pinMode ? "#fff" : "#333",
            fontWeight: 600, fontSize: 13,
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
          }}
          title="Click on the map to set your exact location"
        >
          {pinMode ? "🖱️ Click map to pin…" : "📌 Set My Location"}
        </button>
      )}

      <LeafletMap
        dustbins={dustbins}
        userLocation={userLocation}
        pinMode={pinMode}
        onPinSelect={handlePinSelect}
        onUserLocationChange={onUserLocationChange}
      />
    </div>
  );
}

/* ============================================================
   STAT CARD
   ============================================================ */
function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card" style={{ borderLeftColor: color }}>
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

/* ============================================================
   USER LOGIN SLIDE
   ============================================================ */
function UserLoginSlide({ setUser, setPage, goToSlide }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        setPage("dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Cannot connect to server. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="slide">
      <div className="auth-header">
        <div className="auth-icon">👤</div>
        <h2>User Login</h2>
        <p className="auth-subtitle">Sign in to find dustbins near you</p>
      </div>
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <span className="input-icon">📧</span>
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="auth-error">⚠️ {error}</div>}
        <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
          {loading ? "⏳ Signing in..." : "🔐 Sign In"}
        </button>
      </form>
      <div className="auth-links">
        <button className="link-btn" onClick={() => goToSlide(1)}>📝 Create Account</button>
        <button className="link-btn" onClick={() => goToSlide(2)}>🔑 Forgot Password?</button>
      </div>
    </div>
  );
}

/* ============================================================
   ADMIN LOGIN SLIDE
   ============================================================ */
function AdminLoginSlide({ setUser, setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        if (data.user.role !== "admin") {
          setError("Access denied. This portal is for admins only.");
          setLoading(false);
          return;
        }
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
        setPage("dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Cannot connect to server. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="slide slide-admin">
      <div className="auth-header">
        <div className="auth-icon">🛡️</div>
        <h2>Admin Login</h2>
        <p className="auth-subtitle">Restricted access — admins only</p>
      </div>
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <span className="input-icon">📧</span>
          <input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="input-group">
          <span className="input-icon">🔒</span>
          <input type="password" placeholder="Admin password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="auth-error">⚠️ {error}</div>}
        <button type="submit" className="btn btn-admin btn-full" disabled={loading}>
          {loading ? "⏳ Verifying..." : "🛡️ Admin Sign In"}
        </button>
      </form>
      <div className="admin-login-note">
        🔒 This area is restricted to authorized administrators only.
      </div>
    </div>
  );
}

/* ============================================================
   REGISTER PAGE  (2-step real email verification)
   ============================================================ */
function RegisterSlide({ goToSlide }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API + "/auth/register/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
      } else {
        setError(data.message || "Failed to send verification code");
      }
    } catch (err) {
      setError("Cannot connect to server. Please try again.");
    }
    setLoading(false);
  };

  const verifyAndRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API + "/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("🎉 Email verified & account created! Please login.");
        setStep(1); setName(""); setEmail(""); setPassword(""); setCode("");
        goToSlide(0);
      } else {
        setError(data.message || "Invalid verification code");
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="slide">
      <div className="auth-header">
        <div className="auth-icon">📝</div>
        <h2>Create Account</h2>
        <p className="auth-subtitle">
          {step === 1 ? "Join Dustbin Finder today" : "Enter the verification code sent to your email"}
        </p>
      </div>

      {step === 1 && (
        <form onSubmit={sendCode}>
          <div className="input-group">
            <span className="input-icon">👤</span>
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="input-group">
            <span className="input-icon">📧</span>
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="auth-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-success btn-full" disabled={loading}>
            {loading ? "📧 Sending Code..." : "📧 Send Verification Code"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyAndRegister}>
          <p className="text-center mb-10" style={{ color: "#666" }}>
            Code sent to <strong>{email}</strong>
          </p>
          <div className="input-group">
            <span className="input-icon">🔢</span>
            <input className="otp-input" type="text" placeholder="------" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          {error && <div className="auth-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-success btn-full" disabled={loading}>
            {loading ? "⏳ Verifying..." : "✅ Verify & Create Account"}
          </button>
          <div className="text-center">
            <button type="button" className="link-btn" onClick={() => { setError(""); setStep(1); }}>Change Details / Resend</button>
          </div>
        </form>
      )}

      <div className="auth-links">
        <button className="link-btn" onClick={() => { setStep(1); setError(""); goToSlide(0); }}>← Back to Login</button>
      </div>
    </div>
  );
}

/* ============================================================
   FORGOT PASSWORD PAGE
   ============================================================ */
function ForgotSlide({ goToSlide }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const sendCode = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch(API + "/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(2);
      } else {
        setError(data.message || "Failed to send reset code");
      }
    } catch (err) {
      setError("Cannot connect to server. Please try again.");
    }
    setSending(false);
  };

  const verifyAndReset = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(API + "/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setStep(1); setEmail(""); setCode(""); setNewPassword("");
        goToSlide(0);
      } else {
        setError(data.message || "Reset failed");
      }
    } catch (err) {
      setError("Reset failed. Please try again.");
    }
  };

  return (
    <div className="slide">
      <div className="auth-header">
        <div className="auth-icon">🔑</div>
        <h2>Reset Password</h2>
        <p className="auth-subtitle">
          {step === 1 ? "Enter your email to receive a reset code" : "Enter the code sent to your email"}
        </p>
      </div>

      {step === 1 && (
        <form onSubmit={sendCode}>
          <div className="input-group">
            <span className="input-icon">📧</span>
            <input type="email" placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {error && <div className="auth-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-warning btn-full" disabled={sending}>
            {sending ? "📧 Sending..." : "📧 Send Reset Code"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyAndReset}>
          <p className="text-center mb-10" style={{ color: "#666" }}>
            Code sent to <strong>{email}</strong>
          </p>
          <div className="input-group">
            <span className="input-icon">🔢</span>
            <input className="otp-input" type="text" placeholder="------" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="auth-error">⚠️ {error}</div>}
          <button type="submit" className="btn btn-primary btn-full">Reset Password</button>
          <div className="text-center">
            <button type="button" className="link-btn" onClick={() => { setError(""); setStep(1); }}>Resend Code</button>
          </div>
        </form>
      )}

      <div className="auth-links">
        <button className="link-btn" onClick={() => { setStep(1); setError(""); goToSlide(0); }}>← Back to Login</button>
      </div>
    </div>
  );
}

/* ============================================================
   REPORT MODAL
   ============================================================ */
function ReportModal({ dustbin, onSubmit, onClose }) {
  const [message, setMessage] = useState("Dustbin is full");
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>🚨 Report: {dustbin.binId}</h3>
        <p style={{ color: "#666", margin: "8px 0 16px" }}>
          {dustbin.street}, {dustbin.area}, {dustbin.city}
        </p>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} required />
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={() => onSubmit(dustbin._id, message)}>Submit Report</button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GEOLOCATION HELPER — Multi-strategy for accurate location
   ============================================================ */
async function detectUserLocation() {
  const results = [];

  // Helper 1: Browser GPS
  const browserGeo = (highAccuracy, timeoutMs) =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy || 1000,
          source: highAccuracy ? "Device GPS" : "Browser Network",
        }),
        () => resolve(null),
        { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge: 0 }
      );
    });

  // Helper 2: HTTPS IP Geolocation (ipapi.co)
  const ipGeo1 = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 2500,
          source: `IP Location (${data.city || data.region || "Local"})`,
        };
      }
    } catch {}
    return null;
  };

  // Helper 3: Alternative HTTPS IP Geolocation (ipwho.is)
  const ipGeo2 = async () => {
    try {
      const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(4000) });
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          accuracy: 3000,
          source: `IP Location (${data.city || "Local"})`,
        };
      }
    } catch {}
    return null;
  };

  const [gpsHigh, ip1, ip2, gpsLow] = await Promise.all([
    browserGeo(true, 5000),
    ipGeo1(),
    ipGeo2(),
    browserGeo(false, 3000),
  ]);

  if (gpsHigh) results.push(gpsHigh);
  if (ip1) results.push(ip1);
  if (ip2) results.push(ip2);
  if (gpsLow) results.push(gpsLow);

  if (results.length === 0) {
    return { error: "Could not detect location. Please use 'Set My Location' or search your area." };
  }

  // Prioritize the best accuracy
  results.sort((a, b) => a.accuracy - b.accuracy);
  const best = results[0];

  return {
    lat: best.lat,
    lng: best.lng,
    accuracy: Math.round(best.accuracy),
    source: best.source,
  };
}

/* ============================================================
   USER DASHBOARD
   ============================================================ */
function UserDashboard({ dustbins, onRefresh }) {
  const [selectedDustbin, setSelectedDustbin] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [finding, setFinding] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [searchingArea, setSearchingArea] = useState(false);

  const detectLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError("");
    setLocationNote("");
    const result = await detectUserLocation();
    if (result.error) {
      setLocationError("⚠️ " + result.error);
    } else {
      setUserLocation({ lat: result.lat, lng: result.lng });
      const accText = result.accuracy >= 1000
        ? `±${(result.accuracy / 1000).toFixed(1)} km`
        : `±${result.accuracy} m`;
      setLocationNote(`📡 ${result.source} (${accText}) — drag pin or search area to correct`);
    }
    setLocationLoading(false);
  }, []);

  // Auto-detect location on mount
  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const handleManualLocationChange = useCallback((loc) => {
    setUserLocation(loc);
    setLocationError("");
    setLocationNote(`📌 Location pinned (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`);
  }, []);

  const handleAreaSearch = async (e) => {
    e.preventDefault();
    if (!areaQuery.trim()) return;
    setSearchingArea(true);
    setLocationError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(areaQuery.trim())}`
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const loc = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
        setUserLocation(loc);
        setLocationNote(`📍 Set to: ${results[0].display_name.split(",").slice(0, 3).join(", ")}`);
      } else {
        setLocationError("⚠️ Area not found. Try a nearby city, street, or landmark.");
      }
    } catch {
      setLocationError("⚠️ Could not search area right now. Use 'Set My Location' on the map.");
    }
    setSearchingArea(false);
  };

  const handleReport = async (dustbinId, message) => {
    try {
      await fetch(API + "/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dustbinId, message }),
      });
      alert("✅ Report submitted!");
      setSelectedDustbin(null);
      onRefresh();
    } catch (err) {
      alert("Failed to submit report");
    }
  };

  const findNearest = async () => {
    setFinding(true);
    setSuggestion(null);
    let loc = userLocation;
    if (!loc) {
      const result = await detectUserLocation();
      if (result.error) {
        alert(result.error);
        setFinding(false);
        return;
      }
      loc = { lat: result.lat, lng: result.lng };
      setUserLocation(loc);
      setLocationError("");
    }
    try {
      const res = await fetch(API + "/dustbins/suggest?lat=" + loc.lat + "&lng=" + loc.lng);
      const data = await res.json();
      if (data.dustbin) setSuggestion(data);
      else alert(data.message || "No available dustbins found");
    } catch (err) {
      alert("Failed to find nearest dustbin");
    }
    setFinding(false);
  };

  const available = dustbins.filter((b) => b.status === "Available").length;
  const full = dustbins.filter((b) => b.status === "Full").length;

  const filtered = dustbins.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.binId?.toLowerCase().includes(term) ||
      b.city?.toLowerCase().includes(term) ||
      b.area?.toLowerCase().includes(term) ||
      b.street?.toLowerCase().includes(term) ||
      b.landmark?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="dashboard-content">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon="🗑️" label="Total Dustbins" value={dustbins.length} color="#667eea" />
        <StatCard icon="🟢" label="Available" value={available} color="#4caf50" />
        <StatCard icon="🔴" label="Full" value={full} color="#ef5350" />
      </div>

      {/* Map */}
      <div className="section-card">
        <div className="section-header" style={{ flexWrap: "wrap", gap: 8 }}>
          <h3>📍 Dustbin Map</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <form onSubmit={handleAreaSearch} style={{ display: "flex", gap: 6 }}>
              <input
                type="text"
                placeholder="Set area / city (if GPS is off)..."
                value={areaQuery}
                onChange={(e) => setAreaQuery(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #d0d7de", fontSize: 13, minWidth: 200 }}
              />
              <button type="submit" className="btn btn-outline btn-small" disabled={searchingArea}>
                {searchingArea ? "⏳" : "🔍 Go"}
              </button>
            </form>
            <button type="button" className="btn btn-outline btn-small" onClick={detectLocation} disabled={locationLoading}>
              {locationLoading ? "📡 Detecting..." : "🎯 Detect GPS"}
            </button>
            <button className="btn btn-success" onClick={findNearest} disabled={finding}>
              {finding ? "📡 Finding..." : "📍 Find Nearest"}
            </button>
          </div>
        </div>
        <DustbinMap dustbins={dustbins} userLocation={userLocation} locationLoading={locationLoading} onUserLocationChange={handleManualLocationChange} />
        {locationNote && !locationError && <p style={{ color: "#2e7d32", fontSize: 13, marginTop: 6 }}>{locationNote}</p>}
        {locationError && <p style={{ color: "#e53935", fontSize: 13, marginTop: 6 }}>{locationError}</p>}
        <p className="map-legend">
          <span><img src="http://maps.google.com/mapfiles/ms/icons/green-dot.png" alt="" width="16" /> Available</span>
          <span><img src="http://maps.google.com/mapfiles/ms/icons/red-dot.png" alt="" width="16" /> Full</span>
          <span><img src="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" alt="" width="16" /> Your Location (drag to adjust)</span>
        </p>
      </div>

      {/* Suggestion */}
      {suggestion && (
        <div className="suggestion-card">
          <div className="suggestion-header">
            <h3>📍 Nearest Available Dustbin</h3>
            <button className="btn btn-small btn-outline" onClick={() => setSuggestion(null)}>✕</button>
          </div>
          <div className="suggestion-body">
            <p><strong>{suggestion.dustbin.binId}</strong> — {suggestion.dustbin.street}, {suggestion.dustbin.area}, {suggestion.dustbin.city}</p>
            {suggestion.dustbin.landmark && <p>📌 {suggestion.dustbin.landmark}</p>}
            <p className="distance-text">
              📏 {suggestion.distance >= 1000 ? (suggestion.distance / 1000).toFixed(1) + " km" : suggestion.distance + " meters"} away
            </p>
            <a
              href={"https://www.google.com/maps/dir/?api=1&destination=" + suggestion.dustbin.latitude + "," + suggestion.dustbin.longitude}
              target="_blank"
              rel="noopener noreferrer"
            >
              <button className="btn btn-success">🗺️ Open in Google Maps</button>
            </a>
          </div>
        </div>
      )}

      {/* Dustbin List */}
      <div className="section-card">
        <div className="section-header">
          <h3>🗑️ All Dustbins ({dustbins.length})</h3>
          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search dustbins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {filtered.length === 0 && <p className="empty-msg">No dustbins found.</p>}
        <div className="dustbin-grid">
          {filtered.map((bin) => (
            <div className="dustbin-card" key={bin._id}>
              <div className="dustbin-card-header">
                <span className="bin-id">{bin.binId}</span>
                <span className={bin.status === "Full" ? "badge badge-full" : "badge badge-available"}>
                  {bin.status === "Full" ? "🔴 Full" : "🟢 Available"}
                </span>
              </div>
              <p className="bin-location">{bin.street}, {bin.area}, {bin.city}</p>
              {bin.landmark && <p className="bin-landmark">📌 {bin.landmark}</p>}
              <div className="dustbin-card-actions">
                {bin.status !== "Full" && (
                  <button className="btn btn-danger btn-small" onClick={() => setSelectedDustbin(bin)}>🚨 Report Full</button>
                )}
                <a
                  href={"https://www.google.com/maps/dir/?api=1&destination=" + bin.latitude + "," + bin.longitude}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="btn btn-outline btn-small">🗺️ Navigate</button>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDustbin && <ReportModal dustbin={selectedDustbin} onSubmit={handleReport} onClose={() => setSelectedDustbin(null)} />}
    </div>
  );
}

/* ============================================================
   ADMIN DASHBOARD
   ============================================================ */
function AdminDashboard({ dustbins, reports, onRefresh }) {
  const [tab, setTab] = useState("overview");
  const [binId, setBinId] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(API + "/dustbins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          binId, city, area, street, landmark,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      });
      if (res.ok) {
        alert("✅ Dustbin added!");
        setBinId(""); setCity(""); setArea(""); setStreet(""); setLandmark(""); setLatitude(""); setLongitude("");
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to add dustbin");
      }
    } catch (err) {
      alert("Failed to add dustbin");
    }
  };

  const toggleStatus = async (id, current) => {
    try {
      await fetch(API + "/dustbins/" + id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: current === "Full" ? "Available" : "Full" }),
      });
      onRefresh();
    } catch (err) { alert("Failed to update"); }
  };

  const handleDelete = async (id, binId) => {
    if (!window.confirm(`Delete dustbin "${binId}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(API + "/dustbins/" + id, { method: "DELETE" });
      if (res.ok) { alert("🗑️ Dustbin deleted."); onRefresh(); }
      else { const d = await res.json(); alert(d.message || "Failed to delete"); }
    } catch (err) { alert("Failed to delete dustbin"); }
  };

  const handleResolveReport = async (reportId) => {
    try {
      const res = await fetch(API + "/reports/" + reportId + "/resolve", { method: "PATCH" });
      if (res.ok) { onRefresh(); }
      else { const d = await res.json(); alert(d.message || "Failed to resolve"); }
    } catch (err) { alert("Failed to resolve report"); }
  };

  const autoFill = async () => {
    const result = await detectUserLocation();
    if (result.error) {
      alert(result.error);
    } else {
      setLatitude(result.lat.toFixed(6));
      setLongitude(result.lng.toFixed(6));
    }
  };

  const available = dustbins.filter((b) => b.status === "Available").length;
  const full = dustbins.filter((b) => b.status === "Full").length;
  const pending = reports.filter((r) => r.status === "Pending").length;

  return (
    <div className="dashboard-content">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon="🗑️" label="Total Dustbins" value={dustbins.length} color="#667eea" />
        <StatCard icon="🟢" label="Available" value={available} color="#4caf50" />
        <StatCard icon="🔴" label="Full" value={full} color="#ef5350" />
        <StatCard icon="📝" label="Pending Reports" value={pending} color="#ff9800" />
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {[
          { key: "overview", icon: "📊", label: "Overview" },
          { key: "add", icon: "➕", label: "Add Dustbin" },
          { key: "manage", icon: "📋", label: "Manage" },
          { key: "reports", icon: "📝", label: "Reports" },
        ].map((t) => (
          <button key={t.key} className={"admin-tab" + (tab === t.key ? " active" : "")} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="section-card">
          <h3>📍 Dustbin Map Overview</h3>
          <DustbinMap dustbins={dustbins} userLocation={null} />
        </div>
      )}

      {/* Add */}
      {tab === "add" && (
        <div className="section-card">
          <h3>➕ Add New Dustbin</h3>
          <form onSubmit={handleAdd} className="add-form">
            <div className="form-grid">
              <div className="input-group">
                <span className="input-icon">🏷️</span>
                <input placeholder="Bin ID (e.g. BIN-001)" value={binId} onChange={(e) => setBinId(e.target.value)} required />
              </div>
              <div className="input-group">
                <span className="input-icon">🏙️</span>
                <input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div className="input-group">
                <span className="input-icon">📍</span>
                <input placeholder="Area" value={area} onChange={(e) => setArea(e.target.value)} required />
              </div>
              <div className="input-group">
                <span className="input-icon">🛤️</span>
                <input placeholder="Street" value={street} onChange={(e) => setStreet(e.target.value)} required />
              </div>
              <div className="input-group">
                <span className="input-icon">📌</span>
                <input placeholder="Landmark (optional)" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
              </div>
            </div>
            <div className="coord-row">
              <div className="input-group">
                <span className="input-icon">🌐</span>
                <input placeholder="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
              </div>
              <div className="input-group">
                <span className="input-icon">🌐</span>
                <input placeholder="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
              </div>
              <button type="button" className="btn btn-outline btn-small" onClick={autoFill} title="Auto-fill from GPS">📍 GPS</button>
            </div>
            <button type="submit" className="btn btn-primary mt-10">➕ Add Dustbin</button>
          </form>
        </div>
      )}

      {/* Manage */}
      {tab === "manage" && (
        <div className="section-card">
          <h3>📋 Manage Dustbins ({dustbins.length})</h3>
          {dustbins.length === 0 && <p className="empty-msg">No dustbins added yet.</p>}
          <div className="dustbin-grid">
            {dustbins.map((bin) => (
              <div className="dustbin-card" key={bin._id}>
                <div className="dustbin-card-header">
                  <span className="bin-id">{bin.binId}</span>
                  <span className={bin.status === "Full" ? "badge badge-full" : "badge badge-available"}>
                    {bin.status === "Full" ? "🔴 Full" : "🟢 Available"}
                  </span>
                </div>
                <p className="bin-location">{bin.street}, {bin.area}, {bin.city}</p>
                <p className="bin-coords">📍 {bin.latitude}, {bin.longitude}</p>
                {bin.landmark && <p className="bin-landmark">📌 {bin.landmark}</p>}
                <div className="dustbin-card-actions">
                  <button className="btn btn-outline btn-small" onClick={() => toggleStatus(bin._id, bin.status)}>
                    Mark {bin.status === "Full" ? "Available" : "Full"}
                  </button>
                  <button className="btn btn-danger btn-small" onClick={() => handleDelete(bin._id, bin.binId)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports */}
      {tab === "reports" && (
        <div className="section-card">
          <h3>📝 Reports ({reports.length})</h3>
          {reports.length === 0 && <p className="empty-msg">No reports yet.</p>}
          <div className="reports-list">
            {reports.map((r) => (
              <div className="report-card" key={r._id}>
                <div className="report-header">
                  <span className="bin-id">{r.dustbinId?.binId || "N/A"}</span>
                  <span className={r.status === "Pending" ? "badge badge-pending" : "badge badge-resolved"}>
                    {r.status === "Pending" ? "⏳ Pending" : "✅ Resolved"}
                  </span>
                </div>
                <p className="report-message">💬 {r.message}</p>
                {r.dustbinId && (
                  <p className="bin-location" style={{ fontSize: 13, color: "#888" }}>
                    📍 {r.dustbinId.street}, {r.dustbinId.area}, {r.dustbinId.city}
                  </p>
                )}
                <p className="report-date">🕐 {new Date(r.createdAt).toLocaleString()}</p>
                {r.status === "Pending" && (
                  <button
                    className="btn btn-success btn-small"
                    style={{ marginTop: 8 }}
                    onClick={() => handleResolveReport(r._id)}
                  >
                    ✅ Mark Resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
function App() {
  const [page, setPage] = useState("landing"); // landing | userAuth | adminAuth | dashboard
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("user");
  const [dustbins, setDustbins] = useState([]);
  const [reports, setReports] = useState([]);

  const loadData = useCallback(() => {
    fetch(API + "/dustbins").then((r) => r.json()).then(setDustbins).catch(() => { });
    fetch(API + "/reports").then((r) => r.json()).then(setReports).catch(() => { });
  }, []);

  // Restore saved session
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        setPage("dashboard");
        setActiveTab(u.role === "admin" ? "admin" : "user");
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
  }, []);

  useEffect(() => {
    if (page === "dashboard") loadData();
  }, [page, loadData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (page !== "dashboard") return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [page, loadData]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setPage("landing");
    setActiveTab("user");
  };

  return (
    <div className="app">
      {/* ========== LANDING PAGE ========== */}
      {page === "landing" && (
        <LandingPage onSelect={(role) => setPage(role === "admin" ? "adminAuth" : "userAuth")} />
      )}

      {/* ========== USER AUTH ========== */}
      {page === "userAuth" && (
        <UserAuthPage setUser={setUser} setPage={setPage} />
      )}

      {/* ========== ADMIN AUTH ========== */}
      {page === "adminAuth" && (
        <AdminAuthPage setUser={setUser} setPage={setPage} />
      )}

      {/* ========== DASHBOARD ========== */}
      {page === "dashboard" && user && (
        <div className="dashboard-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-brand">
              <h2>🗑️</h2>
              <span>Dustbin Finder</span>
            </div>
            <nav className="sidebar-nav">
              <button className={"nav-item" + (activeTab === "user" ? " active" : "")} onClick={() => setActiveTab("user")}>
                <span className="nav-icon">👤</span>
                <span>Dashboard</span>
              </button>
              {user.role === "admin" && (
                <button className={"nav-item" + (activeTab === "admin" ? " active" : "")} onClick={() => setActiveTab("admin")}>
                  <span className="nav-icon">🛡️</span>
                  <span>Admin Panel</span>
                </button>
              )}
            </nav>
            <div className="sidebar-footer">
              <div className="user-info">
                <div className="avatar">{user.name?.[0]?.toUpperCase() || "U"}</div>
                <div>
                  <p className="user-name">{user.name}</p>
                  <p className="user-role">{user.role === "admin" ? "🛡️ Admin" : "👤 User"}</p>
                </div>
              </div>
              <button className="btn btn-danger btn-small" onClick={logout}>🚪 Logout</button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            <header className="content-header">
              <div>
                <h2>{activeTab === "user" ? "👤 User Dashboard" : "🛡️ Admin Panel"}</h2>
                <p className="header-subtitle">Welcome back, {user.name}!</p>
              </div>
              <button className="btn btn-outline btn-small" onClick={loadData}>🔄 Refresh</button>
            </header>

            {activeTab === "user" && <UserDashboard dustbins={dustbins} onRefresh={loadData} />}
            {activeTab === "admin" && <AdminDashboard dustbins={dustbins} reports={reports} onRefresh={loadData} />}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
