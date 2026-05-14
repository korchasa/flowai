# Firewall Template (init-firewall.sh)

Based on Anthropic's official reference implementation. Default-deny policy with allowlisted domains.

## Template

```bash
#!/usr/bin/env bash
set -euo pipefail

# Default-deny firewall for devcontainer
# Allows only essential services for AI-assisted development

echo "Initializing firewall..."

# Flush existing rules
iptables -F
iptables -X
ipset destroy 2>/dev/null || true

# Default policy: DROP everything
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow DNS (required for domain resolution)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Allow SSH (for git operations)
iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT

# Create ipset for allowed domains
ipset create allowed_hosts hash:ip

# Resolve and add allowed domains
ALLOWED_DOMAINS=(
  # Claude API
  "api.anthropic.com"
  "claude.ai"
  "statsig.anthropic.com"
  # npm registry
  "registry.npmjs.org"
  # GitHub
  "api.github.com"
  "github.com"
  "objects.githubusercontent.com"
  "raw.githubusercontent.com"
  # Deno (add if Deno stack)
  # "deno.land"
  # "jsr.io"
  # "dl.deno.land"
  # PyPI (add if Python stack)
  # "pypi.org"
  # "files.pythonhosted.org"
  # Go proxy (add if Go stack)
  # "proxy.golang.org"
  # "sum.golang.org"
  # Crates.io (add if Rust stack)
  # "crates.io"
  # "static.crates.io"
)

for domain in "${ALLOWED_DOMAINS[@]}"; do
  # Skip comments
  [[ "$domain" =~ ^# ]] && continue
  for ip in $(dig +short "$domain" 2>/dev/null | grep -E '^[0-9]+\.' || true); do
    ipset add allowed_hosts "$ip" 2>/dev/null || true
  done
done

# Allow HTTPS to allowlisted IPs
iptables -A OUTPUT -p tcp --dport 443 -m set --match-set allowed_hosts dst -j ACCEPT

# Allow HTTP to allowlisted IPs (some registries redirect)
iptables -A OUTPUT -p tcp --dport 80 -m set --match-set allowed_hosts dst -j ACCEPT

echo "Firewall initialized. Default-deny with $(ipset list allowed_hosts | grep -c '^[0-9]') allowed IPs."

# Verification — WARN only, never fail the hook.
# init-firewall.sh runs on every container start via postStartCommand.
# A hard `exit 1` here would make every start fail in any environment where
# a corporate proxy/captive portal answers example.com (or where the image
# hasn't refreshed its resolver cache). Report inconsistencies and move on —
# the real security boundary is iptables, not the self-check.
echo "Verification:"
if curl -sf --max-time 5 https://api.anthropic.com > /dev/null 2>&1; then
  echo "  [OK] anthropic API reachable"
else
  echo "  [WARN] anthropic API not reachable (may need IP refresh)"
fi
if curl -sf --max-time 5 https://example.com > /dev/null 2>&1; then
  echo "  [WARN] example.com reachable — expected DROP. Check iptables/ipset state."
else
  echo "  [OK] example.com blocked"
fi
```

## Limitations

**DNS rotation**: The allowlist resolves domain names to IPs once at container start (`dig +short`). Domains behind CDNs (Cloudflare, Fastly) rotate IPs with short TTLs — resolved IPs may become stale during the session, causing intermittent connection failures. This is a best-effort egress filter, not a hard security boundary. If the user reports random timeouts to allowed domains, re-running `sudo /usr/local/bin/init-firewall.sh` refreshes the IP set.

**`hash:ip` only**: The ipset stores individual IPs, not CIDR ranges. High-traffic CDN domains may resolve to dozens of IPs across requests; `dig +short` captures only the set visible at resolution time.

## Customization

Uncomment domain blocks in `ALLOWED_DOMAINS` based on project stack. The agent should:

1. Detect the project stack
2. Uncomment the relevant domain block
3. Add any project-specific domains the user requests

## devcontainer.json Requirements

When firewall is enabled, add to devcontainer.json:
```jsonc
{
  "runArgs": ["--cap-add=NET_ADMIN", "--cap-add=NET_RAW"],
  // Object form — must preserve other postStartCommand entries (e.g. git safe.directory).
  // See devcontainer-template.md § With Firewall for the full merged form.
  "postStartCommand": {
    "git-safe": "git config --global --add safe.directory ${containerWorkspaceFolder}",
    "firewall": "sudo /usr/local/bin/init-firewall.sh"
  }
}
```
