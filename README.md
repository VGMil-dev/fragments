# Fragments — Gamified Educational Ecosystem
### Software Architecture Case Study: BaaS to Robust Backend Migration

## Executive Summary
**Fragments** is an advanced educational platform designed to gamify learning environments. Initially built on a Backend-as-a-Service (BaaS) infrastructure, the project underwent a critical architectural pivot to address scalability bottlenecks and the need for complex transactional logic. This case study documents the migration from **Supabase** to a custom, high-performance **NestJS & PostgreSQL** architecture.

---

## 🏗️ The Architectural Challenge
The initial iteration relied heavily on Supabase for real-time features and data persistence. While excellent for rapid prototyping, the system faced the following limitations as it scaled:
*   **Business Logic Fragmentation:** Heavily coupled to database triggers and RLS policies, making testing and maintenance difficult.
*   **Concurrency Issues:** Challenges in managing complex gamification state transitions (exp, leveling, rewards) under high user load.
*   **Infrastructure Lock-in:** Limited control over low-level database optimization and networking.

## 🚀 The Solution: Custom Engineering
To achieve enterprise-grade stability, the system was re-engineered following **Clean Architecture** principles.

### Key Innovations:
*   **NestJS Implementation:** Transitioned core business logic to a decoupled NestJS backend, enabling strict domain-driven design (DDD).
*   **Layer Isolation:** Implemented a clear separation between the **Control Plane** (identity, configuration) and **Data Planes** (operational logic, state).
*   **Hexagonal Architecture:** Ensured that the business domain is agnostic to the database (PostgreSQL) and the delivery layer (REST API).

---

## 🛠️ Technology Stack
*   **Backend:** Node.js, NestJS, TypeScript.
*   **Persistence:** PostgreSQL (Optimized relational schemas), Redis (Caching).
*   **Frontend:** React, Tailwind CSS, Zustand (State Management).
*   **DevOps:** Dockerized environments, GitHub Actions (CI/CD).

---

## 📈 Strategic Technical Decisions (ADR)
### Why migrate from Supabase?
While Supabase provided a quick start, the **FragmentsV2** roadmap required:
1.  **Unit & Integration Testing:** Full coverage of complex game logic impossible with database-only triggers.
2.  **Custom Security Orchestration:** Moving beyond simple RLS to complex, application-level role-based access control (RBAC).
3.  **High-Performance Indexing:** Direct control over PostgreSQL indexing strategies to reduce query latency by 40% during peak usage.

---

## 📁 Repository Structure (Architect's View)
```text
src/
├── domain/         # Pure business logic (Game rules, user progression)
├── application/    # Use cases (Level up, claim reward)
├── infrastructure/ # External implementations (Postgres, External APIs)
└── presentation/   # Controllers & Data Transfer Objects (DTOs)
```

---
**Author:** Milton Velásquez — Software Architect & Technical Lead
**Gavanti Engineering Lab**
