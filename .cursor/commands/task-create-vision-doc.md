---
description: Interactive process to create or update Product Vision document with user interview
---

# Create Product Vision Document

## Overview
Interactive process to create or update the Product Vision document (`documents/vision.md`) by interviewing the user to gather necessary insights, using the embedded Product Vision template.

## Product Vision Template

```markdown
# Product Vision

## 1. Vision Statement
**Purpose:** To inspire and align the team's understanding with a concise, memorable statement.
**Format:** 1-2 sentences. The product's "North Star."
**Template:**
> For [target customer], who [need/opportunity], [Product Name] is a [product category] that [key benefit]. Unlike [competitor/alternative], our product [key differentiator].

## 2. Target Audience
**Purpose:** Clearly define who the product is being created for.
**Content:**
* User personas.
* Market segments.
* Behavioral characteristics and motivation.
* *Anti-personas* (who this product is NOT for).

## 3. Problem Statement
**Purpose:** Justify the product's necessity through real customer pain points.
**Content:**
* Description of the problem "as is" (Current State).
* Why existing solutions don't work or are insufficient.
* Evidence of the problem (research data, interviews).

## 4. Solution & Differentiators
**Purpose:** Describe how the product solves the problem and what makes it better than others.
**Content:**
* High-level description of the solution (not detailed features, but the approach).
* Unique Selling Proposition (USP).
* Key differentiators from competitors (why will they choose us?).
* Product's "magic" (secret sauce / unfair advantage).

## 5. Business Goals & Success Metrics
**Purpose:** Link the product to business success.
**Content:**
* Strategic company goals that the product supports.
* Expected business outcomes (revenue, market share, retention).
* Key Performance Indicators (KPIs) by which the vision's realization will be evaluated.

## 6. Strategy & Roadmap
**Purpose:** Show the path to realizing the vision.
**Content:**
* Planning horizon (usually 2-5 years).
* Main strategic milestones.
* MVP (Minimum Viable Product) and subsequent iterations.
* Go-to-Market strategy - briefly.

## 7. Risks & Assumptions
**Purpose:** Honest assessment of uncertainty.
**Content:**
* Critical assumptions (what must be true for this to work?).
* Key risks (technical, market, regulatory).
* Risk mitigation plan.
* *FAQ / "Why might this not work?"*.
```

## Todo List

1.  **Initialization**
    -   Review the "Product Vision Template" above to understand the required structure.
    -   Check if `documents/vision.md` already exists.
        -   If yes, read it and ask the user if they want to update specific sections or rewrite it entirely.
        -   If no, proceed to the interview for a fresh start.

2.  **Interview Phase (Conduct one by one)**
    -   **Vision Statement**: Ask about the target customer, their needs, the product category, key benefits, and how it differs from competitors. Aim to fill the template: "For [target], who [need], [Product] is [category] that [benefit]. Unlike [competitor], our product [differentiator]."
    -   **Target Audience**: Ask for details on user personas, market segments, and who the product is *not* for (anti-personas).
    -   **Problem Statement**: Ask about the current state, why existing solutions fail, and any evidence of the problem.
    -   **Solution & Differentiators**: Ask for a high-level description of the approach, the Unique Selling Proposition (USP), and the "secret sauce."
    -   **Business Goals**: Ask about strategic goals, revenue/growth targets, and success metrics (KPIs).
    -   **Strategy & Roadmap**: Ask about the planning horizon, key milestones, MVP definition, and go-to-market strategy.
    -   **Risks & Assumptions**: Ask about critical assumptions, technical/market risks, and mitigation plans.

3.  **Drafting Phase**
    -   Synthesize the collected answers into the markdown format defined in the "Product Vision Template" section.
    -   Ensure the tone is inspiring and clear.
    -   Present the draft to the user for review.

4.  **Finalization**
    -   Incorporate any feedback from the user.
    -   Create or overwrite `documents/vision.md` with the final content.
    -   Verify the file structure matches the "Product Vision Template".

## Checklist
- [ ] `documents/vision.md` exists.
- [ ] Content follows the structure defined in the "Product Vision Template" section of this command.
- [ ] All 7 sections (Vision, Audience, Problem, Solution, Goals, Strategy, Risks) are filled.
- [ ] Vision Statement follows the standard "For... Who... Is..." template.
