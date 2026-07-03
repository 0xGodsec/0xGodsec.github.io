---
title: "OSINT Report: Threat Actor Profile - AnonSecKH / BL4CK CYB3R"
description: "OSINT profile of AnonSecKH (aka BL4CK CYB3R / ANON-KH), a politically motivated Cambodian hacktivist group targeting Thai government, military, and financial sectors under #OpThailand2025."
date: 2026-07-03 07:00:00 +0000
categories: [OSINT]
tags: [osint, threat-intel, hacktivism]
difficulty: Medium
image: /assets/img/osint/anonseckh-bl4ck-cyb3r/image.png
---

## Overview

AnonSecKH, operating under aliases such as ANON-KH and Bl4ckCyb3r, is a politically motivated Cambodian hacktivist group. The group has intensified its activities following a border incident between Thailand and Cambodia in 2025, targeting Thai governmental, military, financial, and other sectors. They communicate and claim responsibility for attacks via Telegram channels under the Bl4ckCyb3r moniker, reflecting a coordinated effort driven by regional political disputes.

## Types of Attacks

1. **Distributed Denial of Service (DDoS) Attacks**:
    - AnonSecKH has conducted DDoS attacks to disrupt the services of Thai entities, including the Office of the Education Council, Consumer Protection Board, King Power International Group, AUCT Corporation, and various ministries (e.g., Health, Interior, Agriculture, Higher Education, Tourism, and Sports). Links to check-host.net downtime reports (e.g., https://check-host.net/check-report/2ba1bfbfk670) confirm service unavailability.
    
    ![image](/assets/img/osint/anonseckh-bl4ck-cyb3r/image.png)
    
2. **Data Leaks and Exposure**:
    - The group has leaked sensitive data, such as lists of eligible countries/territories for Thailand’s Annual International Training Course (AITC) 2023–2025 and military-related documents (e.g., Thai army ranks in vocab_soldier.pdf). This includes PDFs and CSV files (e.g., db6d6cc2-6a34-4aa5-b0e4-c7f7afe54f7b.csv), indicating access to administrative and military databases.
    
    ![image](/assets/img/osint/anonseckh-bl4ck-cyb3r/image-1.png)
    
3. **Defacement and Propaganda**:
    - Website defacements and propaganda dissemination are key tactics, with messages urging supporters to share attack claims (e.g., https://t.me/addlist/iglFGIJ-jJE1Njk9). Hashtags like #OpThailand2025 highlight their political motivation.

## Compromised Systems and Data

![image](/assets/img/osint/anonseckh-bl4ck-cyb3r/image-2.png)

![image](/assets/img/osint/anonseckh-bl4ck-cyb3r/image-3.png)

- **Thai Government and Military Targets**:
    - Attacks focus on Thai ministries and military infrastructure, with leaked data suggesting breaches into official systems managing training programs and ranks.
- **Financial and Corporate Entities**:
    - Targets like King Power International Group and AUCT Corporation indicate an expansion beyond government to financial and commercial sectors.
- **Email and Contact Lists**:
    - The 658a5a86a111a000aa48aa7781ad07512f0d2fc6621b97e03a4dbabf76c71656.txt file contains a large dataset of email addresses and IPs, likely harvested through phishing or system compromises, supporting their reconnaissance efforts.
    
    ![Email](/assets/img/osint/anonseckh-bl4ck-cyb3r/Email.png)
    

## Methods of Intrusion

1. **DDoS and Service Disruption**:
    - Utilization of DDoS techniques to overwhelm Thai government and corporate websites, as evidenced by downtime reports.
2. **Data Exfiltration**: 
    - Extraction of structured data of the 👿National Intelligence Agency (NIA) - Thailand.
    
    ![image](/assets/img/osint/anonseckh-bl4ck-cyb3r/image-4.png)
    
3. **Social Media and Telegram Coordination**:
    - The group leverages Telegram and Twitter for real-time updates, alliance building, and propaganda, using handles like anon_kh89.
    
    ![image](/assets/img/osint/anonseckh-bl4ck-cyb3r/image-5.png)
    

## Network and Affiliations

- **Alliances**:
    - AnonSecKH has formed a cyber alliance with groups like CyberWarriors Team and Anonymous Cyber Error System, as announced in the BLACK CYB3R channel, enhancing their operational capacity.
- **Stealth Mole Analysis**:
    - Network maps show connections to Telegram messages, media, and external links (e.g., https://twitter.com/kh872), indicating a decentralized yet interconnected structure.
    
    ![image](/assets/img/osint/anonseckh-bl4ck-cyb3r/image-6.png)
    

## Timeline of Activities

- **2025 Border Incident**: Triggered heightened activity targeting Thailand.
- **June 2025**: Rebirth announcement and initial Thai entity attacks.
- **August 2025**: Escalation with data leaks (August 11–12) and ministry-targeted DDoS, aligning with #OpThailand2025.

## Motivation

- The group’s actions are politically driven, stemming from the 2025 Thailand-Cambodia border incident. Their attacks aim to disrupt Thai infrastructure and publicize their stance on regional disputes.

## Conclusion

AnonSecKH (Bl4ckCyb3r) is a Cambodian hacktivist group executing politically motivated cyberattacks against Thailand, focusing on DDoS, data leaks, and defacement. Their sophisticated methods, alliance network, and use of Telegram for coordination suggest a well-organized entity with potential for further escalation. Continuous monitoring of their Telegram channel and affiliated sites (e.g., h3c4kedz.com) is advised for threat mitigation.
