# Executive Implementation Summary

**Product name:** Dentix


This package defines a custom dental practice management system for one domestic Iranian office. The application covers patient registration, scheduling, clinical charting, treatment planning, treatment journeys, follow-up, laboratory tracking, recall, patient finance, documents, communications, fixed reports, security, and operations. Iranian localization includes first-class Jalali/Gregorian date handling and explicitly labeled rial/toman presentation.

## Approved product shape

  - Angular 22 and Angular Material/CDK with a custom dental design system.

  - NestJS on Node.js 24 LTS and PostgreSQL 18.

  - A modular monolith, not microservices.

  - Persian and English runtime operation with complete RTL/LTR support and first-class Jalali/Gregorian dates.

  - Canonical financial storage in Iranian rials with explicitly labeled rial/toman input and display.

  - A shared Treatment Journey model for implant, orthodontic, prosthetic, and custom long-running care.

  - Immutable signed clinical records and immutable posted financial records.

  - No insurance, claims, full accounting, native imaging drivers, e-prescribing, AI diagnosis, or marketing automation.

## Contents

> 1\. Readme
> 
> 2\. Product Vision
> 
> 3\. Scope And Exclusions
> 
> 4\. Roles And Permissions
> 
> 5\. Competitor Feature Traceability
> 
> 6\. Product Roadmap
> 
> 7\. Glossary
> 
> 8\. Patient Management
> 
> 9\. Scheduling
> 
> 10\. Clinical Charting
> 
> 11\. Treatment Planning
> 
> 12\. Journeys Follow Up Labs Recall
> 
> 13\. Patient Ledger
> 
> 14\. Documents And Communications
> 
> 15\. Reporting
> 
> 16\. Information Architecture
> 
> 17\. Design System
> 
> 18\. Bilingual Rtl Guidelines
> 
> 19\. Motion Accessibility
> 
> 20\. System Architecture
> 
> 21\. Domain Model
> 
> 22\. Module Boundaries
> 
> 23\. Data Model
> 
> 24\. Api Guidelines
> 
> 25\. Adr 001 Modular Monolith
> 
> 26\. Adr 002 Angular Material
> 
> 27\. Adr 003 I18N
> 
> 28\. Adr 004 Immutable Records

29\. Adr 005 Iranian Calendar And Rial Toman

> 30\. Security Requirements
> 
> 31\. Test Strategy
> 
> 32\. Acceptance Criteria
> 
> 33\. Definition Of Done
> 
> 34\. Deployment
> 
> 35\. Backup Recovery
> 
> 36\. Monitoring
> 
> 37\. Release Process
> 
> 38\. Implementation Checklist
> 
> 39\. References
