---
title: "OSINT Report: Threat Actor Profile - NRSTSEC"
description: "OSINT profile of NRSTSEC, a hacktivist group behind DDoS attacks, defacements, and data leaks against Thai targets from 2023-2025, tracked via Telegram and Zone-XSEC."
date: 2026-07-03 05:00:00 +0000
categories: [OSINT]
tags: [osint, threat-intel, hacktivism]
difficulty: Medium
image: /assets/img/osint/nrstsec/image.png
---

## Overview

- **Group Name**: NRSTSEC
- **Associated Email**: mneng676@gmail.com with password NRSTSEC1285
- **Activity Period**: Breaches and leaks span from 2023 to 2025, with recent activity noted in August 2025.
- **Communication Channels**: Primarily via Telegram (nrstsec_official), with additional context from leaked combo files linked to private cloud services.

## Types of Attacks

1. DDOS Attack:
    - Downed https://www.tnnthailand.com/ on August 4, 2025, with a report at https://check-host.net/check-report/2b0f9647k12f.
    
    ![image](/assets/img/osint/nrstsec/image.png)
    
    - Zone-XSEC records 11 total defacements, including homepages.
    
    ![zone-xsec](/assets/img/osint/nrstsec/zone-xsec.png)
    
2. **Data Breaches and Credential Leaks**:
    - The email mneng676@gmail.com appears across multiple compromised data sets (CDS, CB, UB), with passwords like NRSTSEC1285. This suggests a targeted or opportunistic harvesting of credentials.
    - Leaked documents (redcloud.txt, MIXED.txt, 100K CELESTIAL PRIVATE UP FROM LOGS 1.txt, etc.) contain over 100,000 credential pairs, indicating a large-scale data breach operation, potentially involving NRSTSEC or affiliated groups.
    - 93 compromised entries for mneng676@gmail.com, with passwords like nengzin1285, leaked since February 20, 2023.
    
    ![image](/assets/img/osint/nrstsec/image-1.png)
    
3. **Social Engineering**:
    - Targeted login pages (e.g., Google, GitHub) and Android URLs suggest phishing campaigns.
        
        ![image](/assets/img/osint/nrstsec/image-2.png)
        
        ![Chatlog profile](/assets/img/osint/nrstsec/Chatlog_profile.png)
        

## Compromised Systems

- **Victims**: TNN Thailand, personal accounts (Amazon, Roblox), IPs in Cambodia and Southeast Asia.
- **Systems**: Windows machines (e.g., Administrator, CH-202211021849).

## Methods of Intrusion

- **Weak Credentials**: Exploits reused passwords via brute force or stuffing.
- **Social Engineering**: Channel invites as potential phishing vectors.
- **Malware/Stealers**: Use of "Stealc" infostealer for credential extraction.
- **Defacement Tools**: Likely SQL injection or file inclusion vulnerabilities.

## Motivations and Affiliations

- **Hacktivism**: Hashtags (#Joaland, #OPTHAILAND) suggest Cambodia-Thailand conflict motives.
- **Reputation**: Rank 1366 on Zone-XSEC, public claims for notoriety.
- **Financial Gain**: Possible dark web sales or ransomware.
- **Allies**: Greetings to #NXBBSEC, #BL4ACKCYBER.

## Timeline of Key Events

- **2023-02-20**: Initial compromise of mneng676@gmail.com credentials.
- **2024-07-16 to 2025-08-05**: Increased activity, peaking in August 2025.
- **2024-06-14 to 2025-02-20**: Escalating credential leaks, with UB data showing recent activity.
- **2025-08-04**: TNN Thailand defacement, a public milestone.
- **2025-08-14**: Current date, with ongoing analysis of leaked data

## Recommendations

- **For Victims**: Enforce strong passwords, enable 2FA, monitor IPs.
- **For Researchers**: Map ANONSEC-CAMBODIA and allied groups.
