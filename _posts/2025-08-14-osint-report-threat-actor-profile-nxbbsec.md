---
title: "OSINT Report: Threat Actor Profile - NXBBSEC"
description: "OSINT profile of NXBBSEC, a Telegram/X-based hacktivist collective running DDoS attacks, data leaks, and system exploitation against Thai and Cambodian targets."
date: 2025-08-14 08:00:00 +0000
categories: [OSINT]
tags: [osint, threat-intel, hacktivism]
difficulty: Medium
image: /assets/img/osint/nxbbsec/image.png
---

## Overview

NXBBSEC appears to be a hacking group or collective with a significant presence on Telegram and X, focusing on cyber operations targeting various entities, primarily in Thailand and Cambodia. The group claims affiliations with entities like AnonSecKH and Black CYB3R, though they assert independence. Their activities include Distributed Denial of Service (DDoS) attacks, data leaks, and system exploitation, often publicized through social media and Telegram channels.

## Types of Attacks

1. **DDoS Attacks**:
    - NXBBSEC has conducted massive DDoS attacks, targeting Thai infrastructure such as the Electronic Resources and E-Resource Centre at Chulalongkorn University, PTT Public Company, and Quality Express Company. These attacks aim to disrupt online services, as evidenced by links to check-host.net reports showing site downtimes.
    
    ![image](/assets/img/osint/nxbbsec/image.png)
    
    - Example: Messages from June 26, 2025, detail DDoS operations under hashtags like #OpGarudaAshes and #OpThailand.
2. **Data Leaks**:
    - The group has leaked sensitive data, including a ZIP file named 763caa550916cdce55c8dfd172c9791d67997b242039bb6f880cadb2fca containing compromised data, leaked on August 13, 2025.
    
    ![image](/assets/img/osint/nxbbsec/image-1.png)
    
    - Another leak includes login credentials for the Police Road Safety - Thailand system, with a username (3501900481464) and password (1464) shared publicly.
3. **System Exploitation**:
- NXBBSEC claims to have compromised various systems, with evidence of targeting Thai governmental and institutional entities. Specific instances include the leakage of login credentials for the Police Road Safety - Thailand system on June 26, 2025, suggesting unauthorized access. Additionally, a document leak from krs.psdg-obec.go.th on August 6, 2025, indicates potential exploitation of educational or governmental systems in Thailand.
    
    ![image](/assets/img/osint/nxbbsec/image-2.png)
    
- The group also mentions ongoing operations against Cambodian systems, as seen in a Khmer-language message on August 13, 2025, ("❗️ចោសៀមពទ្ធ័លួស ដាក់កង់ឡានយកផ្ទះ ពលរដ្ឋខ្មែរ 13/8/2025"), which translates to "Siam police are putting car tires to take the house of Khmer citizens 13/8/2025," hinting at cyber activities tied to border tensions.

![image](/assets/img/osint/nxbbsec/image-3.png)

- Methods likely involve credential harvesting and exploitation of system vulnerabilities, though specific success rates remain unverified in the provided data.

## Compromised Systems and Data

- **Thailand Targets**:
    - **Chulalongkorn University**: Electronic Resources and E-Resource Centre affected by DDoS.
    - **PTT Public Company**: Targeted in DDoS operations.
    - **Quality Express Company**: Subject to DDoS attacks.
    - **Police Road Safety System**: Credentials leaked, indicating potential unauthorized access.
    - **Thailand Immigration System**: Exploited, with data potentially compromised.
    - **krs.psdg-obec.go.th**: A document leak with extensive content (truncated 652986 characters), suggesting a significant data breach.
- **Cambodia Targets**:
    - Mentions of operations against Cambodian systems, including the Ministry, under #OpThailand and #AnonSecKH hashtags.
    
    ![image](/assets/img/osint/nxbbsec/image-4.png)
    
    - A message from August 13, 2025, describes a border incident involving Cambodian citizens, possibly linked to cyber activities.
- **Data Types**:
    - Excel files, photos, and text documents are among the leaked media, with a total of 184 files and 5649 photos noted in the Telegram channel metadata.
    - Specific leaks include system credentials and large datasets (e.g., the truncated krs.psdg-obec.go.th file).

## Methods of Intrusion

- **DDoS Campaigns**: Utilized to overwhelm and take down target websites, as seen with the check-host.net downtime reports.
- **Credential Sharing**: Public dissemination of stolen login details (e.g., Police Road Safety) to enable further unauthorized access.
- **Social Engineering**: Messages suggest misinformation campaigns, with the group claiming to correct false narratives about their affiliations (e.g., with Black CYB3R).
- **Exploitation Tools**: References to exploitation systems and success rates (70% for Thailand) imply the use of sophisticated hacking tools or zero-day vulnerabilities.
- **Media Propagation**: Use of photos and documents on Telegram to showcase exploits, enhancing their visibility and impact.

## Timeline of Activities

- **June 12, 2025**: Initial message in the dataset, marking the start of monitored activity.
- **June 25, 2025**: Announcement of "NXBBSEC BACK SOON!".
- **June 26, 2025**: Multiple DDoS attacks and credential leaks targeting Thai entities.
- **August 6, 2025**: Claim of 70% exploitation of the Thailand system.
- **August 12-13, 2025**: Recent activities including data leaks (ZIP file) and border-related messages, indicating ongoing operations.

## Group Structure and Claims

- **Leadership**: A member named SAZZ claims to be the true owner and operator, as per an announcement on August 13, 2025.
    
    ![X](/assets/img/osint/nxbbsec/X.png)
    
- **Affiliations**: Denies being part of Black CYB3R but acknowledges an alliance with AnonSecKH/NXBBSEC. The group operates independently but collaborates with allied teams.
- **Membership**: The Telegram channel has 790 members, with active engagement from users like "JACKTHERIPPER" and "Bak1s".
- **X Presence**: Accounts like @NXBBSECHACKER and @NXBBSEC show suspension or leadership claims, with posts detailing operations and announcements.

![Screenshot 2025-08-13 223945](/assets/img/osint/nxbbsec/Screenshot_2025-08-13_223945.png)

![X 2](/assets/img/osint/nxbbsec/X_2.png)

## Observations

- The group uses a mix of offensive cyber tactics (DDoS, exploitation) and propaganda (misinformation correction, public shaming).

![image](/assets/img/osint/nxbbsec/image-5.png)

- Their operations are well-documented on Telegram and X, suggesting a strategy to gain notoriety.
- The focus on Thailand and Cambodia may be geopolitically motivated.

## Recommendations

- Monitor NXBBSEC Telegram channels and X accounts for real-time updates.
- Enhance security for targeted Thai and Cambodian institutions, especially around credential protection and DDoS mitigation.
- Investigate the leaked ZIP file for further insights into compromised data.
