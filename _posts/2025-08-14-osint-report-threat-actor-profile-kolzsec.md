---
title: "OSINT Report: Threat Actor Profile - KOLzSec Cyber Activities"
description: "OSINT profile of KOLzSec, a hacktivist group defacing and DDoSing Thai government sites, linked to NXBBSEC, AnonSecKH, and allied Southeast Asian collectives."
date: 2025-08-14 09:00:00 +0000
categories: [OSINT]
tags: [osint, threat-intel, hacktivism]
difficulty: Medium
image: /assets/img/osint/kolzsec/image.png
---

## Overview

KOLzSec, identified as a hacktivist group, appears to be actively engaged in cyber operations targeting governmental and institutional websites, primarily in Thailand. The group operates under the handle "@KOLzSec" and is associated with other hacking collectives such as #NXBBSEC, #AnonSecKH, #blackcyber, and #NullSec Philippines. The data suggests a coordinated effort to conduct defacements, Distributed Denial of Service (DDoS) attacks, and possibly data breaches, with a focus on promoting justice-related narratives, particularly concerning Cambodia.

![image](/assets/img/osint/kolzsec/image.png)

## Key Findings

### Types of Attacks

![image](/assets/img/osint/kolzsec/image-1.png)

- **Website Defacement (Lei$)**: Multiple instances of website defacement are reported, where the group alters the content of targeted sites to display their messages or logos. Examples include the Chiang Mai Provincial Administrative Organization site and over 100 Thai government sites.

![image](/assets/img/osint/kolzsec/image-2.png)

- **DDoS Attacks**: Evidence of DDoS attacks is present, notably the takedown of the National Broadcasting and Telecommunications Commission (NBTC) of Thailand has been down, with check-host.net reports confirming downtime.

![image](/assets/img/osint/kolzsec/image-3.png)

- **Potential Data Breaches**: References to "proofs" and "check" links suggest that the group may have accessed and exfiltrated data, though specific details on breached data are not fully disclosed in the provided messages.

### Compromised Systems

- **Governmental Websites**:
    - https://gpa.obec.go.th/ (Targeted for 50 hours)
    - https://krungthai.com/ (Top 2 Thailand bank)
    - http://chiangmaipao.go.th/ (Chiang Mai Provincial Administrative Organization)
    - https://www.mod.go.th/ (Ministry of Defense Thailand)
    - https://www.navy.mi.th/ (Navy of Thailand)
    - Over 100 Thai government sites (archived defacements)
- The group claims to have targeted these systems as part of operations like #OpThailand, indicating a strategic focus on Thai infrastructure.

### Methods of Intrusion

- **Exploitation and Defacement**: The group likely exploits vulnerabilities in web applications or servers to gain unauthorized access, followed by defacing the sites with their branding (e.g., the KOLzSec logo featuring a suit and question mark).
- **DDoS Campaigns**: Utilization of botnets or coordinated traffic to overwhelm target servers, as seen with the Ministry of Defense and official Thailand site takedowns.
- **Proof of Concept**: Links to check-host.net reports (e.g., https://check-host.net/check-report/2b9e3f11k45b) are provided to verify downtime or defacement, suggesting a methodical approach to document their attacks.

![image](/assets/img/osint/kolzsec/image-4.png)

- **Collaboration**: Mentions of #NullSec Philippines and #JusticeforCambodia indicate possible collaboration with other hacktivist groups, potentially sharing tools or resources.

### Timeline of Activities

- **2023-10-30**: Initial channel activity recorded.
- **2025-06-26**: Active messaging begins with a challenge ("If u wanna fight let's fight bro") and initial target (https://check-host.net/check-report/287694cak3d4).

![image](/assets/img/osint/kolzsec/image-5.png)

- **2025-06-27 to 2025-06-28**: Escalation with multiple targets, including banks and provincial organizations, accompanied by photo evidence.
- **2025-08-08 to 2025-08-12**: Peak activity with claims of defacing 100+ sites, targeting high-profile entities like the Ministry of Defense, and DDoS attacks, with a member "Lei$" taking credit.

### Motives and Narratives

- The group’s actions are framed around retaliatory or justice-driven motives, with hashtags like #JusticeforCambodia, #ThailandStartedTheWar, and #OpThailand suggesting a geopolitical conflict, possibly related to Cambodia-Thailand relations.
- Poetic messages (e.g., "Tides of Justice") and calls for action indicate a propagandistic element to their operations.

![image](/assets/img/osint/kolzsec/image-6.png)

### Tools and Techniques

- **Stealth Mole Tool**: Snapshots show network mapping and link analysis, indicating the use of reconnaissance tools to identify and target systems.
- **Check-Host.net**: Used for real-time verification of site availability, aiding in attack validation.
- **Media Evidence**: Photos and documents shared via Telegram channels serve as proof of compromise, though specific exploitation methods are not detailed.

### Affiliations and Membership

- **Key Individuals**: "Lei$" is highlighted as a prominent member, claiming responsibility for significant defacements.
- **Affiliated Groups**: Links to #AnonSecKH, #NXBBSEC, and #NullSec Philippines suggest a broader network of hacktivists.
- **Social Media Presence**: Active on X under @KOLzSec
    
    ![X](/assets/img/osint/kolzsec/X.png)
    

## Recommendations

- Monitor KOLzSec’s Telegram and X activities for real-time threat intelligence.
- Enhance security measures for Thai governmental websites, focusing on web application firewalls and DDoS mitigation.
- Investigate potential data breaches via the provided check-host links for forensic analysis.

## Conclusion

KOLzSec is a sophisticated hacktivist group with a clear focus on defacing and disrupting Thai governmental websites, likely as part of a broader geopolitical agenda. Their methods include defacement, DDoS attacks, and potential data breaches, supported by reconnaissance tools and collaborative efforts with other groups. The group’s activities have escalated significantly by August 2025, with claims of impacting over 100 sites, positioning them as a notable entity in the defacement community.
