# Hound 🐶 v1.0

Hound is an advanced information gathering tool that captures GPS coordinates, device fingerprints, camera photos/videos, and network information from target devices.

![image](https://user-images.githubusercontent.com/42796435/229538253-e0a9c811-60e4-4294-bd3b-8eb7621b51f5.png)

## What is Hound?

Hound is a tool that can remotely gather comprehensive information from a target device using a PHP server and social engineering. You can get the following information:

### GPS & Location
- Exact GPS Coordinates (Latitude, Longitude, Altitude)
- Accuracy, Speed, Heading
- Google Maps & Google Earth links

### Device Fingerprint (Super Detailed)
- User Agent, Platform, Language, Browser
- RAM, CPU Cores, Screen Resolution
- Battery Level & Charging Status
- Connection Type & Speed (4G/WiFi/etc)
- Canvas Fingerprint & Audio Fingerprint
- WebGL GPU Renderer & Vendor
- WebRTC Local IP Detection
- Touch Support, Pixel Ratio, Color Depth
- Storage Quota, Dark Mode, Timezone
- Media Devices list
- Do Not Track, Online status

### Camera Capture
- Front camera photo
- Front camera 10-second video
- Back camera photo
- Back camera 10-second video

### Network & ISP
- Public IP Address
- ISP, ASN, Organization
- Country, Region, City
- Proxy detection

## Features
- 🔒 **Multi-Tunnel Support** — Cloudflared, Serveo, LocalTunnel, or Localhost
- 🔗 **Auto URL Shortener** — Automatically shortens tunnel link via is.gd
- 📷 **Camera Capture** — Photos and 10s video from front & back cameras
- 🔍 **Super Fingerprinting** — 40+ data points including canvas, audio, WebGL
- 🛡️ **Anti-Inspect** — Blocks right-click, DevTools, View Source
- 🔐 **Payload Obfuscation** — Multi-layer hex encoding with random variable names
- 📊 **Capture Storage** — Photos & videos saved to `captures/` folder

## Tested On
- Kali Linux
- Windows (WSL)
- Termux
- MacOS
- Ubuntu
- Parrot Sec OS

## Requirements
```
apt-get -y install php unzip git wget curl
```

For LocalTunnel option, you also need Node.js/npm:
```
apt-get -y install nodejs npm
```

## Installation
```
git clone https://github.com/techchipnet/hound
cd hound
bash hound.sh
```

## Usage
1. Run `bash hound.sh`
2. Select tunnel method (1-4)
3. Share the generated link with target
4. Wait for data in terminal
5. Check `captures/` folder for photos/videos
6. Check `data.txt` for full fingerprint report

## Tunnel Options
| # | Method | Requires | HTTPS | Camera Support |
|---|--------|----------|-------|----------------|
| 1 | Cloudflared | wget | ✅ | ✅ |
| 2 | Serveo | ssh | ✅ | ✅ |
| 3 | LocalTunnel | npm/npx | ✅ | ✅ |
| 4 | Localhost | - | ❌ | ❌ |

> **Note:** Camera capture requires HTTPS. Use a tunnel (option 1-3) for full features.

## Change Log
- **v1.0:** Camera capture, super fingerprinting, multi-tunnel, URL shortener, payload obfuscation
- **v0.2:** Remove Ngrok and update cloudflared tunnel

## Disclaimer
Hound is created to help in penetration testing and it's not responsible for any misuse or illegal purposes.

Credit - Chatbot template: Masud Rana
