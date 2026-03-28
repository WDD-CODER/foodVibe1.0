# Plan 222 — Dev Machine Open Ports Security Hardening

## Context

A port scan on the dev machine (2026-03-28) revealed four items that add unnecessary attack surface. None are emergencies, but three expose the machine beyond localhost and should be resolved before any public-facing deployment work or continued backend/security development. This plan captures what was found, why it matters, and the exact steps to fix each one.

---

## Findings & Fix Steps

### 1. Dell SupportAssist — Port 9012 (HIGH)
**Problem:** `SupportAssistAgent.exe` opens port 9012 on `0.0.0.0` — reachable from the entire LAN, not just localhost. Remote support tools are a known attack vector.

**Fix:**
1. Open `services.msc` (Win + R → `services.msc`)
2. Find **Dell SupportAssist** and **Dell SupportAssist Remediation**
3. Set Startup Type → **Disabled**
4. Click **Stop**
5. Verify: re-run `netstat -ano | grep 9012` — should return nothing

---

### 2. Unknown Port 5700 — Kernel (MEDIUM)
**Problem:** PID 4 (Windows Kernel) is listening on port 5700 on `0.0.0.0` — all interfaces. Not a standard Windows port; likely VMware, Hyper-V, or an undocumented Windows component.

**Fix:**
1. Run: `netsh http show servicepoint` to check HTTP.sys registrations
2. Run: `Get-Service | Where-Object {$_.Status -eq 'Running'}` in PowerShell to find candidates
3. If VMware: disable VMware NAT service if not in use
4. If unidentified: block port in Windows Firewall as a precaution
   - `New-NetFirewallRule -DisplayName "Block 5700" -Direction Inbound -LocalPort 5700 -Protocol TCP -Action Block`
5. Verify: re-run `netstat -ano | grep 5700`

---

### 3. MongoDB Auth — Port 27017 (MEDIUM)
**Problem:** `mongod` is localhost-only (safe from LAN), but local MongoDB installs commonly ship with no authentication. If a server-side injection ever occurs, an unauthenticated DB is wide open.

**Fix:**
1. Open `mongosh`
2. Run: `db.adminCommand({getCmdLineOpts: 1})`
3. Check output for `--auth` flag in the `argv` array
4. If missing, edit `mongod.cfg`:
   ```yaml
   security:
     authorization: enabled
   ```
5. Create an admin user if none exists, then restart mongod
6. Verify: `mongosh` without credentials should be rejected

---

### 4. SMB File Sharing — Ports 445 / 139 (LOW)
**Problem:** Classic ransomware and lateral movement entry point. Only needed if actively sharing files over the LAN.

**Fix (only if not using Windows file sharing):**
1. PowerShell (admin): `Set-SmbServerConfiguration -EnableSMB1Protocol $false`
2. Or via Windows Features → uncheck **SMB 1.0/CIFS File Sharing Support**
3. For SMB2 (port 445): only disable if zero LAN file sharing needed
4. Verify: `netstat -ano | grep -E ':445|:139'`

---

## Atomic Sub-tasks

- [ ] Disable Dell SupportAssist service in `services.msc` — verify port 9012 closed
- [ ] Identify and resolve port 5700 (VMware/Hyper-V/Windows component)
- [ ] Verify MongoDB auth enabled in `mongod.cfg` — confirm `--auth` flag present
- [ ] Evaluate SMB usage — disable if unused

---

## Verification

After completing each item:
```bash
netstat -ano | grep -E ':9012|:5700|:27017|:445|:139'
```
- **9012** — should disappear entirely
- **5700** — should disappear or be firewall-blocked
- **27017** — still present (localhost only) — verify auth via `mongosh`
- **445/139** — present only if SMB intentionally kept

---

## Notes

- No code changes required — all fixes are OS/service configuration
- No branch needed
- Revisit before any deployment or backend security work
- Memory saved at: `~/.claude/projects/C--foodCo-foodVibe1-0/memory/project_open_ports_security.md`
