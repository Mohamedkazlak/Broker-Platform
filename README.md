# Broker Platform

Welcome to the **Broker Platform** repository! This is a complete, multi-tenant platform tailored for real estate brokers to manage listings, analyze insights, and host customized white-labeled consumer-facing websites under their own subdomains.

**Live site:** [https://www.myflats.store/en](https://www.myflats.store/en)

## Key Features

- **Broker Dashboard:** A comprehensive central hub to track property statuses, sales volume, top locations, and message handling.
- **Custom Broker Subdomains:** Automatically handles multi-tenant subdomains so each broker gets a unique real estate website (e.g. `brokername.myflats.store` acting as their portfolio).
- **Property Management:** Dedicated pages and workflows to add, update, rent, or sell properties with rich descriptions, specs, and images.
- **Dynamic Content & Theming:** Custom tenant-facing landing pages show personalized hero backgrounds, broker details, and curated property lists based on active subscriptions.
- **Analytics & Insights:** Granular reporting metrics built directly into the broker dashboards.
- **Arabic Localization (i18n):** Full Arabic language support across the dashboard, home, pricing, property, and tenant-facing pages with right-to-left (RTL) layout handling for a native Arabic browsing experience.

## Project Screenshots

Previews of the platform UI in English and Arabic (RTL):

### 1. Landing Page

![Platform Landing Page](docs/screenshots/1.Landing_page.png)

### 2. Broker Dashboard

**English**

![Broker Dashboard](docs/screenshots/2.dashboard_en.png)

**Arabic**

![Broker Dashboard](docs/screenshots/3.dashboard_ar.png)

### 3. Broker's Page

![Broker's Page](docs/screenshots/4.broker_page.png)

### 4. Browse Properties

**English**

![Browse Properties](docs/screenshots/5.browse_properties_en.png)

**Arabic**

![Browse Properties](docs/screenshots/6.browse_properties_ar.png)

### 5. Property Details

**English**

![Property Details](docs/screenshots/7.property_details_en_1.png)
![Property Details scroll](docs/screenshots/8.property_details_en_2.png)

**Arabic**

![Property Details](docs/screenshots/9.property_details_ar_1.png)
![Property Details scroll](docs/screenshots/10.property_details_ar_2.png)

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, shadcn/ui, TypeScript
- **Backend/API:** Node.js, Express (with Subdomain routing middleware)
- **Database / Auth:** Supabase PostgreSQL & Authentication
- **Payments:** Stripe / PayPal Modules Placeholder

## Quick Start Guide

**Prerequisites:** Ensure you have Node.js and npm installed. Check that your Supabase environment variables are correctly configured.

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Mohamedkazlak/Broker-Platform
   cd "Broker Platform Main"
   ```

2. **Install dependencies:**
   Make sure you install all module dependencies at the root and optionally within client/server folders.

   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

3. **Start the Development Environments:**
   You will typically need to run both client and server simultaneously for the platform to function properly.

   ```bash
   npm run dev:all
   ```

> [!TIP]
> Ensure you have a root `.env` configured (see `.env.example` for required variables: Supabase keys, server URL, etc.).
