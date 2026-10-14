# Zameen Converter — Land Area Data Sources & Verification Guide

This document lists the official state revenue references, manuals, and statutory acts used to populate `units.json`. Any record with `verified: false` is flagged for field verification before production release.

---

## 1. Universal Units (Statutory & International)
- **Square Feet (sq ft)**: Base unit for system calculations.
- **Square Yard / Gaj (sq yd)**: $1\text{ sq yd} = 3\text{ ft} \times 3\text{ ft} = 9\text{ sq ft}$. Standard in urban plot development across Northern & Western India.
- **Square Metre (sq m)**: $1\text{ sq m} = \left(\frac{1}{0.3048}\right)^2 \approx 10.7639104\text{ sq ft}$. Bureau of Indian Standards (BIS) / International SI standard.
- **Acre**: 43,560 sq ft ($4,840\text{ sq yd}$). Standard British Imperial and Indian National agricultural record unit.
- **Hectare**: 10,000 sq m $\approx 107,639.104\text{ sq ft} \approx 2.47105\text{ acres}$. Official survey unit for digitized land records (Bhoomi, Bhulekh, AnyRoR).

---

## 2. State-Wise Revenue Records & Sources

### 2.1 Punjab & Haryana (Jamabandi / Land Records Society)
- **Authority**: Department of Revenue, Rehabilitation and Disaster Management, Punjab (`plrs.org.in`) and Haryana Land Records Department (`jamabandi.nic.in`).
- **Standard**:
  - $1\text{ Karam (Gatha)} = 5.5\text{ feet} = 66\text{ inches}$.
  - $1\text{ Sarsahi} = 1\text{ Karam} \times 1\text{ Karam} = 30.25\text{ sq ft}$.
  - $1\text{ Marla} = 9\text{ Sarsahi} = 272.25\text{ sq ft} = 30.25\text{ sq yd}$.
  - $1\text{ Kanal} = 20\text{ Marlas} = 5,445\text{ sq ft} = 605\text{ sq yd}$.
  - $1\text{ Killa / Acre} = 8\text{ Kanals} = 160\text{ Marlas} = 43,560\text{ sq ft}$.
  - $1\text{ Murabba} = 25\text{ Killas} = 200\text{ Kanals} = 1,089,000\text{ sq ft}$.
- **Old Settlement Variant**:
  - In certain historical pre-consolidation settlement records, $1\text{ Karam} = 5.0\text{ feet} = 60\text{ inches}$, yielding $1\text{ Marla} = 225\text{ sq ft}$. This variant is exposed explicitly as "Old Settlement".
- **Malwa / PEPSU Bigha**:
  - Under PEPSU revenue conventions, $1\text{ Bigha} = 4\text{ Kanals} = 21,780\text{ sq ft}$ ($2.5\text{ Bigha} = 1\text{ Killa}$).

### 2.2 Uttar Pradesh (UP Board of Revenue / Bhulekh)
- **Authority**: UP Board of Revenue (`upbhulekh.gov.in`) & UP Zamindari Abolition and Land Reforms Act.
- **Pucca Bigha**:
  - Standard jarib of 55 yards. $1\text{ Pucca Bigha} = 55\text{ yd} \times 55\text{ yd} = 3,025\text{ sq yd} = 27,225\text{ sq ft} = 2,529.28\text{ sq m}$.
  - $1\text{ Biswa} = \frac{1}{20}\text{ Bigha} = 1,361.25\text{ sq ft} = 151.25\text{ sq yd}$.
  - $1\text{ Biswansi} = \frac{1}{20}\text{ Biswa} = 68.0625\text{ sq ft}$.
  - $1\text{ Kachwansi} = \frac{1}{20}\text{ Biswansi} = 3.403125\text{ sq ft}$.
- **Kachha Bigha (Western UP)**:
  - Customary in Meerut, Moradabad, Saharanpur, Muzaffarnagar divisions: $1\text{ Kachha Bigha} = \frac{1}{3}\text{ Pucca Bigha} = 9,075\text{ sq ft} = 1,008.33\text{ sq yd}$.
  - $1\text{ Kachha Biswa} = 453.75\text{ sq ft}$.

### 2.3 Rajasthan (Board of Revenue, Ajmer / Apna Khata)
- **Authority**: Rajasthan Land Revenue Act 1956 & Rajasthan Board of Revenue (`apnakhata.rajasthan.gov.in`).
- **Pucca Bigha**: $165\text{ ft} \times 165\text{ ft} = 3,025\text{ sq yd} = 27,225\text{ sq ft}$.
- **Kachha Bigha**: $132\text{ ft} \times 132\text{ ft} = 1,936\text{ sq yd} = 17,424\text{ sq ft}$ ($2.5\text{ Kachha Bigha} = 1\text{ Acre}$).

### 2.4 Bihar (Directorate of Land Records & Survey / Biharbhumi)
- **Authority**: Bihar Land Reforms Act & Department of Revenue and Land Reforms (`biharbhumi.bihar.gov.in`).
- **Standard**:
  - $1\text{ Bigha} = 27,225\text{ sq ft} = 20\text{ Kattha}$.
  - $1\text{ Kattha} = 1,361.25\text{ sq ft} = 20\text{ Dhur}$.
  - $1\text{ Dhur} = 68.0625\text{ sq ft} = 20\text{ Dhurki}$.
- **Local Laggi Variants**: Marked `verified: false`. Varies regionally depending on laggi length (e.g. 4 hath to 6.5 hath).

### 2.5 Madhya Pradesh (MP Bhulekh)
- **Authority**: MP Land Revenue Code 1959 (`mpbhulekh.gov.in`).
- **Standard**: $1\text{ Bigha} = 27,225\text{ sq ft}$, $1\text{ Biswa} = 1,361.25\text{ sq ft}$.
- **Malwa/Chambal Regional**: Flagged `verified: false` where local bigha is estimated at $12,000$ to $14,400\text{ sq ft}$.

### 2.6 Gujarat (AnyRoR)
- **Authority**: Gujarat Land Revenue Code & Revenue Department (`anyror.gujarat.gov.in`).
- **Standard**:
  - $1\text{ Vigha} = 16\text{ Guntha} = 17,424\text{ sq ft} = 1,618.74\text{ sq m} = 0.40\text{ Acre}$.
  - $1\text{ Guntha} = 121\text{ sq yd} = 1,089\text{ sq ft}$.
  - $1\text{ Vassa} = \frac{1}{20}\text{ Vigha} = 871.2\text{ sq ft}$.

### 2.7 Maharashtra (Mahabhulekh)
- **Authority**: Maharashtra Land Revenue Code 1966 (`bhulekh.mahabhumi.gov.in`).
- **Standard**:
  - $1\text{ Guntha} = 33\text{ ft} \times 33\text{ ft} = 121\text{ sq yd} = 1,089\text{ sq ft} = 101.17\text{ sq m}$.
  - $40\text{ Gunthas} = 1\text{ Acre} = 43,560\text{ sq ft}$.
  - $1\text{ Aana} = 2.5\text{ Guntha} = 2,722.5\text{ sq ft}$.

### 2.8 Himachal Pradesh & Uttarakhand (Himbhoomi / Devbhoomi)
- **Authority**: HP Land Records (`himbhoomi.hp.gov.in`) and Uttarakhand Revenue Department (`devbhoomi.uk.gov.in`).
- **Standard Hill Bigha**:
  - $1\text{ Bigha} = 9,075\text{ sq ft} = 1,008.33\text{ sq yd} = 843.09\text{ sq m}$.
  - $1\text{ Biswa} = 453.75\text{ sq ft}$.
  - $4.8\text{ Bigha} = 1\text{ Acre}$.

### 2.9 West Bengal (Banglarbhumi)
- **Authority**: Directorate of Land Records and Surveys (`banglarbhumi.gov.in`).
- **Standard**:
  - $1\text{ Bigha} = 14,400\text{ sq ft} = 1,600\text{ sq yd} = 120\text{ ft} \times 120\text{ ft}$.
  - $1\text{ Cottah (Katha)} = \frac{1}{20}\text{ Bigha} = 720\text{ sq ft} = 80\text{ sq yd}$.
  - $1\text{ Chhatak} = \frac{1}{16}\text{ Cottah} = 45\text{ sq ft} = 5\text{ sq yd}$.
  - $1\text{ Satak (Decimal)} = 435.6\text{ sq ft}$.

### 2.10 South India (Tamil Nadu, Andhra Pradesh, Telangana, Karnataka)
- **Authorities**: Tamil Nadu Patta Chitta (`eservices.tn.gov.in`), Karnataka Bhoomi (`bhoomi.karnataka.gov.in`), Telangana Dharani (`dharani.telangana.gov.in`).
- **Standard**:
  - $1\text{ Cent} = \frac{1}{100}\text{ Acre} = 435.6\text{ sq ft} = 48.4\text{ sq yd} = 40.468\text{ sq m}$.
  - $1\text{ Ground (Urban TN)} = 2,400\text{ sq ft} = 266.67\text{ sq yd}$.
  - $1\text{ Ankanam (AP/Rayalaseema)} = 72\text{ sq ft} = 8\text{ sq yd}$.
  - $1\text{ Guntha (Karnataka/Telangana)} = 1,089\text{ sq ft}$.

---

## 3. Accuracy Verification Protocol
1. Any regional entry must cite the published Land Revenue Manual or State Bhulekh portal.
2. If discrepancies exist between tehsils, a variant flag is provided.
3. Every screen presents the active calculation baseline and links to the legal verification notice.
