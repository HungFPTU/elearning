---
name: feature-proposal
description: Use when Bond asks for a new feature, asks "should we...", or when you want to suggest an improvement in the E-Learning project. Gives a clear recommendation, the reason behind it, the concrete solution, and what it costs, before or alongside building.
---

# Feature proposal

Bond asked: for every feature, give a suggestion, **why** it should be done that way, and a **clear** solution.
Never hand him a menu without a pick.

## Shape of a proposal (Vietnamese, casual)

```
**Đề xuất:** <the one thing you recommend, in one sentence>
**Tại sao:** <the business or user reason; numbers if you have them>
**Cách làm:**
1. Data: <models / columns / migration>
2. API: <endpoints, permission keys, audit actions, error codes>
3. Web: <pages from docs/screens.md, components>
4. Test: <the cases you will add to docs/test-cases.md>
**Không chọn:** <the main alternative and why it lost, one line>
**Chi phí:** <S / M / L and which PR it fits in>
**Cần Bond chốt:** <only the decisions that change the business; skip if none>
```

## Rules
- Start from the business model in the Claude Doc "E-Learning: mô hình kinh doanh và đề xuất": marketplace first,
  white-label subscription later, every table ready for `tenantId`.
- Prefer the boring solution that one person can run. Name the scale at which it stops working.
- Money, permissions and data isolation get a sentence each, always: who pays, who may do this, can tenant A see it.
- If a choice changes Bond's goal (pricing, revenue share, what users may do), ask him with one question and a
  recommendation; keep building the recommended option meanwhile if it can be undone.
- Small, obviously-right improvements (a missing index, a Vietnamese error message) need no proposal: do them and
  mention them in one line.
- After he agrees, build it with the `add-feature` skill.
