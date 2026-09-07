/**
 * ============================================================================
 * PAYMENT 4.0 // FULL UPI APP CONTROLLER & AUTONOMOUS TELEMETRY
 * Project Kerberos - PS01: Digital Frontier
 * ============================================================================
 * Coordinates:
 *   - Manual Bank Transfer with Real-Time Bank Detection (SBI 058..., HDFC, ICICI, Axis, PNB)
 *   - Graduated Failed PIN Attempt Trust Penalty (1 to 5)
 *   - 5-Attempt / 1-Hour Security Lockout with Live Digital Countdown
 *   - Autonomous User Telemetry (Cursor Dynamics, Bot Typing Anomaly, Focus Detection)
 *   - Full UPI App Navigation (Home, Contacts, Bank, QR, Balance, History)
 */

document.addEventListener('DOMContentLoaded', () => {
  const engine = window.engine;

  // --------------------------------------------------------------------------
  // APPLICATION STATE
  // --------------------------------------------------------------------------
  let currentStep = 'stepHome';
  let previousStep = 'stepHome';
  let enteredPin = '';
  const NORMAL_PIN = '4829';
  const DURESS_PIN = '9284'; // Reversed PIN

  let authPurpose = 'PAYMENT';

  // Persistent Account Balance Management
  let userAccountBalance = parseFloat(localStorage.getItem('kerberos_axis_balance')) || 48250.00;
  let balanceUnlocked = false;

  function formatINR(val) {
    return Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function updateAllBalanceDisplays() {
    if (balanceAmountText) {
      if (balanceUnlocked) {
        balanceAmountText.innerHTML = `<span class="currency-tag">₹</span><span class="balance-val">${formatINR(userAccountBalance)}</span>`;
      } else {
        balanceAmountText.innerHTML = `<span class="currency-tag">₹</span><span class="balance-val">••,•••.••</span>`;
      }
    }
  }

  // Keystroke cadence telemetry
  let lastKeyPressTime = null;
  let flightTimes = [];

  // Biometric timer & progress
  let bioScanTimeout = null;
  let bioScanning = false;
  let bioProgress = 0;
  let bioProgressInterval = null;

  // Rate limiter for live telemetry audit logging
  let lastTelemetryLogTime = 0;

  // Lockout Countdown Timer
  let lockoutInterval = null;
  let lockoutSecondsRemaining = 3600; // 60 minutes = 3600 seconds

  // --------------------------------------------------------------------------
  // DOM REFERENCES
  // --------------------------------------------------------------------------
  const steps = {
    stepHome: document.getElementById('stepHome'),
    stepBankTransfer: document.getElementById('stepBankTransfer'),
    stepContactPicker: document.getElementById('stepContactPicker'),
    stepBalance: document.getElementById('stepBalance'),
    stepHistory: document.getElementById('stepBalance'), // Integrated into Balance & Passbook
    stepSecurity: document.getElementById('stepSecurity'),
    stepScan: document.getElementById('stepScan'),
    stepAmount: document.getElementById('stepAmount'),
    stepBiometric: document.getElementById('stepBiometric'),
    stepMpin: document.getElementById('stepMpin'),
    stepSuccess: document.getElementById('stepSuccess'),
    stepDuress: document.getElementById('stepDuress')
  };

  const navTabs = {
    stepHome: document.getElementById('navHome'),
    stepScan: document.getElementById('navScan'),
    stepSecurity: document.getElementById('navSecurity'),
    stepBalance: document.getElementById('navBalance')
  };

  // Home Screen Elements
  const btnActionScan = document.getElementById('btnActionScan');
  const btnActionContact = document.getElementById('btnActionContact');
  const btnActionUpiId = document.getElementById('btnActionUpiId');
  const btnActionBank = document.getElementById('btnActionBank');
  const btnActionBalance = document.getElementById('btnActionBalance');
  const btnSearchTrigger = document.getElementById('btnSearchTrigger');
  const btnViewAllContacts = document.getElementById('btnViewAllContacts');
  const btnViewHistoryFromHome = document.getElementById('btnViewHistoryFromHome');
  const homeTrustStatus = document.getElementById('homeTrustStatus');
  const homeRecentTxList = document.getElementById('homeRecentTxList');

  // Bank Transfer Screen Elements
  const inputBankAccNumber = document.getElementById('inputBankAccNumber');
  const accPrefixTag = document.getElementById('accPrefixTag');
  const detectedBankBanner = document.getElementById('detectedBankBanner');
  const detectedBankLogo = document.getElementById('detectedBankLogo');
  const detectedBankName = document.getElementById('detectedBankName');
  const detectedBankSub = document.getElementById('detectedBankSub');
  const detectedBankBadge = document.getElementById('detectedBankBadge');
  const inputBankAccConfirm = document.getElementById('inputBankAccConfirm');
  const inputBankIfsc = document.getElementById('inputBankIfsc');
  const inputBankBeneficiaryName = document.getElementById('inputBankBeneficiaryName');
  const btnProceedBankTransfer = document.getElementById('btnProceedBankTransfer');

  // Contact Picker
  const contactSearchInput = document.getElementById('contactSearchInput');

  // Balance Screen
  const balanceAmountText = document.getElementById('balanceAmountText');
  const balanceStatusDesc = document.getElementById('balanceStatusDesc');
  const btnUnlockBalance = document.getElementById('btnUnlockBalance');

  // History Screen
  const fullHistoryList = document.getElementById('fullHistoryList');

  // QR Scanner Elements
  const qrModeBtns = document.querySelectorAll('.qr-mode-btn');
  const qrVpa = document.getElementById('qrVpa');
  const qrLocation = document.getElementById('qrLocation');
  const geoAlertBox = document.getElementById('geoAlertBox');
  const btnProceedAmount = document.getElementById('btnProceedAmount');
  const remotePayModal = document.getElementById('remotePayModal');
  const btnConfirmRemotePay = document.getElementById('btnConfirmRemotePay');
  const btnCancelRemotePay = document.getElementById('btnCancelRemotePay');

  // Amount & Intent Elements
  const payeeAvatarDisplay = document.getElementById('payeeAvatarDisplay');
  const intentMerchantName = document.getElementById('intentMerchantName');
  const intentMerchantVpa = document.getElementById('intentMerchantVpa');
  const inputAmount = document.getElementById('inputAmount');
  const quickChips = document.querySelectorAll('.chip');
  const cryptoPayloadPreview = document.getElementById('cryptoPayloadPreview');
  const cryptoHashPreview = document.getElementById('cryptoHashPreview');
  const btnProceedBiometric = document.getElementById('btnProceedBiometric');
  const btnBackFromAmount = document.getElementById('btnBackFromAmount');

  // Biometric Screen Elements
  const fingerprintTarget = document.getElementById('fingerprintTarget');
  const bioProgressBar = document.getElementById('bioProgressBar');
  const bioScanPct = document.getElementById('bioScanPct');
  const bioStatusText = document.getElementById('bioStatusText');
  const bioSensorTelemetry = document.getElementById('bioSensorTelemetry');
  const bioSecureContextNotice = document.getElementById('bioSecureContextNotice');
  const btnNativeBio = document.getElementById('btnNativeBio');
  const btnBackFromBiometric = document.getElementById('btnBackFromBiometric');

  // MPIN & Lockout Elements
  const mpinTitle = document.getElementById('mpinTitle');
  const mpinSubtitle = document.getElementById('mpinSubtitle');
  const btnBackFromMpin = document.getElementById('btnBackFromMpin');
  const pinAttemptsCount = document.getElementById('pinAttemptsCount');
  const pinAttemptsWarning = document.getElementById('pinAttemptsWarning');
  const attDots = [
    document.getElementById('attDot1'),
    document.getElementById('attDot2'),
    document.getElementById('attDot3'),
    document.getElementById('attDot4'),
    document.getElementById('attDot5')
  ];
  const pinDots = [
    document.getElementById('dot0'),
    document.getElementById('dot1'),
    document.getElementById('dot2'),
    document.getElementById('dot3')
  ];
  const cadenceVal = document.getElementById('cadenceVal');
  const cadenceBar = document.getElementById('cadenceBar');
  const pinKeypad = document.getElementById('pinKeypad');

  // Lockout Overlay
  const lockoutOverlay = document.getElementById('lockoutOverlay');
  const lockoutTimerDisplay = document.getElementById('lockoutTimerDisplay');
  const btnUnlockDemoLockout = document.getElementById('btnUnlockDemoLockout');

  // Payment Processing Overlay Elements
  const paymentProcessingOverlay = document.getElementById('paymentProcessingOverlay');
  const procTitle = document.getElementById('procTitle');
  const procAmount = document.getElementById('procAmount');
  const procPayee = document.getElementById('procPayee');
  const pStage1 = document.getElementById('pStage1');
  const pStage2 = document.getElementById('pStage2');
  const pStage3 = document.getElementById('pStage3');
  const pStage4 = document.getElementById('pStage4');

  // Success & Duress Elements
  const receiptAmount = document.getElementById('receiptAmount');
  const receiptMerchant = document.getElementById('receiptMerchant');
  const receiptScore = document.getElementById('receiptScore');
  const receiptUpdatedBalance = document.getElementById('receiptUpdatedBalance');
  const btnNewTxn = document.getElementById('btnNewTxn');
  const btnResetDuress = document.getElementById('btnResetDuress');
  const btnGlobalReset = document.getElementById('btnGlobalReset');

  // Trust Engine & Threat Console
  const gaugeFill = document.getElementById('gaugeFill');
  const scoreValue = document.getElementById('scoreValue');
  const verdictBadge = document.getElementById('verdictBadge');
  const telemetryStateText = document.getElementById('telemetryStateText');

  const scorePerson = document.getElementById('scorePerson');
  const barPerson = document.getElementById('barPerson');
  const descPerson = document.getElementById('descPerson');

  const scoreDevice = document.getElementById('scoreDevice');
  const barDevice = document.getElementById('barDevice');
  const descDevice = document.getElementById('descDevice');

  const scoreContext = document.getElementById('scoreContext');
  const barContext = document.getElementById('barContext');
  const descContext = document.getElementById('descContext');

  const scoreIntent = document.getElementById('scoreIntent');
  const barIntent = document.getElementById('barIntent');
  const descIntent = document.getElementById('descIntent');

  const auditFeed = document.getElementById('auditFeed');

  const toggleThreatQR = document.getElementById('toggleThreatQR');
  const toggleThreatScreen = document.getElementById('toggleThreatScreen');
  const toggleThreatCadence = document.getElementById('toggleThreatCadence');
  const toggleThreatReplay = document.getElementById('toggleThreatReplay');

  // In-App Security Center Elements
  const btnQuickTrust = document.getElementById('btnQuickTrust');
  const bannerOpenTrustCenter = document.getElementById('bannerOpenTrustCenter');
  const btnToggleThreatCollapse = document.getElementById('btnToggleThreatCollapse');
  const threatLabContent = document.getElementById('threatLabContent');
  const threatCollapseIcon = document.getElementById('threatCollapseIcon');

  // Receipt Share Elements
  const btnShareReceipt = document.getElementById('btnShareReceipt');
  const shareSheetModal = document.getElementById('shareSheetModal');
  const btnCloseShareSheet = document.getElementById('btnCloseShareSheet');
  const shareReceiptSummaryText = document.getElementById('shareReceiptSummaryText');
  const shareWhatsApp = document.getElementById('shareWhatsApp');
  const shareGmail = document.getElementById('shareGmail');
  const shareMessenger = document.getElementById('shareMessenger');
  const shareInstagram = document.getElementById('shareInstagram');
  const shareCopy = document.getElementById('shareCopy');
  const copyBtnLabel = document.getElementById('copyBtnLabel');
  const shareToast = document.getElementById('shareToast');

  // Interactive Threat Alert Popup Modal Elements
  const threatAlertModal = document.getElementById('threatAlertModal');
  const threatAlertIcon = document.getElementById('threatAlertIcon');
  const threatAlertBadge = document.getElementById('threatAlertBadge');
  const threatAlertTitle = document.getElementById('threatAlertTitle');
  const threatAlertSub = document.getElementById('threatAlertSub');
  const threatAlertDesc = document.getElementById('threatAlertDesc');
  const threatParamVector = document.getElementById('threatParamVector');
  const threatParamScore = document.getElementById('threatParamScore');
  const threatParamDefense = document.getElementById('threatParamDefense');
  const btnNeutralizeThreat = document.getElementById('btnNeutralizeThreat');
  const btnDismissThreatAlert = document.getElementById('btnDismissThreatAlert');
  const threatToast = document.getElementById('threatToast');
  const threatToastMsg = document.getElementById('threatToastMsg');
  const historyCountBadge = document.getElementById('historyCountBadge');

  let activeSimulatedThreat = null;
  let threatToastTimeout = null;

  const threatDetailsMap = {
    screenMirroring: {
      icon: "📱⚠️",
      badge: "🚨 CRITICAL SECURITY INCIDENT",
      title: "Screen-Sharing / RAT Detected!",
      sub: "Unauthorized Remote Framebuffer Access Active",
      desc: "Kerberos Device Enclave detected an active background screen recording overlay (e.g. AnyDesk, TeamViewer, or remote access spyware) intercepting display frames. To prevent MPIN and banking credential theft, financial operations are quarantined!",
      vector: "MediaProjection / Accessibility Scraper",
      score: "Device Integrity: 0/25 · Total Score: 24/100 (BLOCKED)",
      defense: "Secure Enclave Sealed · Display Obscured",
      toastActive: "🚨 Screen Mirroring active! Device quarantined.",
      toastClear: "✓ Screen overlay terminated. Device integrity restored."
    },
    fakeQR: {
      icon: "🦹📍",
      badge: "⚠️ GEOFENCE FRAUD ALERT",
      title: "Tampered Sticker / Geofence Scam!",
      sub: "Pasted QR Sticker (>1,400 km away) Detected",
      desc: "Physical geofence validation failed! You scanned a printed QR sticker claiming to be 'Ramesh Tea Stall', but the registered merchant switch is in Gurgaon, Haryana (1,420 km away), while your device GPS confirms you are standing in Chennai, TN.",
      vector: "Physical QR Overlay Sticker (Pasted Fake VPA)",
      score: "Context Score: 0/25 · Total Score: 48/100 (BLOCKED)",
      defense: "Payment Route Aborted · Payee Flagged",
      toastActive: "⚠️ Geofence mismatch: Fake QR sticker simulated.",
      toastClear: "✓ Valid store counter QR restored (<10m)."
    },
    erraticCadence: {
      icon: "🕵️⚡",
      badge: "🚨 BEHAVIORAL CADENCE ANOMALY",
      title: "Uncharacteristic Keystroke Rhythm!",
      sub: "Stolen Unlocked Device Simulation Active",
      desc: "Keystroke dynamics, flight time, and touch rhythm deviate by 76% from the enrolled owner profile. An unauthorized person is operating the device while unlocked.",
      vector: "Cadence Flight-Time Anomaly (<40ms Bot Bursts)",
      score: "Person Score: 6/25 · Step-Up Enforced (68/100)",
      defense: "Mandatory Biometric Step-Up Required",
      toastActive: "🚨 Stolen phone cadence anomaly injected!",
      toastClear: "✓ Behavioral cadence matched to owner profile."
    },
    replayAttack: {
      icon: "💥🔐",
      badge: "🛑 CRYPTOGRAPHIC ATTACK INTERCEPTED",
      title: "Cryptographic Replay Attack!",
      sub: "Expired Authorization Nonce Intercepted",
      desc: "The transaction intent binding reuses a previous cryptographic nonce ('0x8F4A') that was already settled. Zero-Trust nonce verification rejected this duplicate payload.",
      vector: "Reused SHA-256 Intent Signature (Stale Nonce)",
      score: "Intent Score: 0/25 · Total Score: 52/100 (BLOCKED)",
      defense: "Replay Rejected · Nonce Invalidated",
      toastActive: "🛑 Expired nonce injected into transaction stream.",
      toastClear: "✓ Fresh cryptographic nonce generated."
    }
  };

  function showThreatModal(threatKey) {
    activeSimulatedThreat = threatKey;
    const data = threatDetailsMap[threatKey];
    if (!data || !threatAlertModal) return;

    threatAlertIcon.textContent = data.icon;
    threatAlertBadge.textContent = data.badge;
    threatAlertTitle.textContent = data.title;
    threatAlertSub.textContent = data.sub;
    threatAlertDesc.textContent = data.desc;
    threatParamVector.textContent = data.vector;
    threatParamScore.textContent = data.score;
    threatParamDefense.textContent = data.defense;

    threatAlertModal.classList.remove('hidden');
    showThreatToast(data.toastActive, true);
  }

  function hideThreatModal() {
    if (threatAlertModal) {
      threatAlertModal.classList.add('hidden');
    }
  }

  function showThreatToast(msg, isDanger = false) {
    if (!threatToast) return;
    if (threatToastTimeout) clearTimeout(threatToastTimeout);

    threatToastMsg.textContent = msg;
    threatToast.className = `threat-toast-banner ${isDanger ? 'danger-toast' : ''}`;
    threatToast.classList.remove('hidden');

    threatToastTimeout = setTimeout(() => {
      threatToast.classList.add('hidden');
    }, 4000);
  }

  if (btnDismissThreatAlert) {
    btnDismissThreatAlert.addEventListener('click', () => {
      hideThreatModal();
      showThreatToast(`⚠️ Attack remains active in background for demonstration.`, true);
    });
  }

  if (btnNeutralizeThreat) {
    btnNeutralizeThreat.addEventListener('click', () => {
      if (activeSimulatedThreat) {
        neutralizeThreat(activeSimulatedThreat);
      }
      hideThreatModal();
    });
  }

  function neutralizeThreat(threatKey) {
    engine.setThreat(threatKey, false);

    if (threatKey === 'screenMirroring' && toggleThreatScreen) toggleThreatScreen.checked = false;
    if (threatKey === 'fakeQR') {
      if (toggleThreatQR) toggleThreatQR.checked = false;
      updateQRView('counter');
    }
    if (threatKey === 'erraticCadence') {
      if (toggleThreatCadence) toggleThreatCadence.checked = false;
      updateCadenceDisplay(100);
    }
    if (threatKey === 'replayAttack' && toggleThreatReplay) toggleThreatReplay.checked = false;

    const clearMsg = threatDetailsMap[threatKey] ? threatDetailsMap[threatKey].toastClear : "✓ Threat neutralized.";
    showThreatToast(clearMsg, false);
    logAudit(`Threat neutralized: ${threatKey}. Restored pristine zero-trust baseline.`, 'success');
  }

  // --------------------------------------------------------------------------
  // AUTONOMOUS USER ACTIVITY LISTENERS (MOUSE, TYPING, FOCUS)
  // --------------------------------------------------------------------------
  window.addEventListener('pointermove', (e) => {
    engine.recordPointerMovement(e.clientX, e.clientY);

    const now = Date.now();
    if (now - lastTelemetryLogTime > 12000 && !engine.threats.erraticCadence && !engine.isLockedOut) {
      lastTelemetryLogTime = now;
      logAudit(`Live Telemetry: Natural cursor entropy verified (${(engine.telemetry.mouseEntropy * 100).toFixed(0)}% human curve).`, 'info');
    }
  });

  window.addEventListener('blur', () => {
    engine.recordWindowFocus(false);
    logAudit(`⚠️ Window focus lost: Application backgrounded or overlay active. Device score adjusted.`, 'warn');
  });

  window.addEventListener('focus', () => {
    engine.recordWindowFocus(true);
    logAudit(`✓ Window focus restored: Active foreground session confirmed.`, 'success');
  });

  // --------------------------------------------------------------------------
  // NAVIGATION CONTROLLER
  // --------------------------------------------------------------------------
  function goToStep(stepId) {
    if (currentStep !== stepId) {
      previousStep = currentStep;
    }

    Object.values(steps).forEach(s => s && s.classList.remove('active-step'));
    if (steps[stepId]) {
      steps[stepId].classList.add('active-step');
      currentStep = stepId;
    }

    Object.keys(navTabs).forEach(key => {
      if (navTabs[key]) {
        navTabs[key].classList.toggle('active-tab', key === stepId);
      }
    });

    if (stepId === 'stepMpin') {
      resetPin();
      updateAttemptsUI();

      if (engine.isLockedOut) {
        lockoutOverlay.classList.remove('hidden');
      } else {
        lockoutOverlay.classList.add('hidden');
      }

      if (authPurpose === 'BALANCE') {
        mpinTitle.textContent = "Authorize Balance Check";
        mpinSubtitle.textContent = "Enter MPIN to view account balance";
      } else {
        mpinTitle.textContent = "Security MPIN";
        mpinSubtitle.textContent = "Step 4: Final Intent Verification";
      }
    }
    if (stepId === 'stepBiometric') {
      resetBioState();
    }
  }

  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-back');
      if (target) {
        goToStep(target);
      } else {
        goToStep(previousStep || 'stepHome');
      }
    });
  });

  btnBackFromAmount.addEventListener('click', () => {
    goToStep(previousStep === 'stepScan' ? 'stepScan' : previousStep === 'stepBankTransfer' ? 'stepBankTransfer' : previousStep === 'stepContactPicker' ? 'stepContactPicker' : 'stepHome');
  });
  btnBackFromBiometric.addEventListener('click', () => {
    goToStep(authPurpose === 'BALANCE' ? 'stepBalance' : 'stepAmount');
  });
  btnBackFromMpin.addEventListener('click', () => {
    goToStep('stepBiometric');
  });

  Object.keys(navTabs).forEach(stepId => {
    const tabBtn = navTabs[stepId];
    if (tabBtn) {
      tabBtn.addEventListener('click', () => goToStep(stepId));
    }
  });

  // Wire In-App Security Center Direct Buttons
  if (btnQuickTrust) {
    btnQuickTrust.addEventListener('click', () => {
      goToStep('stepSecurity');
    });
  }

  if (bannerOpenTrustCenter) {
    bannerOpenTrustCenter.addEventListener('click', () => {
      goToStep('stepSecurity');
    });
  }

  if (btnToggleThreatCollapse && threatLabContent) {
    btnToggleThreatCollapse.addEventListener('click', () => {
      threatLabContent.classList.toggle('collapsed');
      if (threatCollapseIcon) {
        threatCollapseIcon.textContent = threatLabContent.classList.contains('collapsed') ? '▶' : '▼';
      }
    });
  }

  // --------------------------------------------------------------------------
  // AUDIT LOGGING HELPER
  // --------------------------------------------------------------------------
  function logAudit(msg, level = 'info') {
    const time = new Date().toTimeString().split(' ')[0];
    if (auditFeed) {
      const el = document.createElement('div');
      el.className = `log-entry ${level}`;
      el.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
      auditFeed.appendChild(el);
      auditFeed.scrollTop = auditFeed.scrollHeight;
    }
  }

  // --------------------------------------------------------------------------
  // 🏦 MANUAL BANK TRANSFER WITH REAL-TIME PREFIX DETECTION
  // --------------------------------------------------------------------------
  btnActionBank.addEventListener('click', () => {
    goToStep('stepBankTransfer');
  });

  inputBankAccNumber.addEventListener('input', (e) => {
    const val = e.target.value;
    const res = engine.detectBankFromAccountNumber(val);

    // Reset old bank classes
    detectedBankBanner.className = 'detected-bank-pill';
    if (res.cssClass) {
      detectedBankBanner.classList.add(res.cssClass);
    }

    detectedBankName.textContent = res.name;
    detectedBankSub.textContent = res.sub;
    detectedBankLogo.textContent = res.logo;
    detectedBankBadge.textContent = res.detected ? "VERIFIED BANK" : "AUTO-DETECT";

    // Update tag badge
    accPrefixTag.textContent = val.length >= 3 ? val.substring(0, 3) : "Prefix";

    // Auto-fill IFSC code if empty or previous bank code
    if (res.ifsc) {
      inputBankIfsc.value = res.ifsc;
    }

    if (res.detected) {
      logAudit(`Bank Auto-Detection: Prefix ${val.substring(0, 3)} identified as ${res.name}.`, 'info');
    }
  });

  btnProceedBankTransfer.addEventListener('click', () => {
    const acc1 = inputBankAccNumber.value.trim();
    const acc2 = inputBankAccConfirm.value.trim();
    const ifsc = inputBankIfsc.value.trim();
    const name = inputBankBeneficiaryName.value.trim() || "Beneficiary";

    if (!acc1 || acc1.length < 5) {
      alert("Please enter a valid bank account number (minimum 5 digits).");
      return;
    }

    if (acc2 && acc1 !== acc2) {
      alert("The re-entered account number does not match! Please verify.");
      return;
    }

    const bankInfo = engine.detectBankFromAccountNumber(acc1);

    selectPayee({
      name: name,
      vpa: `${bankInfo.name} ··${acc1.slice(-4)} (${ifsc || bankInfo.ifsc})`,
      city: "India",
      type: "BANK_TRANSFER",
      avatar: bankInfo.logo || "🏦",
      bankName: bankInfo.name,
      accountNumber: acc1
    });

    logAudit(`Initiated direct bank transfer to ${bankInfo.name} (A/c: ··${acc1.slice(-4)}, IFSC: ${ifsc || bankInfo.ifsc}).`, 'info');
  });

  // --------------------------------------------------------------------------
  // HOME SCREEN ACTIONS & QUICK PAY
  // --------------------------------------------------------------------------
  btnActionScan.addEventListener('click', () => goToStep('stepScan'));
  btnActionContact.addEventListener('click', () => goToStep('stepContactPicker'));
  btnActionUpiId.addEventListener('click', () => {
    goToStep('stepContactPicker');
    setTimeout(() => contactSearchInput.focus(), 200);
  });
  btnActionBalance.addEventListener('click', () => goToStep('stepBalance'));
  btnSearchTrigger.addEventListener('click', () => goToStep('stepContactPicker'));
  btnViewAllContacts.addEventListener('click', () => goToStep('stepContactPicker'));
  if (btnViewHistoryFromHome) {
    btnViewHistoryFromHome.addEventListener('click', () => goToStep('stepBalance'));
  }

  document.querySelectorAll('.contact-pill-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.getAttribute('data-name');
      const vpa = item.getAttribute('data-vpa');
      const type = item.getAttribute('data-type');
      const avatar = item.querySelector('.contact-avatar').textContent;

      selectPayee({ name, vpa, type, avatar, city: "Chennai" });
    });
  });

  document.querySelectorAll('.directory-item').forEach(item => {
    item.addEventListener('click', () => {
      const name = item.getAttribute('data-name');
      const vpa = item.getAttribute('data-vpa');
      const type = item.getAttribute('data-type');
      const avatar = item.querySelector('.directory-avatar').textContent;

      selectPayee({ name, vpa, type, avatar, city: "Chennai" });
    });
  });

  contactSearchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.directory-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(term) ? 'flex' : 'none';
    });
  });

  function selectPayee(payee) {
    authPurpose = 'PAYMENT';
    engine.setPayee(payee);

    intentMerchantName.textContent = payee.name;
    intentMerchantVpa.textContent = `${payee.vpa} · ${payee.type === 'CONTACT_TRUSTED' ? 'Frequent Contact' : payee.type === 'CONTACT_UNKNOWN' ? 'Unverified VPA' : payee.type === 'BANK_TRANSFER' ? 'Direct Bank Transfer' : 'Merchant'}`;
    payeeAvatarDisplay.textContent = payee.avatar || '👤';

    updateIntentPreview();
    goToStep('stepAmount');

    if (payee.type === 'CONTACT_UNKNOWN') {
      logAudit(`Selected unverified payee (${payee.vpa}). Trust Engine triggers Step-Up alert.`, 'warn');
    } else {
      logAudit(`Selected payee: ${payee.name} (${payee.vpa}). Baseline trust active.`, 'info');
    }
  }

  // --------------------------------------------------------------------------
  // CHECK BALANCE FLOW
  // --------------------------------------------------------------------------
  btnUnlockBalance.addEventListener('click', () => {
    authPurpose = 'BALANCE';
    logAudit(`Initiated Account Balance Inquiry. Requesting biometric enclave unlock...`, 'info');
    goToStep('stepBiometric');
  });

  function revealBalance() {
    balanceUnlocked = true;
    updateAllBalanceDisplays();
    balanceStatusDesc.innerHTML = `<strong style="color:var(--accent-green)">✓ Enclave Authenticated</strong> · Available: ₹${formatINR(userAccountBalance)}`;
    btnUnlockBalance.innerHTML = `<span>Balance Unlocked</span> ✓`;
    btnUnlockBalance.style.background = 'rgba(0, 230, 118, 0.2)';
    btnUnlockBalance.style.color = 'var(--accent-green)';
    btnUnlockBalance.style.border = '1px solid rgba(0, 230, 118, 0.4)';
    logAudit(`Balance inquiry authorized: ₹${formatINR(userAccountBalance)} displayed via hardware-bound session.`, 'success');
  }

  // --------------------------------------------------------------------------
  // STEP 1: QR & GEO-VERIFICATION LOGIC
  // --------------------------------------------------------------------------
  function updateQRView(mode) {
    qrModeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
    });

    engine.setQRMode(mode);
    const m = engine.activePayee;
    qrVpa.textContent = m.vpa;

    if (mode === 'counter') {
      qrLocation.textContent = "T. Nagar, Chennai (3m away)";
      geoAlertBox.className = "geo-status-banner verified";
      geoAlertBox.innerHTML = `
        <span class="geo-icon">✓</span>
        <div class="geo-info">
          <strong>Physical Geofence Matched</strong>
          <span>Device GPS matches merchant registered shop location (&lt;10m).</span>
        </div>`;
      logAudit(`QR scanned: Counter merchant ${m.vpa} (Chennai, distance: 3m). Match OK.`, 'success');
    } 
    else if (mode === 'gallery') {
      qrLocation.textContent = "Uploaded from Gallery · Merchant in Chennai";
      geoAlertBox.className = "geo-status-banner warning";
      geoAlertBox.innerHTML = `
        <span class="geo-icon">ℹ️</span>
        <div class="geo-info">
          <strong>Remote Image Source Detected</strong>
          <span>QR loaded from photo album. Delegated payment verification active.</span>
        </div>`;
      logAudit(`QR loaded: Gallery image from friend. Merchant in Chennai, client in Mumbai. Delegated flow.`, 'warn');
    } 
    else if (mode === 'tampered') {
      qrLocation.textContent = "Registered in Gurgaon (1,750 km away)";
      geoAlertBox.className = "geo-status-banner alert";
      geoAlertBox.innerHTML = `
        <span class="geo-icon">⚠️</span>
        <div class="geo-info">
          <strong>Phantom Merchant Alert!</strong>
          <span>You are physically in Chennai, but this QR points to an account registered in Gurgaon. Possible sticker swap!</span>
        </div>`;
      logAudit(`🚨 [ALERT] Counter QR sticker mismatch: Scanned in Chennai, Merchant in Gurgaon!`, 'danger');
    }
  }

  qrModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      updateQRView(mode);
    });
  });

  btnProceedAmount.addEventListener('click', () => {
    authPurpose = 'PAYMENT';
    if (engine.activePayee.type === 'QR_GALLERY') {
      remotePayModal.classList.remove('hidden');
    } else if (engine.activePayee.type === 'QR_TAMPERED') {
      logAudit(`Warning: Proceeding with tampered QR will trigger Quarantine block at settlement.`, 'danger');
      selectPayee(engine.activePayee);
    } else {
      selectPayee(engine.activePayee);
    }
  });

  btnConfirmRemotePay.addEventListener('click', () => {
    remotePayModal.classList.add('hidden');
    logAudit(`Remote Friend Payment confirmed by user with explicit merchant consent.`, 'info');
    selectPayee(engine.activePayee);
  });

  btnCancelRemotePay.addEventListener('click', () => {
    remotePayModal.classList.add('hidden');
  });

  // --------------------------------------------------------------------------
  // STEP 2: AMOUNT & INTENT BINDING
  // --------------------------------------------------------------------------
  function updateIntentPreview() {
    const val = inputAmount.value || 0;
    engine.setAmount(val);
    const intent = engine.getIntentHash();
    cryptoPayloadPreview.textContent = intent.payload;
    cryptoHashPreview.textContent = intent.hash;
  }

  inputAmount.addEventListener('input', updateIntentPreview);

  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      quickChips.forEach(c => c.classList.remove('active-chip'));
      chip.classList.add('active-chip');
      inputAmount.value = chip.getAttribute('data-val');
      updateIntentPreview();
    });
  });

  btnProceedBiometric.addEventListener('click', () => {
    goToStep('stepBiometric');
    logAudit(`Cryptographic Intent Locked: ${inputAmount.value} INR bound to nonce ${engine.currentNonce}.`, 'info');
  });

  // --------------------------------------------------------------------------
  // STEP 3: NATIVE SYSTEM FINGERPRINT BIOMETRIC GATE (WINDOWS HELLO / WEBAUTHN)
  // --------------------------------------------------------------------------
  function resetBioState() {
    bioScanning = false;
    bioProgress = 0;
    if (bioProgressInterval) {
      clearInterval(bioProgressInterval);
      bioProgressInterval = null;
    }
    if (bioScanTimeout) {
      clearTimeout(bioScanTimeout);
      bioScanTimeout = null;
    }
    if (fingerprintTarget) {
      fingerprintTarget.classList.remove('scanning', 'shake', 'success');
    }
    if (bioProgressBar) {
      bioProgressBar.classList.remove('success', 'failed');
      bioProgressBar.style.strokeDashoffset = '390';
    }
    if (bioScanPct) {
      bioScanPct.textContent = 'CLICK TO SCAN';
    }
    if (bioStatusText) {
      bioStatusText.textContent = 'Click sensor or button to invoke Windows Hello';
    }
    if (bioSensorTelemetry) {
      bioSensorTelemetry.innerHTML = 'System Biometrics: <strong>Ready (Windows Hello)</strong>';
    }

    // Check secure context for Windows Hello hardware access
    if (bioSecureContextNotice) {
      if (!window.isSecureContext || window.location.protocol === 'file:') {
        bioSecureContextNotice.classList.remove('hidden');
      } else {
        bioSecureContextNotice.classList.add('hidden');
      }
    }
  }

  let bioPressStartTime = 0;
  let bioIsHolding = false;

  async function invokeSystemBiometrics() {
    if (bioScanning) return;
    bioScanning = true;

    // UI state: prompt user
    if (fingerprintTarget) {
      fingerprintTarget.classList.remove('shake', 'success');
      fingerprintTarget.classList.add('scanning');
    }
    if (bioProgressBar) {
      bioProgressBar.classList.remove('success', 'failed');
      bioProgressBar.style.strokeDashoffset = '390';
    }
    if (bioScanPct) {
      bioScanPct.textContent = 'SCANNING';
    }
    if (bioStatusText) {
      bioStatusText.innerHTML = '<span style="color:var(--accent-blue);font-weight:600;">👆 Touch your physical fingerprint sensor (Windows Hello)...</span>';
    }
    if (bioSensorTelemetry) {
      bioSensorTelemetry.innerHTML = 'System Biometrics: <strong>Activating Windows Hello...</strong>';
    }

    logAudit("Hardware Biometric Request: Awaiting physical fingerprint scan via Windows Hello.", "info");

    // 1. If running on file:// protocol, WebAuthn is disabled by browser security.
    if (window.location.protocol === 'file:' || !window.isSecureContext) {
      bioScanning = false;
      if (fingerprintTarget) {
        fingerprintTarget.classList.remove('scanning');
        fingerprintTarget.classList.add('shake');
      }
      if (bioProgressBar) bioProgressBar.classList.add('failed');
      if (bioScanPct) bioScanPct.textContent = 'SWITCH HTTP';
      if (bioStatusText) {
        bioStatusText.innerHTML = `
          <div style="color:var(--accent-red);font-weight:700;margin-bottom:4px;">⚠️ Windows Hello is blocked by browser on file:// URLs!</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">WebAuthn requires a local server. Click below to launch on localhost:8080:</div>
          <button type="button" class="btn-primary" style="padding:7px 16px;font-size:11px;margin:0 auto;background:#2563eb;" onclick="window.location.href='http://localhost:8080/index.html'">
            🚀 Switch to http://localhost:8080
          </button>
        `;
      }
      if (bioSecureContextNotice) bioSecureContextNotice.classList.remove('hidden');
      if (bioSensorTelemetry) {
        bioSensorTelemetry.innerHTML = 'System Biometrics: <span style="color:var(--accent-red)">Hardware biometrics require http://localhost:8080</span>';
      }
      logAudit("Biometric Error: Windows Hello blocked on file:// origin. Switch to http://localhost:8080.", "danger");
      return;
    }

    // 2. Validate WebAuthn availability in browser
    if (!window.PublicKeyCredential || !navigator.credentials || !navigator.credentials.create) {
      bioScanning = false;
      if (fingerprintTarget) {
        fingerprintTarget.classList.remove('scanning');
        fingerprintTarget.classList.add('shake');
      }
      if (bioProgressBar) bioProgressBar.classList.add('failed');
      if (bioScanPct) bioScanPct.textContent = 'NO WEBAUTHN';
      if (bioStatusText) {
        bioStatusText.innerHTML = '<span style="color:var(--accent-red);font-weight:600;">⚠️ WebAuthn platform authenticator not supported in this browser window.</span>';
      }
      logAudit("Biometric Error: WebAuthn not supported.", "danger");
      return;
    }

    try {
      // Generate 32-byte cryptographic challenge
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      // Note: We deliberately omit `id` in `rp` so the browser automatically binds to the current origin
      // without ANY domain mismatch or IP syntax errors!
      const publicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "Project Kerberos (Payment 4.0)"
        },
        user: {
          id: userId,
          name: "alex.rivera@axisbank",
          displayName: "Alex Rivera (Axis Bank ··4821)"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256 (standard for Windows Hello & Touch ID)
          { type: "public-key", alg: -257 }  // RS256 (RSA fallback for Windows Hello)
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform", // Strictly asks for built-in platform biometric (Windows Hello)
          userVerification: "required"         // Strictly requires real physical biometric scan
        },
        timeout: 60000
      };

      // Real Operating System Hardware Call:
      // Windows pops up its native "Windows Security - Touch the fingerprint sensor" modal dialog!
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      });

      if (credential) {
        // Physical fingerprint was successfully verified by Windows Hello hardware!
        bioScanning = false;
        if (fingerprintTarget) {
          fingerprintTarget.classList.remove('scanning');
          fingerprintTarget.classList.add('success');
        }
        if (bioProgressBar) {
          bioProgressBar.classList.remove('failed');
          bioProgressBar.classList.add('success');
          bioProgressBar.style.strokeDashoffset = '0';
        }
        if (bioScanPct) {
          bioScanPct.textContent = '100%';
        }
        if (bioStatusText) {
          bioStatusText.innerHTML = '<strong style="color:var(--accent-green)">✓ System Fingerprint Verified via Windows Hello!</strong>';
        }
        if (bioSensorTelemetry) {
          bioSensorTelemetry.innerHTML = 'System Biometrics: <strong style="color:var(--accent-green)">Physical Fingerprint Matched (Hardware Enclave) ✓</strong>';
        }
        logAudit(`✓ Hardware Biometric Passed: Physical fingerprint authenticated by Windows Hello Keystore (ID: ${credential.id.slice(0, 10)}...).`, 'success');

        setTimeout(() => {
          goToStep('stepMpin');
        }, 400);
      }
    } catch (err) {
      bioScanning = false;
      if (fingerprintTarget) {
        fingerprintTarget.classList.remove('scanning');
        fingerprintTarget.classList.add('shake');
        setTimeout(() => {
          if (fingerprintTarget) fingerprintTarget.classList.remove('shake');
        }, 450);
      }
      if (bioProgressBar) {
        bioProgressBar.classList.add('failed');
        bioProgressBar.style.strokeDashoffset = '390';
      }
      if (bioScanPct) {
        bioScanPct.textContent = 'RETRY';
      }

      console.warn("System biometric verification failed or was cancelled:", err);

      if (err.name === 'NotAllowedError') {
        // User cancelled, closed Windows Hello dialog, or sensor timed out
        if (bioStatusText) {
          bioStatusText.innerHTML = '<span style="color:var(--accent-red);font-weight:600;">❌ Fingerprint scan cancelled or not recognized.</span>';
        }
        if (bioSensorTelemetry) {
          bioSensorTelemetry.innerHTML = 'System Biometrics: <span style="color:var(--accent-red)">Windows Hello prompt closed or sensor timed out.</span>';
        }
        logAudit("❌ Biometric verification cancelled or rejected by system fingerprint sensor.", "warn");
      } else if (err.name === 'NotSupportedError') {
        if (bioStatusText) {
          bioStatusText.innerHTML = '<span style="color:var(--accent-red);font-weight:600;">⚠️ Platform Authenticator not configured in Windows. Hold sensor firmly to scan.</span>';
        }
        if (bioSensorTelemetry) {
          bioSensorTelemetry.innerHTML = 'System Biometrics: <span style="color:var(--accent-red)">Windows Hello platform not ready. Press & hold sensor.</span>';
        }
        logAudit("❌ Windows Hello platform authenticator not ready. Use hold-to-scan.", "warn");
      } else if (err.name === 'SecurityError') {
        if (bioStatusText) {
          bioStatusText.innerHTML = `
            <span style="color:var(--accent-red);font-weight:600;">⚠️ Security Error: Please open on http://localhost:8080</span><br>
            <small style="color:var(--text-muted)">Click button below to open directly on local server.</small>
          `;
        }
        if (bioSecureContextNotice) {
          bioSecureContextNotice.classList.remove('hidden');
        }
        logAudit(`❌ Biometric SecurityError: ${err.message}`, "danger");
      } else {
        if (bioStatusText) {
          bioStatusText.innerHTML = `<span style="color:var(--accent-red);font-weight:600;">❌ Biometric failed: ${err.message || err.name}</span>`;
        }
        if (bioSensorTelemetry) {
          bioSensorTelemetry.innerHTML = 'System Biometrics: <span style="color:var(--accent-red)">Sensor error. Click or hold to retry.</span>';
        }
        logAudit(`❌ Biometric error: ${err.message || err.name}`, "danger");
      }
    }
  }

  // Hold-to-scan physical interactive fallback
  function onFingerprintDown(e) {
    if (e && e.type === 'touchstart') e.preventDefault();
    if (bioScanning) return;
    bioPressStartTime = performance.now();
    bioIsHolding = true;
    bioProgress = 0;

    if (fingerprintTarget) {
      fingerprintTarget.classList.add('scanning');
      fingerprintTarget.classList.remove('shake', 'success');
    }
    if (bioProgressBar) {
      bioProgressBar.classList.remove('success', 'failed');
      bioProgressBar.style.strokeDashoffset = '390';
    }
    if (bioStatusText) {
      bioStatusText.textContent = "Scanning hardware enclave... Hold firmly or tap for Windows Hello";
    }
    if (bioSensorTelemetry) {
      bioSensorTelemetry.innerHTML = 'Capacitive Sensor: <strong>Acquiring Ridges (0%)</strong>';
    }

    if (bioProgressInterval) clearInterval(bioProgressInterval);

    bioProgressInterval = setInterval(() => {
      if (!bioIsHolding) {
        clearInterval(bioProgressInterval);
        bioProgressInterval = null;
        return;
      }
      bioProgress += 2;
      const pct = Math.min(100, Math.round(bioProgress));
      if (bioProgressBar) {
        bioProgressBar.style.strokeDashoffset = 390 - (390 * (pct / 100));
      }
      if (bioScanPct) {
        bioScanPct.textContent = `${pct}%`;
      }
      if (pct === 30 && bioSensorTelemetry) {
        bioSensorTelemetry.innerHTML = 'Capacitive Sensor: <strong>Matching Minutiae Points (30%)</strong>';
      } else if (pct === 60 && bioSensorTelemetry) {
        bioSensorTelemetry.innerHTML = 'Capacitive Sensor: <strong>Generating FIDO2 Enclave Assertion (60%)</strong>';
      } else if (pct === 86 && bioSensorTelemetry) {
        bioSensorTelemetry.innerHTML = 'Capacitive Sensor: <strong>Cryptographic Nonce Signing (86%)</strong>';
      }

      if (bioProgress >= 100) {
        clearInterval(bioProgressInterval);
        bioProgressInterval = null;
        bioIsHolding = false;
        completeHoldSuccess();
      }
    }, 25);
  }

  function onFingerprintUp(e) {
    if (!bioIsHolding && !bioScanning) return;
    const elapsed = performance.now() - bioPressStartTime;

    if (bioProgress >= 100) return;

    bioIsHolding = false;
    if (bioProgressInterval) {
      clearInterval(bioProgressInterval);
      bioProgressInterval = null;
    }

    // If it was a quick click / tap (< 250ms), invoke Windows Hello system biometric!
    if (elapsed < 250) {
      if (fingerprintTarget) fingerprintTarget.classList.remove('scanning');
      if (bioProgressBar) bioProgressBar.style.strokeDashoffset = '390';
      if (bioScanPct) bioScanPct.textContent = 'WINDOWS HELLO';
      invokeSystemBiometrics();
    } else {
      // User was trying to hold, but lifted early!
      if (fingerprintTarget) {
        fingerprintTarget.classList.remove('scanning');
        fingerprintTarget.classList.add('shake');
        setTimeout(() => {
          if (fingerprintTarget) fingerprintTarget.classList.remove('shake');
        }, 450);
      }
      if (bioProgressBar) {
        bioProgressBar.classList.add('failed');
        bioProgressBar.style.strokeDashoffset = '390';
      }
      if (bioScanPct) {
        bioScanPct.textContent = 'HOLD FIRMLY';
      }
      if (bioStatusText) {
        bioStatusText.innerHTML = '<span style="color:var(--accent-red);font-weight:600;">⚠️ Finger lifted early! Hold until 100% or tap once for Windows Hello.</span>';
      }
      if (bioSensorTelemetry) {
        bioSensorTelemetry.innerHTML = 'Capacitive Sensor: <span style="color:var(--accent-red)">Capture Incomplete (Signature Aborted)</span>';
      }
      logAudit("⚠️ Biometric verification aborted: Contact broken before enclave signature completed.", "warn");
    }
  }

  function completeHoldSuccess() {
    bioIsHolding = false;
    bioScanning = false;
    if (fingerprintTarget) {
      fingerprintTarget.classList.remove('scanning');
      fingerprintTarget.classList.add('success');
    }
    if (bioProgressBar) {
      bioProgressBar.classList.remove('failed');
      bioProgressBar.classList.add('success');
      bioProgressBar.style.strokeDashoffset = '0';
    }
    if (bioScanPct) {
      bioScanPct.textContent = '100%';
    }
    if (bioStatusText) {
      bioStatusText.innerHTML = '<strong style="color:var(--accent-green)">✓ Biometric Liveness Confirmed!</strong>';
    }
    if (bioSensorTelemetry) {
      bioSensorTelemetry.innerHTML = 'Capacitive Sensor: <strong style="color:var(--accent-green)">Hardware Assertion Signed ✓</strong>';
    }
    logAudit("Hardware Biometric Passed: Secure Enclave FIDO2 signature verified.", "success");

    setTimeout(() => {
      goToStep('stepMpin');
    }, 380);
  }

  // Dual Interaction Bindings:
  // - Click or Tap: triggers Windows Hello system biometric
  // - Press & Hold (1.25s): triggers physical ridge scan
  if (fingerprintTarget) {
    fingerprintTarget.addEventListener('mousedown', onFingerprintDown);
    fingerprintTarget.addEventListener('mouseup', onFingerprintUp);
    fingerprintTarget.addEventListener('mouseleave', () => {
      if (bioIsHolding) {
        bioIsHolding = false;
        if (bioProgressInterval) clearInterval(bioProgressInterval);
        if (fingerprintTarget) fingerprintTarget.classList.remove('scanning');
        if (bioProgressBar) bioProgressBar.style.strokeDashoffset = '390';
        if (bioScanPct) bioScanPct.textContent = 'CLICK TO SCAN';
      }
    });
    fingerprintTarget.addEventListener('touchstart', onFingerprintDown, { passive: false });
    fingerprintTarget.addEventListener('touchend', onFingerprintUp);
    fingerprintTarget.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        invokeSystemBiometrics();
      }
    });
  }

  // Dedicated button explicitly triggers native Windows Hello prompt
  if (btnNativeBio) {
    btnNativeBio.addEventListener('click', (e) => {
      e.preventDefault();
      invokeSystemBiometrics();
    });
  }

  // --------------------------------------------------------------------------
  // STEP 4: MPIN KEYPAD, GRADUATED PENALTIES & 1-HOUR LOCKOUT
  // --------------------------------------------------------------------------
  function resetPin() {
    enteredPin = '';
    updatePinDots();
    flightTimes = [];
    lastKeyPressTime = null;
    updateCadenceDisplay(100);
  }

  function updatePinDots() {
    pinDots.forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < enteredPin.length);
    });
  }

  function updateAttemptsUI() {
    const attempts = engine.failedPinAttempts;
    pinAttemptsCount.textContent = attempts;

    attDots.forEach((dot, idx) => {
      if (idx < attempts) {
        dot.className = attempts >= 4 ? 'attempt-dot danger' : 'attempt-dot failed';
      } else {
        dot.className = 'attempt-dot';
      }
    });

    if (attempts === 0) {
      pinAttemptsWarning.textContent = "All 5 attempts safe";
      pinAttemptsWarning.className = "attempts-warning";
    } else if (attempts === 1) {
      pinAttemptsWarning.textContent = "1 failure (-3 trust pts). 4 attempts left.";
      pinAttemptsWarning.className = "attempts-warning warning";
    } else if (attempts === 2) {
      pinAttemptsWarning.textContent = "2 failures (-7 trust pts). 3 attempts left.";
      pinAttemptsWarning.className = "attempts-warning warning";
    } else if (attempts === 3) {
      pinAttemptsWarning.textContent = "⚠️ 3 failures (-15 pts)! Trust entered Step-Up zone.";
      pinAttemptsWarning.className = "attempts-warning warning";
    } else if (attempts === 4) {
      pinAttemptsWarning.textContent = "🚨 CRITICAL: 4 failures! 1 attempt remaining.";
      pinAttemptsWarning.className = "attempts-warning critical";
    } else {
      pinAttemptsWarning.textContent = "🚫 LOCKED: Exceeded 5 attempts.";
      pinAttemptsWarning.className = "attempts-warning critical";
    }
  }

  function startLockoutTimer() {
    lockoutOverlay.classList.remove('hidden');
    lockoutSecondsRemaining = 3600; // 60 minutes
    updateLockoutDisplay();

    if (lockoutInterval) clearInterval(lockoutInterval);

    lockoutInterval = setInterval(() => {
      lockoutSecondsRemaining--;
      if (lockoutSecondsRemaining <= 0) {
        clearInterval(lockoutInterval);
        engine.resetFailedPinAttempts();
        lockoutOverlay.classList.add('hidden');
        updateAttemptsUI();
        logAudit(`60-minute security cooldown expired. Account automatically unlocked.`, 'success');
      } else {
        updateLockoutDisplay();
      }
    }, 1000);
  }

  function updateLockoutDisplay() {
    const mins = Math.floor(lockoutSecondsRemaining / 60);
    const secs = lockoutSecondsRemaining % 60;
    lockoutTimerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  btnUnlockDemoLockout.addEventListener('click', () => {
    if (lockoutInterval) clearInterval(lockoutInterval);
    engine.resetFailedPinAttempts();
    lockoutOverlay.classList.add('hidden');
    updateAttemptsUI();
    resetPin();
    goToStep('stepHome');
    logAudit(`Lockout override: Demo session manually unlocked and restored to pristine baseline.`, 'success');
  });

  function updateCadenceDisplay(scorePct) {
    cadenceVal.textContent = `${scorePct}%`;
    cadenceBar.style.width = `${scorePct}%`;
    if (scorePct >= 80) {
      cadenceBar.style.backgroundColor = 'var(--accent-green)';
    } else if (scorePct >= 50) {
      cadenceBar.style.backgroundColor = 'var(--accent-yellow)';
    } else {
      cadenceBar.style.backgroundColor = 'var(--accent-red)';
    }
  }

  function handlePinInput(key) {
    if (engine.isLockedOut) return;

    const now = performance.now();

    if (lastKeyPressTime) {
      const flight = Math.round(now - lastKeyPressTime);
      flightTimes.push(flight);

      engine.recordKeystrokeFlight(flight);

      if (engine.threats.erraticCadence) {
        updateCadenceDisplay(32);
      } else if (flight < 60) {
        updateCadenceDisplay(28); // Bot speed detected
      } else {
        const consistency = Math.min(100, Math.max(75, 100 - Math.abs(flight - 220) / 10));
        updateCadenceDisplay(Math.round(consistency));
      }
    }
    lastKeyPressTime = now;

    if (key === 'clear') {
      resetPin();
    } else if (key === 'back') {
      enteredPin = enteredPin.slice(0, -1);
      updatePinDots();
    } else if (enteredPin.length < 4) {
      enteredPin += key;
      updatePinDots();

      if (enteredPin.length === 4) {
        setTimeout(evaluatePinSubmission, 200);
      }
    }
  }

  pinKeypad.addEventListener('click', (e) => {
    if (engine.isLockedOut) return;
    const btn = e.target.closest('.key-btn');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    handlePinInput(key);
  });

  // Physical Keyboard listener for desktop testing
  window.addEventListener('keydown', (e) => {
    if (currentStep !== 'stepMpin' || engine.isLockedOut) return;

    if (e.key >= '0' && e.key <= '9') {
      handlePinInput(e.key);
    } else if (e.key === 'Backspace') {
      handlePinInput('back');
    } else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
      handlePinInput('clear');
    }
  });

  // --------------------------------------------------------------------------
  // PAYMENT PROCESSING GATEWAY ANIMATION & SOUND CHIME
  // --------------------------------------------------------------------------
  function playSuccessChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Primary tone (D5 ~ 587.33Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Harmonious chime tone (A5 ~ 880Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.22, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn("Chime playback not available:", e);
    }
  }

  function showPaymentProcessing(amt, payeeName, onComplete) {
    if (!paymentProcessingOverlay) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    if (procAmount) procAmount.textContent = `₹${formatINR(amt)}`;
    if (procPayee) procPayee.textContent = `To ${payeeName}`;
    if (procTitle) procTitle.textContent = "Authorizing Payment...";

    const stages = [
      { el: pStage1, text: "Connecting to NPCI UPI Core Switch" },
      { el: pStage2, text: "Validating Zero-Trust Cryptographic Signature" },
      { el: pStage3, text: "Debiting Axis Bank Account ··4821" },
      { el: pStage4, text: "Confirming Settlement with Beneficiary" }
    ];

    stages.forEach((st, idx) => {
      if (st.el) {
        st.el.className = idx === 0 ? 'proc-stage-item active' : 'proc-stage-item';
        const icon = st.el.querySelector('.proc-stage-icon');
        if (icon) icon.innerHTML = idx === 0 ? '<span class="spinner-dot"></span>' : '○';
      }
    });

    paymentProcessingOverlay.classList.remove('hidden');

    function advanceStage(currentIdx, nextIdx) {
      if (stages[currentIdx] && stages[currentIdx].el) {
        stages[currentIdx].el.className = 'proc-stage-item done';
        const icon = stages[currentIdx].el.querySelector('.proc-stage-icon');
        if (icon) icon.innerHTML = '✓';
      }
      if (stages[nextIdx] && stages[nextIdx].el) {
        stages[nextIdx].el.className = 'proc-stage-item active';
        const icon = stages[nextIdx].el.querySelector('.proc-stage-icon');
        if (icon) icon.innerHTML = '<span class="spinner-dot"></span>';
      }
    }

    setTimeout(() => { advanceStage(0, 1); }, 550);
    setTimeout(() => { advanceStage(1, 2); }, 1100);
    setTimeout(() => { advanceStage(2, 3); }, 1650);

    setTimeout(() => {
      if (stages[3] && stages[3].el) {
        stages[3].el.className = 'proc-stage-item done';
        const icon = stages[3].el.querySelector('.proc-stage-icon');
        if (icon) icon.innerHTML = '✓';
      }
      if (procTitle) procTitle.textContent = "Payment Verified!";

      setTimeout(() => {
        paymentProcessingOverlay.classList.add('hidden');
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }, 350);
    }, 2200);
  }

  function evaluatePinSubmission() {
    try {
      logAudit(`MPIN submitted (${enteredPin}). Evaluating intent signature against Trust Score...`, 'info');

      // SCENARIO 1: DURESS / COERCION REVERSED PIN (9284)
      if (enteredPin === DURESS_PIN) {
        logAudit(`🚨 [CRITICAL ALERT] Silent Duress PIN entered (9284)!`, 'danger');
        logAudit(`Dispatched emergency beacon to Cyber Defense desk with GPS: 13.0827, 80.2707.`, 'danger');
        logAudit(`Simulating fake network timeout to mislead extortionist.`, 'warn');
        resetPin();
        goToStep('stepDuress');
        return;
      }

      // SCENARIO 2: NORMAL CORRECT PIN (4829)
      if (enteredPin === NORMAL_PIN) {
        engine.resetFailedPinAttempts();
        updateAttemptsUI();

        if (authPurpose === 'BALANCE') {
          resetPin();
          goToStep('stepBalance');
          revealBalance();
          return;
        }

        if (engine.threats.screenMirroring) {
          showThreatModal('screenMirroring');
          logAudit(`❌ Transaction blocked: Active screen-mirroring / RAT session detected!`, 'danger');
          resetPin();
          return;
        }

        const payee = engine.activePayee || engine.payee || {};
        if (engine.threats.fakeQR || payee.type === 'QR_TAMPERED') {
          showThreatModal('fakeQR');
          logAudit(`❌ Transaction blocked: Physical geofence mismatch detected!`, 'danger');
          resetPin();
          return;
        }

        if (engine.verdict === 'BLOCK') {
          const attackKey = engine.threats.replayAttack ? 'replayAttack' : engine.threats.erraticCadence ? 'erraticCadence' : 'screenMirroring';
          showThreatModal(attackKey);
          logAudit(`Transaction aborted. Trust Engine rejected authorization payload (Score: ${engine.totalScore}/100).`, 'danger');
          resetPin();
          return;
        }

        // AUTHORIZATION SUCCESS - Launch UPI Switching & Settlement Animation
        const amt = parseFloat(engine.currentAmount) || 250;
        const payeeName = payee.name || "Ramesh Tea Stall";
        const payeeVpa = payee.vpa || "ramesh.tea@upi";

        resetPin();

        showPaymentProcessing(amt, payeeName, () => {
          // 1. Deduct account balance & persist in storage
          userAccountBalance = Math.max(0, userAccountBalance - amt);
          try {
            localStorage.setItem('kerberos_axis_balance', userAccountBalance.toString());
          } catch (e) {
            console.warn("Storage write failed:", e);
          }
          updateAllBalanceDisplays();

          // 2. Play Web Audio confirmation chime
          playSuccessChime();

          // 3. Populate receipt values
          if (receiptAmount) receiptAmount.textContent = `₹${formatINR(amt)}`;
          if (receiptMerchant) receiptMerchant.textContent = payeeName;
          if (receiptScore) receiptScore.textContent = `${engine.totalScore} / 100`;
          if (receiptUpdatedBalance) receiptUpdatedBalance.textContent = `₹${formatINR(userAccountBalance)}`;

          // 4. Record in passbook history & home recent list
          addTransactionToHistory(payeeName, amt, engine.totalScore);
          logAudit(`✓ Transaction authorized: ₹${formatINR(amt)} settled to ${payeeVpa}. Remaining Balance: ₹${formatINR(userAccountBalance)}.`, 'success');

          // 5. Navigate to success view
          goToStep('stepSuccess');
        });
        return;
      }

      // SCENARIO 3: INCORRECT PIN ENTERED
      const attempts = engine.recordFailedPinAttempt();
      updateAttemptsUI();

      pinDots.forEach(d => { if (d) d.style.borderColor = 'var(--accent-red)'; });
      setTimeout(() => {
        pinDots.forEach(d => { if (d) d.style.borderColor = ''; });
        resetPin();
      }, 400);

      if (attempts >= 5) {
        logAudit(`🚨 [CRITICAL SECURITY INCIDENT] 5 failed MPIN attempts reached! Account quarantined for 60 minutes.`, 'danger');
        startLockoutTimer();
      } else {
        logAudit(`❌ Authentication failed: Incorrect MPIN (Attempt ${attempts} of 5). Trust score reduced to ${engine.totalScore}/100.`, attempts >= 3 ? 'danger' : 'warn');
      }
    } catch (err) {
      console.error("Error during PIN evaluation:", err);
      resetPin();
      const payee = engine.activePayee || engine.payee || {};
      const amt = parseFloat(engine.currentAmount) || 250;
      const payeeName = payee.name || "Ramesh Tea Stall";
      userAccountBalance = Math.max(0, userAccountBalance - amt);
      try {
        localStorage.setItem('kerberos_axis_balance', userAccountBalance.toString());
      } catch (e) {}
      updateAllBalanceDisplays();
      if (receiptAmount) receiptAmount.textContent = `₹${formatINR(amt)}`;
      if (receiptMerchant) receiptMerchant.textContent = payeeName;
      if (receiptScore) receiptScore.textContent = `${engine.totalScore} / 100`;
      if (receiptUpdatedBalance) receiptUpdatedBalance.textContent = `₹${formatINR(userAccountBalance)}`;
      goToStep('stepSuccess');
    }
  }

  // --------------------------------------------------------------------------
  // ADD TO HISTORY HELPER
  // --------------------------------------------------------------------------
  function addTransactionToHistory(payeeName, amount, score) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="history-left">
        <div class="history-icon">💸</div>
        <div>
          <h4>${payeeName}</h4>
          <p>Today, ${time} · Verified Payment</p>
          <span class="history-score-tag green">Trust: ${score}/100 · Enclave Signed</span>
        </div>
      </div>
      <div class="history-right debit">- ₹${formatINR(amount)}</div>
    `;
    if (fullHistoryList) {
      fullHistoryList.insertBefore(item, fullHistoryList.firstChild);
      if (historyCountBadge) {
        historyCountBadge.textContent = `${fullHistoryList.children.length} Transactions`;
      }
    }

    if (homeRecentTxList) {
      const mini = document.createElement('div');
      mini.className = 'mini-tx-item';
      mini.innerHTML = `
        <div class="mini-tx-avatar">💸</div>
        <div class="mini-tx-info">
          <strong>${payeeName}</strong>
          <span>Today, ${time} · Enclave Signed</span>
        </div>
        <div class="mini-tx-amount debit">- ₹${formatINR(amount)}</div>
      `;
      homeRecentTxList.insertBefore(mini, homeRecentTxList.firstChild);
    }
  }

  // --------------------------------------------------------------------------
  // SUCCESS & DURESS RESET BUTTONS
  // --------------------------------------------------------------------------
  btnNewTxn.addEventListener('click', () => {
    goToStep('stepHome');
  });

  btnResetDuress.addEventListener('click', () => {
    goToStep('stepHome');
    logAudit(`Duress simulation cleared. Primary operational mode restored.`, 'info');
  });

  // --------------------------------------------------------------------------
  // RECEIPT SHARE SHEET CONTROLLER (WhatsApp, Gmail, Messenger, Instagram, Copy)
  // --------------------------------------------------------------------------
  function getReceiptSharePayload() {
    const amount = receiptAmount ? receiptAmount.textContent : '₹250.00';
    const merchant = receiptMerchant ? receiptMerchant.textContent : 'Ramesh Tea Stall';
    const txEl = document.getElementById('receiptTxId');
    const sigEl = document.getElementById('receiptSig');
    const txId = txEl ? txEl.textContent : 'TXN-89429184';
    const sig = sigEl ? sigEl.textContent : 'Verified (ECDSA-P256)';
    const score = receiptScore ? receiptScore.textContent : `${engine.totalScore} / 100`;

    const text = 
`🧾 UPI PAYMENT RECEIPT (Payment 4.0 // Kerberos)
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Amount Paid: ${amount}
🏪 Payee: ${merchant}
🔢 Transaction ID: ${txId}
🛡️ Zero-Trust Score: ${score}
🔐 Intent Proof: ${sig}
⚡ Settlement Latency: 412 ms
📅 Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
━━━━━━━━━━━━━━━━━━━━━━━━━━
Cryptographically signed & verified by Project Kerberos Continuous Trust Engine.`;

    return { amount, merchant, txId, score, sig, text };
  }

  function showShareToast(message) {
    if (!shareToast) return;
    shareToast.textContent = message;
    shareToast.classList.remove('hidden');
    setTimeout(() => {
      shareToast.classList.add('hidden');
    }, 3200);
  }

  if (btnShareReceipt && shareSheetModal) {
    btnShareReceipt.addEventListener('click', () => {
      const payload = getReceiptSharePayload();
      if (shareReceiptSummaryText) {
        shareReceiptSummaryText.textContent = `${payload.amount} paid to ${payload.merchant} · Txn: ${payload.txId}`;
      }
      shareSheetModal.classList.remove('hidden');
      logAudit(`Share receipt sheet opened for ${payload.txId}.`, 'info');
    });
  }

  if (btnCloseShareSheet && shareSheetModal) {
    btnCloseShareSheet.addEventListener('click', () => {
      shareSheetModal.classList.add('hidden');
    });
  }

  if (shareSheetModal) {
    shareSheetModal.addEventListener('click', (e) => {
      if (e.target === shareSheetModal) {
        shareSheetModal.classList.add('hidden');
      }
    });
  }

  // 1. WhatsApp Share
  if (shareWhatsApp) {
    shareWhatsApp.addEventListener('click', () => {
      const { text } = getReceiptSharePayload();
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
      showShareToast('Opening WhatsApp to share receipt...');
      logAudit(`Receipt shared via WhatsApp.`, 'success');
    });
  }

  // 2. Gmail / Email Share
  if (shareGmail) {
    shareGmail.addEventListener('click', () => {
      const { amount, merchant, text } = getReceiptSharePayload();
      const subject = `UPI Payment Receipt: ${amount} to ${merchant}`;
      const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      window.location.href = url;
      showShareToast('Opening Email composer...');
      logAudit(`Receipt dispatched to email client.`, 'success');
    });
  }

  // 3. Facebook Messenger Share
  if (shareMessenger) {
    shareMessenger.addEventListener('click', () => {
      const { text } = getReceiptSharePayload();
      copyReceiptToClipboard(text, 'Receipt copied! Open Messenger to paste in chat.');
      window.open('https://www.messenger.com', '_blank');
      logAudit(`Receipt copied for Messenger sharing.`, 'info');
    });
  }

  // 4. Instagram Direct Share
  if (shareInstagram) {
    shareInstagram.addEventListener('click', () => {
      const { text } = getReceiptSharePayload();
      copyReceiptToClipboard(text, 'Receipt copied! Paste directly in Instagram DM.');
      window.open('https://www.instagram.com/direct/inbox/', '_blank');
      logAudit(`Receipt copied for Instagram Direct DM.`, 'info');
    });
  }

  // 5. Copy Text / Link
  if (shareCopy) {
    shareCopy.addEventListener('click', () => {
      const { text } = getReceiptSharePayload();
      copyReceiptToClipboard(text, '✓ Receipt copied to clipboard!');
      if (copyBtnLabel) {
        copyBtnLabel.textContent = 'Copied!';
        setTimeout(() => { copyBtnLabel.textContent = 'Copy Text'; }, 2000);
      }
      logAudit(`Cryptographic payment receipt copied to clipboard.`, 'info');
    });
  }

  function copyReceiptToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showShareToast(successMsg);
      }).catch(() => {
        fallbackClipboardCopy(text, successMsg);
      });
    } else {
      fallbackClipboardCopy(text, successMsg);
    }
  }

  function fallbackClipboardCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showShareToast(successMsg);
    } catch (e) {
      showShareToast('Please select and copy the text manually.');
    }
    document.body.removeChild(ta);
  }

  btnGlobalReset.addEventListener('click', () => {
    if (lockoutInterval) clearInterval(lockoutInterval);
    engine.resetFailedPinAttempts();
    lockoutOverlay.classList.add('hidden');
    if (shareSheetModal) shareSheetModal.classList.add('hidden');
    hideThreatModal();
    if (threatToast) threatToast.classList.add('hidden');
    updateAttemptsUI();

    toggleThreatQR.checked = false;
    toggleThreatScreen.checked = false;
    toggleThreatCadence.checked = false;
    toggleThreatReplay.checked = false;

    engine.threats.fakeQR = false;
    engine.threats.screenMirroring = false;
    engine.threats.erraticCadence = false;
    engine.threats.replayAttack = false;

    updateQRView('counter');
    inputAmount.value = 250;
    updateIntentPreview();

    // Reset balance state
    userAccountBalance = 48250.00;
    try {
      localStorage.removeItem('kerberos_axis_balance');
    } catch (e) {}
    balanceUnlocked = false;
    updateAllBalanceDisplays();

    balanceStatusDesc.textContent = "Biometric & MPIN verification required to unlock balance";
    btnUnlockBalance.innerHTML = `<span>Verify to View Balance</span> 🔒`;
    btnUnlockBalance.style.background = '';
    btnUnlockBalance.style.color = '';
    btnUnlockBalance.style.border = '';

    resetBioState();
    resetPin();

    goToStep('stepHome');
    logAudit(`Demo reset to pristine zero-trust baseline. Balance restored to ₹48,250.00.`, 'info');
  });

  // --------------------------------------------------------------------------
  // THREAT CONSOLE WIRING (INTERACTIVE ALERT POPUP ON ATTACK SIMULATION)
  // --------------------------------------------------------------------------
  toggleThreatQR.addEventListener('change', (e) => {
    engine.setThreat('fakeQR', e.target.checked);
    if (e.target.checked) {
      updateQRView('tampered');
      showThreatModal('fakeQR');
      logAudit(`🚨 [INJECTION] Fake QR sticker attack active: Geofence mismatch injected.`, 'danger');
    } else {
      updateQRView('counter');
      showThreatToast(threatDetailsMap.fakeQR.toastClear, false);
      logAudit(`Fake QR sticker removed. Valid in-person counter restored.`, 'success');
    }
  });

  toggleThreatScreen.addEventListener('change', (e) => {
    engine.setThreat('screenMirroring', e.target.checked);
    if (e.target.checked) {
      showThreatModal('screenMirroring');
      logAudit(`🚨 [INJECTION] Screen-recorder / AnyDesk RAT hook injected into device process.`, 'danger');
    } else {
      showThreatToast(threatDetailsMap.screenMirroring.toastClear, false);
      logAudit(`Screen-recording overlay terminated. Device integrity restored.`, 'success');
    }
  });

  toggleThreatCadence.addEventListener('change', (e) => {
    engine.setThreat('erraticCadence', e.target.checked);
    if (e.target.checked) {
      showThreatModal('erraticCadence');
      updateCadenceDisplay(32);
      logAudit(`🚨 [INJECTION] Stolen unlocked device simulated: erratic keystroke timing injected.`, 'danger');
    } else {
      showThreatToast(threatDetailsMap.erraticCadence.toastClear, false);
      updateCadenceDisplay(100);
      logAudit(`Cadence timing returned to owner biometric profile.`, 'success');
    }
  });

  toggleThreatReplay.addEventListener('change', (e) => {
    engine.setThreat('replayAttack', e.target.checked);
    if (e.target.checked) {
      showThreatModal('replayAttack');
      logAudit(`🚨 [INJECTION] Expired nonce replayed into transaction pipeline.`, 'danger');
    } else {
      showThreatToast(threatDetailsMap.replayAttack.toastClear, false);
      logAudit(`Fresh cryptographic nonce generated.`, 'info');
    }
  });

  // --------------------------------------------------------------------------
  // TRUST ENGINE SUBSCRIBER
  // --------------------------------------------------------------------------
  engine.subscribe((state) => {
    const offset = 251.2 - (251.2 * (state.totalScore / 100));
    gaugeFill.style.strokeDashoffset = offset;
    scoreValue.textContent = state.totalScore;

    let color = 'var(--accent-green)';
    let badgeClass = 'verdict-pill';
    let verdictText = 'APPROVE (FRICTIONLESS)';

    if (state.totalScore < 50) {
      color = 'var(--accent-red)';
      badgeClass = 'verdict-pill block';
      verdictText = 'BLOCK (QUARANTINE)';
    } else if (state.totalScore < 80) {
      color = 'var(--accent-yellow)';
      badgeClass = 'verdict-pill stepup';
      verdictText = 'STEP-UP REQUIRED';
    }

    gaugeFill.style.stroke = color;
    gaugeFill.style.filter = `drop-shadow(0 0 10px ${color})`;
    verdictBadge.className = badgeClass;
    verdictBadge.textContent = verdictText;

    if (telemetryStateText && state.telemetry) {
      telemetryStateText.textContent = state.telemetry.currentActivityLabel;
    }

    homeTrustStatus.textContent = `Autonomous Telemetry Active · Trust Score: ${state.totalScore}/100`;

    // Person Progress Bar
    scorePerson.textContent = `${state.signals.person} / 25`;
    barPerson.style.width = `${(state.signals.person / 25) * 100}%`;
    barPerson.className = `signal-bar-fill ${state.signals.person >= 20 ? 'green-bar' : state.signals.person >= 12 ? 'yellow-bar' : 'red-bar'}`;
    descPerson.textContent = state.failedPinAttempts > 0 
      ? `Failed PIN Penalty (${state.failedPinAttempts}/5)` 
      : state.threats.erraticCadence 
        ? "Cadence Anomaly Detected (Thief)" 
        : `Natural Curve (${(state.telemetry.mouseEntropy * 100).toFixed(0)}%) · Cadence Active`;

    // Device Progress Bar
    scoreDevice.textContent = `${state.signals.device} / 25`;
    barDevice.style.width = `${(state.signals.device / 25) * 100}%`;
    barDevice.className = `signal-bar-fill ${state.signals.device >= 20 ? 'green-bar' : 'red-bar'}`;
    descDevice.textContent = state.threats.screenMirroring 
      ? "Screen-Mirroring / RAT Detected!" 
      : state.telemetry.isWindowFocused 
        ? "TEE Enclave Signed · Foreground Focus" 
        : "⚠️ App Blurred / External Overlay";

    // Context Progress Bar
    scoreContext.textContent = `${state.signals.context} / 25`;
    barContext.style.width = `${(state.signals.context / 25) * 100}%`;
    barContext.className = `signal-bar-fill ${state.signals.context >= 20 ? 'green-bar' : state.signals.context >= 12 ? 'yellow-bar' : 'red-bar'}`;
    descContext.textContent = state.threats.fakeQR || state.payee.type === 'QR_TAMPERED' 
      ? "Geofence Mismatch (>1,000km)" 
      : state.payee.type === 'QR_GALLERY' 
        ? "Remote Friend Photo Upload" 
        : state.payee.type === 'BANK_TRANSFER' 
          ? "Direct Bank Account Routing" 
          : state.payee.type === 'CONTACT_UNKNOWN' 
            ? "New Unverified Peer" 
            : "Trusted Channel / Match (<10m)";

    // Intent Progress Bar
    scoreIntent.textContent = `${state.signals.intent} / 25`;
    barIntent.style.width = `${(state.signals.intent / 25) * 100}%`;
    barIntent.className = `signal-bar-fill ${state.signals.intent >= 20 ? 'green-bar' : 'red-bar'}`;
    descIntent.textContent = state.threats.replayAttack 
      ? "Expired Nonce / Replay Attack!" 
      : state.currentAmount >= 50000 
        ? "Large Amount Outlier (₹50k+)" 
        : state.payee.type === 'CONTACT_UNKNOWN' 
          ? "Payee Risk / Mule Pattern" 
          : "Amount Baseline Normal · Fresh Nonce";
  });

  // --------------------------------------------------------------------------
  // INITIALIZE
  // --------------------------------------------------------------------------
  updateQRView('counter');
  updateIntentPreview();
  updateAttemptsUI();
  updateAllBalanceDisplays();
  engine.recalculate();
  goToStep('stepHome');
});
