# Tenant Health Monitor

Aurumi Tenant Success

Lovable — Iteration 1 Build Instructions

1. What to build

Build a new standalone internal web application called:

Aurumi Tenant Success

The application is an internal operating tool for Aurumi's Customer Success, Product, Operations and Management teams.

Its purpose is to help Aurumi understand:

How actively each Tenant is using Aurumi

Which Aurumi applications are being adopted

Where adoption is weak

How usage is changing over time

Which Tenants need attention

What opportunities may exist to increase the value Tenants get from Aurumi

For this iteration, focus on the foundation and core Tenant experience.

Do NOT attempt to build the entire Tenant Success product yet.

2. Scope of Iteration 1

Build only these areas:

Primary navigation

Overview

Tenants

You may include placeholder navigation items for future modules:

App Adoption

TTYB

Business Skills

Opportunities

Interventions

Event Monitor

These future items should either be disabled or clearly marked as coming later.

3. Overview Dashboard

Create a polished management dashboard.

The dashboard should immediately answer:

"How are our Tenants doing?"

KPI cards

Display:

Total Tenants

Healthy Tenants

Tenants Needing Attention

At-Risk Tenants

Total Employees

Active Users

Average App Adoption

Open Opportunities

Use realistic simulated values.

The numbers must be internally consistent with the underlying simulated data.

Tenant Health Distribution

Show the number/percentage of Tenants in:

Healthy

Watch

At Risk

Use a clear visual representation.

Adoption Trend

Create a 30-day trend showing:

Active Users

App Adoption

Use realistic historical simulated data.

Do not generate independent random numbers. The trend should tell a coherent story.

Tenants Needing Attention

Show a concise list of the highest-priority Tenants.

For each:

Tenant

Health

Trend

Main reason

Suggested attention

Example:

ABC Finance — Watch — CRM adoption declining

Top Opportunities

For this iteration, opportunities can be simulated.

Examples:

Low app adoption

Declining usage

Low employee activation

Unused relevant capability

Do not build the full Opportunity management system yet.

Just surface the information on the Overview dashboard.

4. Tenant Portfolio

Create a dedicated Tenant list.

The page should allow users to:

Search

Sort

Filter

Open a Tenant

Table columns

Include:

ColumnPurposeTenantOrganization nameIndustryTenant industryEmployeesNumber of employeesActive UsersCurrent active usersApp AdoptionOverall adoptionHealthCurrent health30-Day TrendUsage directionOpportunitiesNumber of open opportunitiesLast ActivityMost recent meaningful activity

Use status indicators for Health.

Suggested categories:

Healthy

Watch

At Risk

Filters

Provide filters for:

Health

Industry

Adoption

Trend

The filtering must actually work against the simulated data.

5. Tenant 360

Clicking a Tenant should open a detailed Tenant 360 view.

This is the most important screen in Iteration 1.

Example:

ABC Finance

Health: 86 — Healthy

30-day trend: +12%

Tenant Summary

Show:

Employees

Activated Users

Weekly Active Users

Monthly Active Users

App Adoption

Last Activity

Open Opportunities

Engagement

Show:

Activation rate

Weekly active users

Monthly active users

Engagement trend

Inactive users

Use simple visualizations rather than excessive charts.

6. App Adoption — Basic Version

For Tenant 360, include a basic App Adoption section.

Do NOT build the separate App Adoption module yet.

For each representative Aurumi application show:

Eligible users

Activated users

Active users

Adoption %

Trend

Use visual progress bars or compact charts.

Example:

Attendance & Leave       93%   ↑
Business Contacts        74%   →
Deals CRM                41%   ↓
Expense Tracker          68%   ↑
Tasks                    81%   →


Use representative applications from the current Aurumi suite.

Include apps from different areas such as:

Core

Sales

HR

Finance

Operations

Do not attempt to model every Aurumi application in Iteration 1.

7. Important Concept: Direct Usage

For this iteration, App Adoption should represent direct application usage.

Do NOT yet attempt to add TTYB-mediated usage.

TTYB will be introduced in a later iteration.

However, structure the data model so that another access path can be added later without redesigning the application.

For example, conceptually:

usage
  ├── direct
  └── future: ttyb


Do not implement the TTYB functionality yet.

8. Tenant Opportunities — Basic Version

On Tenant 360, show a small "Opportunities" section.

Examples:

CRM Adoption Opportunity

54 sales employees are eligible for Deals CRM, but only 22 are active.

Engagement Opportunity

18 activated employees have not used Aurumi in the last 14 days.

Feature Adoption Opportunity

Expense Tracker is widely used, but approval workflows have low adoption.

These are simulated insights.

For this iteration, they can be generated from simple rules in the simulated backend.

Do not build the full Opportunity management workflow yet.

9. Simulated Backend

Use a clean simulated backend/data provider.

Do NOT place large amounts of mock data directly inside React components.

Create a service/provider abstraction so the UI behaves as if it were consuming a real backend.

The exact implementation is up to you, but keep the boundary clean.

Conceptually:

UI
 ↓
Hooks / Services
 ↓
Simulated Data Provider
 ↓
Mock Data


The simulated provider should later be replaceable by real APIs.

10. Simulated Data

Create a coherent dataset containing approximately:

Tenants

15–20 Tenants.

Include industries such as:

NBFC

DSA

Finance

Hospitality

Distribution

Services

Manufacturing

Users

Several hundred users distributed across the Tenants.

Each Tenant should have:

employee count

activated users

active users

historical usage

Applications

Create representative Aurumi applications.

Examples:

Business Contacts

Deals CRM

Trip Meter

Attendance & Leave

Expense Tracker

Tasks

Employee Management

Inventory

Vendors

Purchases

Historical metrics

Create at least 30 days of historical usage data.

The data should support:

increasing usage

stable usage

declining usage

across different Tenants.

11. Health Score

Implement a simple initial Tenant Health score.

The score should consider:

Employee activation

Active user engagement

App adoption

Usage trend

Use a service/function rather than embedding the calculation inside UI components.

Conceptually:

Tenant Health
=
Engagement
+ Adoption
+ Trend
+ Activation


The exact weighting can be simple for this iteration.

The scoring model is provisional and should be easy to modify later.

Display:

numeric score

Health category

key positive signals

key negative signals

Do not present the initial score as a scientifically validated metric.

12. Opportunity Detection

Implement a small simulated opportunity detection layer.

Examples:

Adoption Gap

If a Tenant has many eligible users but low active usage:

Adoption Gap

Usage Decline

If usage has declined materially over 30 days:

Usage Decline

Activation Gap

If many employees have not activated:

Activation Opportunity

These rules should be implemented outside the UI.

The resulting opportunities should be based on actual simulated Tenant data.

13. Data Relationships

Maintain coherent relationships between:

Tenants

Users

Apps

Usage

Historical usage

Health

Opportunities

For example:

If a Tenant has 100 employees and 70 active users, its application-level active-user numbers should make sense relative to those values.

Do not generate unrelated random numbers for each metric.

The dashboard should feel as though it is backed by a real SaaS usage database.

14. Future Integration Boundaries

This application will eventually be integrated into the broader Aurumi Business OS.

That integration is outside the scope of this Lovable build.

For now:

Use simulated data.

Use simulated backend services.

Keep external integration points behind clean interfaces.

Do not attempt to connect to real Aurumi services.

There is an existing EventBus in the broader Aurumi platform.

For this iteration, do not implement the real EventBus.

We will introduce a simulated event subscription mechanism in a later iteration.

15. Do Not Build These Yet

Do NOT implement:

Real EventBus integration

Real Aurumi APIs

AI Studio integration

Provider Registry integration

Connector Registry integration

AI Manifest integration

Conversation Studio integration

AI Studio Runtime integration

TTYB analytics

Business Skill analytics

Full Opportunity workflow

Intervention management

External Connector management

Tenant-facing functionality

These will be addressed in later iterations.

16. Visual Design

The application should feel like a serious internal Aurumi enterprise application.

Use a clean modern SaaS interface.

Prioritize:

information hierarchy

compact but readable tables

useful KPI cards

clear status indicators

restrained use of charts

consistent spacing

excellent typography

responsive layout

Avoid:

excessive decorative elements

dashboard clutter

meaningless charts

excessive colors

generic "AI dashboard" styling

The application should feel operational and trustworthy.

17. Interaction Requirements

The following interactions must work:

Overview

Click a Tenant → open Tenant 360.

Tenant Portfolio

Search → filters the list.

Filter → updates the displayed Tenants.

Click Tenant → open Tenant 360.

Tenant 360

App adoption information should be derived from the selected Tenant's data.

Opportunity cards should correspond to actual simulated data.

Health score should be calculated rather than hard-coded.

18. Empty / Loading / Error States

Implement realistic:

loading states

empty states

no search results

no opportunities

error state for simulated provider failures

Do not leave screens looking broken when there is no data.

19. Code Quality

Keep:

UI components

business logic

simulated backend

data models

calculations

reasonably separated.

Do not duplicate the same calculations across multiple screens.

Do not put all application logic into one giant component.

Create reusable components for:

KPI cards

status badges

adoption bars

trend indicators

tables

tenant summaries

20. Acceptance Criteria

Iteration 1 is complete when:

The application launches successfully.

Overview dashboard works.

Tenant Portfolio works.

Tenant search/filter works.

Tenant 360 works.

Tenant health is calculated.

App adoption is displayed.

Historical trends work.

Opportunities are generated from simulated data.

Data is coherent across screens.

Mock backend/provider logic is separated from UI.

The application feels like a production-quality internal Aurumi application.

Future integration points are cleanly isolated.

No real Aurumi platform integrations are attempted.

21. Important Product Principle

The application should ultimately help Aurumi answer:

"Are our Tenants getting value from Aurumi, where are they leaving value on the table, and where should we intervene?"

Do not optimize this application for tracking clicks.

Optimize it for:

Engagement → Adoption → Value → Opportunity → Action

For Iteration 1, however, focus primarily on:

Engagement → Adoption → Tenant Health

Do not prematurely implement the later stages.

END — ITERATION 1

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aurumi-tenant-pulse.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/635ede2f-3638-4ccd-9991-86c0fb69bfb2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
