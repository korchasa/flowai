# Investigate (Step-by-Step)

## Overview
Iterative root cause analysis with strict user control. 
- **No branches**: Work directly in the current state.
- **Sequential**: One experiment at a time.
- **User Confirmation**: Required before executing any experiment.

## Workflow

### 1. Analysis & Intake
- Review the problem statement and available logs.
- Read project documentation in `./documents`.
- Verify the environment and constraints.

### 2. Hypothesis Generation
- Brainstorm potential root causes (5-10 items).
- List evidence for/against each.
- Assign initial probabilities to each hypothesis.

### 3. Selection & Proposal
- **Select** the single most promising hypothesis (highest probability or information gain).
- **Design** one specific experiment to test it (e.g., log injection, configuration change, specific test case).
- **Define** expected outcomes and what they prove.
- **STOP AND ASK**: Present the proposed experiment to the user and wait for confirmation.

### 4. Execution (Only after confirmation)
- **Apply** necessary changes directly to the working directory (do not create a branch).
- **Run** the experiment.
- **Observe** and record the result.
- **Revert** all experimental changes immediately to restore clean state.

### 5. Update & Loop
- Update the list of hypotheses:
  - Eliminate disproven hypotheses.
  - Adjust probabilities of remaining ones based on new data.
- **Check**:
  - If the root cause is found (high certainty) -> Propose a fix.
  - If not found -> **Return to Step 3** to select the next experiment.

## Output Format (for each turn)
1. **Status**: Brief summary of where we are.
2. **Hypothesis Board**: Table/list of active hypotheses with probabilities.
3. **Proposed Experiment** (if in Step 3):
   - **Target**: Hypothesis being tested.
   - **Action**: What exactly will be done.
   - **Expected Result**: What success/failure looks like.
4. **Question**: "Do you want to proceed with this experiment?"
