﻿﻿/**
 * SkillForge Digital Error Reporter
 * Captures global errors and provides a way for users to report issues.
 */

(function() {
  // Create styles for the reporter
  const style = document.createElement('style');
  style.textContent = `
    .sf-error-modal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(4, 8, 16, 0.9);
      backdrop-filter: blur(10px);
      padding: 20px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .sf-error-modal.active {
      opacity: 1;
      pointer-events: auto;
    }
    .sf-error-content {
      background: rgba(12, 24, 41, 0.95);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 24px;
      width: 100%;
      max-width: 500px;
      padding: 32px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(245, 158, 11, 0.1);
      transform: scale(0.9);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .sf-error-modal.active .sf-error-content {
      transform: scale(1);
    }
    .sf-error-title {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      color: #f59e0b;
      font-size: 24px;
      margin-bottom: 8px;
    }
    .sf-error-desc {
      color: rgba(255,255,255,0.6);
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .sf-error-log {
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #fbbf24;
      max-height: 150px;
      overflow-y: auto;
      margin-bottom: 24px;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .sf-error-actions {
      display: flex;
      gap: 12px;
    }
    .sf-error-btn {
      flex: 1;
      padding: 14px;
      border-radius: 12px;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .sf-error-btn-primary {
      background: #f59e0b;
      color: #040810;
    }
    .sf-error-btn-primary:hover {
      background: #fbbf24;
      transform: translateY(-2px);
    }
    .sf-error-btn-secondary {
      background: rgba(255,255,255,0.05);
      color: white;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .sf-error-btn-secondary:hover {
      background: rgba(255,255,255,0.1);
    }
    .sf-report-trigger {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      background: rgba(12, 24, 41, 0.8);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #f59e0b;
      padding: 10px 16px;
      border-radius: 100px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      opacity: 0.5;
    }
    .sf-report-trigger:hover {
      opacity: 1;
      transform: translateY(-2px);
      background: #f59e0b;
      color: #040810;
    }
  `;
  document.head.appendChild(style);

  // Create Modal HTML
  const modal = document.createElement('div');
  modal.className = 'sf-error-modal';
  modal.id = 'sf-error-modal';
  modal.innerHTML = `
    <div class="sf-error-content">
      <div class="sf-error-title">System Anomaly Detected</div>
      <div class="sf-error-desc">The Command Center encountered an unexpected sequence. Copy the debug log below and send it to the administrator for analysis.</div>
      <div class="sf-error-log" id="sf-error-log">No errors captured yet.</div>
      <div class="sf-error-actions">
        <button class="sf-error-btn sf-error-btn-primary" id="sf-copy-error">
          <i class="fa-solid fa-copy"></i> Copy Debug Data
        </button>
        <button class="sf-error-btn sf-error-btn-secondary" id="sf-close-error">
          Dismiss
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Create Trigger Button
  const trigger = document.createElement('button');
  trigger.className = 'sf-report-trigger';
  trigger.innerHTML = `<i class="fa-solid fa-bug"></i> Report Hub Issue`;
  trigger.onclick = () => showErrorReport("Manual User Report: System state requested.", "", true);
  document.body.appendChild(trigger);

  const logEl = document.getElementById('sf-error-log');
  const copyBtn = document.getElementById('sf-copy-error');
  const closeBtn = document.getElementById('sf-close-error');

  function showErrorReport(errorMsg, stack = "", isCritical = false) {
    const timestamp = new Date().toISOString();
    const url = window.location.href;
    const userAgent = navigator.userAgent;
    const uid = localStorage.getItem('skillforge_mock_uid') || 'Anonymous';
    
    // Clean up the error message for the title
    let displayTitle = "System Anomaly Detected";
    let displayDesc = "The Command Center encountered an unexpected sequence. Copy the debug log below and send it to the administrator for analysis.";

    if (errorMsg.includes("permissions")) {
      displayTitle = "Access Denied";
      displayDesc = "Your neural connection does not have the required clearance for this registry node. This usually happens if you are signed out or your session has expired.";
    } else if (errorMsg.includes("Layout Engine")) {
      displayTitle = "Architecture Sync Failure";
      displayDesc = "The system failed to render the requested layout structure. This may be due to a missing template or a neural sync interruption.";
    } else if (errorMsg.includes("auth")) {
      displayTitle = "Authentication Required";
      displayDesc = "Your identity could not be verified. Please return to the login center to restore your session.";
    }

    const debugData = `--- SKILLFORGE DEBUG REPORT ---
Timestamp: ${timestamp}
URL: ${url}
User ID: ${uid}
Message: ${errorMsg}
Stack: ${stack}
UA: ${userAgent}
------------------------------`;

    console.error(`[SkillForge Error] ${errorMsg}`, stack);

    // Only show modal for critical errors or explicit manual reports
    const criticalKeywords = ['permissions', 'quota', 'auth', 'registry', 'failed to fetch', 'layout engine'];
    const isActuallyCritical = isCritical || criticalKeywords.some(kw => errorMsg.toLowerCase().includes(kw));

    if (isActuallyCritical) {
      const titleEl = modal.querySelector('.sf-error-title');
      const descEl = modal.querySelector('.sf-error-desc');
      if (titleEl) titleEl.textContent = displayTitle;
      if (descEl) descEl.innerHTML = `${displayDesc}<br><br><span style="color: #f59e0b; font-weight: bold;">Problem:</span> ${errorMsg}`;
      
      logEl.textContent = debugData;
      modal.classList.add('active');
    }
  }

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(logEl.textContent).then(() => {
      copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
      setTimeout(() => {
        copyBtn.innerHTML = `<i class="fa-solid fa-copy"></i> Copy Debug Data`;
      }, 2000);
    });
  };

  closeBtn.onclick = () => {
    modal.classList.remove('active');
  };

  // Global Error Listeners
  window.onerror = function(msg, url, lineNo, columnNo, error) {
    const stack = error ? error.stack : "No stack trace available";
    showErrorReport(`Global Error: ${msg} at ${lineNo}:${columnNo}`, stack);
    return false;
  };

  window.onunhandledrejection = function(event) {
    const error = event.reason;
    const msg = error ? (error.message || error) : "Unhandled Promise Rejection";
    const stack = error && error.stack ? error.stack : "No stack trace available";
    showErrorReport(`Async Error: ${msg}`, stack);
  };

  // Export to window for manual calls
  window.sf_report_error = showErrorReport;
  console.log("🛠️ SkillForge Error Reporter Initialized");
})();

