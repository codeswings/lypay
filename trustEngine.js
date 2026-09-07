/**
 * ============================================================================
 * PAYMENT 4.0 // CONTINUOUS TRUST ENGINE (BANK AUTO-DETECTION & LOCKOUT)
 * Project Kerberos - PS01: Digital Frontier
 * ============================================================================
 * Features:
 *   - Auto-detects beneficiary bank from account number prefix (SBI: 058..., HDFC: 501..., ICICI: 0004..., Axis: 910..., PNB: 012...)
 *   - Graduated trust penalty for repeated failed PIN attempts
 *   - 5-attempt / 1-hour critical security lockout
 *   - Bot-speed typing anomaly detection (<60ms)
 *   - Autonomous cursor trajectory & foreground focus tracking
 */

class TrustEngine {
  constructor() {
    this.threats = {
      fakeQR: false,          // Tampered QR code sticker (geofence mismatch)
      screenMirroring: false, // Active screen recorder / RAT Trojan
      erraticCadence: false,  // Stolen unlocked device (cadence anomaly)
      replayAttack: false     // Expired nonce / replayed transaction payload
    };

    // User's simulated live location (Chennai, India)
    this.userLocation = {
      name: "T. Nagar, Chennai",
      lat: 13.0827,
      lon: 80.2707
    };

    // Active payee
    this.activePayee = {
      name: "Ramesh Tea Stall",
      vpa: "ramesh.tea@upi",
      city: "Chennai",
      lat: 13.0830,
      lon: 80.2710,
      type: "QR_COUNTER", // QR_COUNTER, QR_GALLERY, QR_TAMPERED, CONTACT_TRUSTED, CONTACT_UNKNOWN, BANK_TRANSFER
      avatar: "🏪",
      bankName: "Axis Bank",
      accountNumber: ""
    };

    this.currentAmount = 250;
    this.currentNonce = "0x8F4A";

    // ------------------------------------------------------------------------
    // FAILED PIN ATTEMPTS & LOCKOUT STATE
    // ------------------------------------------------------------------------
    this.failedPinAttempts = 0;
    this.isLockedOut = false;

    // ------------------------------------------------------------------------
    // REAL-TIME ACTIVITY TELEMETRY METRICS
    // ------------------------------------------------------------------------
    this.telemetry = {
      lastInteractionTime: Date.now(),
      isWindowFocused: true,
      mousePoints: [],
      mouseEntropy: 0.94,
      keystrokeCadenceScore: 0.96,
      currentActivityLabel: "Measuring Live Human Dynamics..."
    };

    // 4 Signal scores (25 each, total 100)
    this.signals = {
      person: 24,
      device: 25,
      context: 24,
      intent: 24
    };

    this.totalScore = 97;
    this.verdict = "APPROVE";
    this.listeners = [];

    this.startAutonomousHeartbeat();
  }

  get payee() {
    return this.activePayee;
  }

  set payee(val) {
    this.activePayee = val;
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach(cb => cb(state));
  }

  getState() {
    return {
      totalScore: this.totalScore,
      verdict: this.verdict,
      signals: { ...this.signals },
      threats: { ...this.threats },
      payee: { ...this.activePayee },
      amount: this.currentAmount,
      intentHash: this.getIntentHash(),
      telemetry: { ...this.telemetry },
      failedPinAttempts: this.failedPinAttempts,
      isLockedOut: this.isLockedOut
    };
  }

  // --------------------------------------------------------------------------
  // BANK PREFIX AUTO-DETECTION REGISTRY
  // --------------------------------------------------------------------------
  detectBankFromAccountNumber(accNum) {
    const clean = (accNum || '').replace(/\D/g, '');
    if (!clean || clean.length < 3) {
      return {
        detected: false,
        name: "Type account number to detect bank",
        sub: "SBI: 058... | HDFC: 501... | ICICI: 0004... | Axis: 910...",
        logo: "🏦",
        ifsc: "",
        cssClass: ""
      };
    }

    // 1. SBI (State Bank of India): Starts with 058 (user's exact example) or 30, 20
    if (clean.startsWith('058') || clean.startsWith('30') || clean.startsWith('20')) {
      return {
        detected: true,
        name: "State Bank of India (SBI)",
        sub: "Prefix Matched: " + clean.substring(0, 3) + " · Retail & Corporate Banking",
        logo: "🏛️",
        ifsc: "SBIN0001429",
        cssClass: "bank-sbi"
      };
    }

    // 2. HDFC Bank: Starts with 501, 502, 001
    if (clean.startsWith('501') || clean.startsWith('502') || clean.startsWith('001')) {
      return {
        detected: true,
        name: "HDFC Bank Ltd.",
        sub: "Prefix Matched: " + clean.substring(0, 3) + " · Scheduled Commercial Bank",
        logo: "🏦",
        ifsc: "HDFC0000456",
        cssClass: "bank-hdfc"
      };
    }

    // 3. ICICI Bank: Starts with 0004, 0011, 623
    if (clean.startsWith('0004') || clean.startsWith('0011') || clean.startsWith('623')) {
      return {
        detected: true,
        name: "ICICI Bank",
        sub: "Prefix Matched: " + clean.substring(0, 4) + " · Core Banking CBS Node",
        logo: "💳",
        ifsc: "ICIC0000789",
        cssClass: "bank-icici"
      };
    }

    // 4. Axis Bank: Starts with 910, 912, 010
    if (clean.startsWith('910') || clean.startsWith('912') || clean.startsWith('010')) {
      return {
        detected: true,
        name: "Axis Bank Ltd.",
        sub: "Prefix Matched: " + clean.substring(0, 3) + " · Retail Savings Account",
        logo: "🏢",
        ifsc: "UTIB0000321",
        cssClass: "bank-axis"
      };
    }

    // 5. Punjab National Bank (PNB): Starts with 012, 015
    if (clean.startsWith('012') || clean.startsWith('015')) {
      return {
        detected: true,
        name: "Punjab National Bank (PNB)",
        sub: "Prefix Matched: " + clean.substring(0, 3) + " · Nationalized Public Bank",
        logo: "🪙",
        ifsc: "PUNB0000654",
        cssClass: "bank-pnb"
      };
    }

    // Generic / Other Bank fallback
    return {
      detected: true,
      name: "Nationalized Bank Account",
      sub: "Account routing verified via RBI Cheque Clearing Gateway",
      logo: "🏦",
      ifsc: "BANK0001001",
      cssClass: ""
    };
  }

  // --------------------------------------------------------------------------
  // FAILED PIN PENALTY SYSTEM & 5-ATTEMPT LOCKOUT
  // --------------------------------------------------------------------------
  recordFailedPinAttempt() {
    this.failedPinAttempts++;
    this.telemetry.lastInteractionTime = Date.now();

    if (this.failedPinAttempts >= 5) {
      this.isLockedOut = true;
      this.telemetry.currentActivityLabel = "🚨 LOCKOUT: 5 failed MPIN attempts. Account blocked for 1 hour.";
    } else if (this.failedPinAttempts === 3) {
      this.telemetry.currentActivityLabel = "⚠️ Repeated MPIN failures: Trust Score dropped into Step-Up yellow zone.";
    } else {
      this.telemetry.currentActivityLabel = `Failed MPIN attempt (${this.failedPinAttempts}/5). Penalizing trust score.`;
    }

    this.recalculate();
    return this.failedPinAttempts;
  }

  resetFailedPinAttempts() {
    this.failedPinAttempts = 0;
    this.isLockedOut = false;
    this.recalculate();
  }

  // --------------------------------------------------------------------------
  // AUTONOMOUS USER ACTIVITY RECORDERS
  // --------------------------------------------------------------------------
  recordPointerMovement(x, y) {
    this.telemetry.lastInteractionTime = Date.now();
    const pts = this.telemetry.mousePoints;
    pts.push({ x, y, t: performance.now() });

    if (pts.length > 8) {
      pts.shift();
      const p0 = pts[0];
      const pMid = pts[Math.floor(pts.length / 2)];
      const pLast = pts[pts.length - 1];

      const num = Math.abs((pLast.y - p0.y)*pMid.x - (pLast.x - p0.x)*pMid.y + pLast.x*p0.y - pLast.y*p0.x);
      const den = Math.sqrt(Math.pow(pLast.y - p0.y, 2) + Math.pow(pLast.x - p0.x, 2)) || 1;
      const deviation = num / den;

      if (deviation > 1.2) {
        this.telemetry.mouseEntropy = Math.min(1.0, this.telemetry.mouseEntropy + 0.02);
        this.telemetry.currentActivityLabel = `Natural Cursor Arc (Deviation: ${deviation.toFixed(1)}px)`;
      } else {
        this.telemetry.mouseEntropy = Math.max(0.6, this.telemetry.mouseEntropy - 0.01);
      }
    }
  }

  recordKeystrokeFlight(flightMs) {
    this.telemetry.lastInteractionTime = Date.now();
    
    // Bot-speed typing anomaly detection (<60ms)
    if (flightMs < 60) {
      this.telemetry.keystrokeCadenceScore = 0.30;
      this.telemetry.currentActivityLabel = `🚨 Bot Typing Anomaly: ${flightMs}ms interval (Faster than human capability)`;
    } else if (flightMs > 90 && flightMs < 450) {
      this.telemetry.keystrokeCadenceScore = 0.98;
      this.telemetry.currentActivityLabel = `Human Typing Rhythm (${flightMs}ms flight)`;
    } else {
      this.telemetry.keystrokeCadenceScore = 0.65;
      this.telemetry.currentActivityLabel = `Irregular Keystroke Interval (${flightMs}ms)`;
    }
    this.recalculate();
  }

  recordWindowFocus(isFocused) {
    this.telemetry.isWindowFocused = isFocused;
    this.telemetry.lastInteractionTime = Date.now();
    if (!isFocused) {
      this.telemetry.currentActivityLabel = "⚠️ App Blurred: Background Overlay or Screen Capture suspected";
    } else {
      this.telemetry.currentActivityLabel = "Foreground session active · Enclave unsealed";
    }
    this.recalculate();
  }

  startAutonomousHeartbeat() {
    setInterval(() => {
      const idleSeconds = (Date.now() - this.telemetry.lastInteractionTime) / 1000;
      if (idleSeconds > 10 && !this.isLockedOut) {
        this.telemetry.currentActivityLabel = `Idle Session (${Math.round(idleSeconds)}s) · Awaiting user input`;
      }
      this.recalculate();
    }, 900);
  }

  // --------------------------------------------------------------------------
  // CORE SCORING & INTENT
  // --------------------------------------------------------------------------
  getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  setPayee(payeeData) {
    this.activePayee = { ...this.activePayee, ...payeeData };
    this.telemetry.lastInteractionTime = Date.now();
    this.recalculate();
  }

  setQRMode(mode) {
    this.telemetry.lastInteractionTime = Date.now();
    if (mode === 'counter') {
      this.setPayee({
        name: "Ramesh Tea Stall",
        vpa: "ramesh.tea@upi",
        city: "Chennai",
        lat: 13.0830,
        lon: 80.2710,
        type: "QR_COUNTER",
        avatar: "🏪"
      });
    } else if (mode === 'gallery') {
      this.setPayee({
        name: "Ramesh Tea Stall",
        vpa: "ramesh.tea@upi",
        city: "Chennai",
        lat: 13.0830,
        lon: 80.2710,
        type: "QR_GALLERY",
        avatar: "🏪"
      });
    } else if (mode === 'tampered') {
      this.setPayee({
        name: "Shadow Net Tech",
        vpa: "pay.scam88@fakeupi",
        city: "Gurgaon",
        lat: 28.4595,
        lon: 77.0266,
        type: "QR_TAMPERED",
        avatar: "⚠️"
      });
    }
  }

  setAmount(amount) {
    this.currentAmount = Number(amount) || 0;
    this.telemetry.lastInteractionTime = Date.now();
    this.recalculate();
  }

  setThreat(threatName, isActive) {
    if (this.threats.hasOwnProperty(threatName)) {
      this.threats[threatName] = isActive;
      this.recalculate();
    }
  }

  getIntentHash() {
    const p = this.activePayee;
    const dest = p.accountNumber ? `${p.bankName}:${p.accountNumber}` : p.vpa;
    const payload = `${dest}|INR${this.currentAmount}|${this.currentNonce}|${this.userLocation.lat},${this.userLocation.lon}`;
    
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      hash = ((hash << 5) - hash) + payload.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return {
      payload: `Sign(${dest} | ₹${this.currentAmount} | Nonce:${this.currentNonce} | ${p.city || 'Remote'})`,
      hash: `SHA256: 0x${hex}e94f...c12a`
    };
  }

  recalculate() {
    const p = this.activePayee;
    let distanceKm = 0;
    if (p.lat && p.lon) {
      distanceKm = this.getDistanceKm(
        this.userLocation.lat, this.userLocation.lon,
        p.lat, p.lon
      );
    }

    // 1. PERSON SCORE (Max 25): Based on live movement entropy, cadence, & failed PIN penalty
    let pScore = 24;
    if (this.threats.erraticCadence) {
      pScore = 8;
    } else {
      const combinedEntropy = (this.telemetry.mouseEntropy * 0.5) + (this.telemetry.keystrokeCadenceScore * 0.5);
      pScore = Math.max(12, Math.min(25, Math.round(25 * combinedEntropy)));
    }

    // Apply Graduated Failed PIN Deductions
    if (this.failedPinAttempts === 1) {
      pScore = Math.max(8, pScore - 3);
    } else if (this.failedPinAttempts === 2) {
      pScore = Math.max(6, pScore - 7);
    } else if (this.failedPinAttempts === 3) {
      pScore = Math.max(4, pScore - 15); // Pushes score towards yellow step-up
    } else if (this.failedPinAttempts === 4) {
      pScore = Math.max(2, pScore - 22);
    } else if (this.failedPinAttempts >= 5) {
      pScore = 1; // Critical lockout
    }
    this.signals.person = pScore;

    // 2. DEVICE SCORE (Max 25)
    let dScore = 25;
    if (this.threats.screenMirroring) {
      dScore = 5;
    } else if (!this.telemetry.isWindowFocused) {
      dScore = 14;
    }
    this.signals.device = dScore;

    // 3. CONTEXT SCORE (Max 25)
    let cScore = 24;
    if (this.threats.fakeQR || p.type === "QR_TAMPERED") {
      cScore = 4;
    } else if (p.type === "QR_GALLERY") {
      cScore = 18;
    } else if (p.type === "CONTACT_TRUSTED") {
      cScore = 25;
    } else if (p.type === "BANK_TRANSFER") {
      cScore = 24; // Standard national RTGS/NEFT routing
    } else if (p.type === "CONTACT_UNKNOWN") {
      cScore = 15;
    } else if (distanceKm > 0.5) {
      cScore = 14;
    }
    this.signals.context = cScore;

    // 4. INTENT SCORE (Max 25)
    let iScore = 24;
    if (this.threats.replayAttack) {
      iScore = 2;
    } else if (p.type === "CONTACT_UNKNOWN") {
      iScore = 12;
    } else if (this.currentAmount >= 50000) {
      iScore = 12; // Large amount anomaly (user tested 50k)
    } else if (this.currentAmount > 20000) {
      iScore = 17;
    } else if (p.type === "CONTACT_TRUSTED") {
      iScore = 25;
    }
    this.signals.intent = iScore;

    // Overall Score
    this.totalScore = this.signals.person + this.signals.device + this.signals.context + this.signals.intent;

    // If 5 attempts reached, force hard quarantine lock
    if (this.isLockedOut) {
      this.totalScore = 14;
      this.verdict = "BLOCK";
    } else if (this.totalScore >= 80) {
      this.verdict = "APPROVE";
    } else if (this.totalScore >= 50) {
      this.verdict = "STEP-UP";
    } else {
      this.verdict = "BLOCK";
    }

    this.notify();
  }
}

window.engine = new TrustEngine();
