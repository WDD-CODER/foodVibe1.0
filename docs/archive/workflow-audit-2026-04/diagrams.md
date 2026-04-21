# Subsystem Diagrams

One mermaid diagram per subsystem. Edge labels match the vocabulary from relationships.md.
All nodes present in the Stage 1 inventory. No invented nodes.

---

## 1. Gate Chain

```mermaid
graph LR
    CLAUDE["CLAUDE.md"] -->|gates| AGENT["agent.md"]
    CLAUDE -->|gates| COPILOT["copilot-instructions.md"]
    AGENT -->|gates| COPILOT
    AGENT -->|reads| VCL["instructions/validation-checklist.md"]
    AGENT -->|references| AGENTS_DIR["agents/"]
    AGENT -->|references| COMMANDS_DIR["commands/"]
    COPILOT -->|references| STD_ANG["standards-angular.md"]
    COPILOT -->|references| STD_SEC["standards-security.md"]
    COPILOT -->|references| STD_DOM["standards-domain.md"]
    COPILOT -->|references| STD_GIT["standards-git.md"]
    COPILOT -->|references| STD_BK["standards-backend.md"]
    COPILOT -->|references| AGENTS_DIR
    COPILOT -->|references| SKILLS_DIR["skills/"]
    COPILOT -->|references| COMMANDS_DIR
    CLAUDE -->|external| GSTACK["[EXT] ~/.claude/skills/gstack/"]
    CLAUDE -->|external| BRANCH_GUARD["[EXT] scripts/branch-guard.sh"]
    CLAUDE -->|external| SESS_STATE["[EXT] docs/session-state.md"]
```

---

## 2. Command → Agent Dispatch

```mermaid
graph LR
    GIT_CMD["commands/git.md"] -->|delegates-to| GIT_AG["agents/git-agent.md"]
    TEST_PR["commands/test-pr-review-merge.md"] -->|delegates-to| GIT_AG
    DEPLOY["skills/deploy-github-pages/SKILL.md"] -->|invokes| GIT_AG

    END_SES["skills/end-session/SKILL.md"] -->|delegates-to| EOA["agents/end-of-session-agent.md"]
    SESH_HO["skills/session-handoff/SKILL.md"] -->|redirects-to| END_SES

    AUTH_LOG["skills/auth-and-logging/SKILL.md"] -->|invokes| SECOFC["agents/security-officer.md"]
    AUTH_CR["skills/auth-crypto/SKILL.md"] -->|invokes| SECOFC

    EOA -->|delegates-to| GIT_AG
    EOA -->|consumes-skill| TECHDEBT["skills/techdebt/SKILL.md"]
    EOA -->|consumes-skill| UPD_DOCS["skills/update-docs/SKILL.md"]
    EOA -->|consumes-skill| WTE["skills/worktree-session-end/SKILL.md"]

    BREADCR_AG["agents/breadcrumb-navigator.md"] -->|consumes-skill| BC_SK["skills/breadcrumb-navigator/SKILL.md"]
    UPD_DOCS -->|invokes| BC_SK
    FINALIZE["skills/finalize-docs/SKILL.md"] -->|invokes| BC_SK
    FINALIZE -->|invokes| UPD_DOCS

    SECOFC -->|external| GSTACK_CSO["[EXT] gstack /cso"]
    QA_AG["agents/qa-engineer.md"] -->|external| GSTACK_QA["[EXT] gstack /qa"]
    TEST_PR -->|external| GSTACK_SHIP["[EXT] gstack /ship"]
```

---

## 3. Reflect Subsystem

```mermaid
graph TD
    AUTO_REFLECT["reflect/auto-reflect.ps1"] -->|invokes| REFLECT_CMD["commands/reflect.md"]

    REFLECT_CMD -->|reads| EVALUATOR["reflect/evaluator.md"]
    REFLECT_CMD -->|reads| EVAL_AGENT["reflect/evaluator-agent-prompt.md"]
    REFLECT_CMD -->|reads| BEHAVIOR["reflect/behavior-runner-prompt.md"]
    REFLECT_CMD -->|reads| RUNNER_PROMPT["reflect/reflect-runner-prompt.md"]
    REFLECT_CMD -->|reads| FIX_TMPL["fix-templates/"]
    REFLECT_CMD -->|invokes| TEST_RUNNER["reflect/test-runner.sh"]
    REFLECT_CMD -->|writes| REFL_LOG["reflect/reflection-log.tsv"]
    REFLECT_CMD -->|writes| TQ_LOG["reflect/test-quality-log.md"]
    REFLECT_CMD -->|writes| SKILLS_DIR["skills/ (SKILL.md files)"]
    REFLECT_CMD -->|writes| RETROS["retrospectives/"]

    EVALUATOR -->|references| EVAL_AGENT
    EVAL_AGENT -->|references| EVALUATOR
    BEHAVIOR -->|references| EVALUATOR

    TEST_RUNNER -->|reads| FIX_TESTS["fix-templates/tests/"]

    TOOL_HOOK["reflect/tool-failure-hook.ps1"] -->|writes| FAIL_LOG["reflect/failure-log.tsv"]
    FAIL_LOG -->|references| REFLECT_LIST["commands/reflect-list.md"]
    REFLECT_LIST -->|reads| FAIL_LOG

    STAMP["reflect/reflected-sessions.stamp"] -->|references| AUTO_REFLECT
    STAMP -->|references| REFLECT_CMD
    AUTO_REFLECT -->|references| REFL_LOG

    COVERAGE["reflect/coverage/cssLayer.coverage.md"] -->|references| TS_CSS["reflect/test-suites/cssLayer.tests.md"]
    TS_CSS -->|references| TEST_RUNNER
    TS_ACS["reflect/test-suites/angularComponentStructure.tests.md"] -->|references| TEST_RUNNER

    EVIDENCE["reflect/evidence/"] -->|references| REFLECT_CMD
    EVIDENCE -->|references| EVALUATOR

    SETTINGS["settings.json"] -->|references| TOOL_HOOK
    TOOL_HOOK -->|references| SETTINGS
```

---

## 4. Session Lifecycle

```mermaid
graph LR
    SESSIONS["sessions/\n(pattern node)"]

    BRIEF_CMD["commands/brief.md"] -->|writes| SESSIONS
    PLAN_IMPL["commands/plan-implementation.md"] -->|writes| SESSIONS
    PLAN_IMPL -->|invokes| BRIEF_CMD
    CTX_MGMT["skills/context-management/SKILL.md"] -->|writes| SESSIONS

    EOA["agents/end-of-session-agent.md"] -->|writes| SESSIONS
    EOA -->|reads| TODO["todo.md"]
    EOA -->|writes| TODO_ARC["todo-archive.md"]
    EOA -->|external| SESS_STATE["[EXT] docs/session-state.md"]

    EXECUTE["commands/execute-it.md"] -->|reads| SESSIONS
    EXECUTE -->|writes| TODO
    SAVE_PLAN["skills/save-plan/SKILL.md"] -->|writes| TODO

    SESSIONS -->|references| BRIEF_CMD
    SESSIONS -->|references| PLAN_IMPL
    SESSIONS -->|references| EOA
    SESSIONS -->|references| SESS_README["sessions/README.md"]

    SESS_README -->|references| BRIEF_CMD
    SESS_README -->|references| PLAN_IMPL
    SESS_README -->|references| CTX_MGMT

    TODO -->|references| TODO_ARC
    TODO_ARC -->|references| TODO
    SWEEP["commands/sweep-stale-todos.md"] -->|reads| TODO
    SWEEP -->|writes| TODO_ARC
```

---

## 5. Skills Consumption

```mermaid
graph LR
    %% Commands consuming skills
    AUDIT_CMD["commands/audit.md"] -->|consumes-skill| IF_SKILL["skills/interface-design/SKILL.md"]
    CRITIQUE["commands/critique.md"] -->|consumes-skill| IF_SKILL
    EXTRACT["commands/extract.md"] -->|consumes-skill| IF_SKILL
    INIT["commands/init.md"] -->|consumes-skill| IF_SKILL
    STATUS["commands/status.md"] -->|consumes-skill| IF_SKILL
    INIT -->|consumes-skill| CSSLAYER["skills/cssLayer/SKILL.md"]
    IF_SKILL -->|consumes-skill| CSSLAYER
    IF_SKILL -->|consumes-skill| ACS["skills/angularComponentStructure/SKILL.md"]
    QCHAT_CMD["commands/quick-chat.md"] -->|consumes-skill| QCHAT_SK["skills/quick-chat/SKILL.md"]
    NIGHTLY_CMD["commands/nightly-audit.md"] -->|consumes-skill| NIGHTLY_SK["skills/nightly-audit/SKILL.md"]
    EXECUTE["commands/execute-it.md"] -->|consumes-skill| SAVEPLAN["skills/save-plan/SKILL.md"]

    %% Agents consuming skills
    EOA["agents/end-of-session-agent.md"] -->|consumes-skill| TECHDEBT["skills/techdebt/SKILL.md"]
    EOA -->|consumes-skill| UPDDOCS["skills/update-docs/SKILL.md"]
    EOA -->|consumes-skill| WTE["skills/worktree-session-end/SKILL.md"]
    BREADCR["agents/breadcrumb-navigator.md"] -->|consumes-skill| BC_SK["skills/breadcrumb-navigator/SKILL.md"]

    %% Skills reading standards
    ACS -->|reads| STD_ANG["standards-angular.md"]
    CSSLAYER -->|reads| STD_ANG
    ANGULAR_PIPE["skills/angular-pipe-logic/SKILL.md"] -->|reads| STD_ANG
    ELEGANT["skills/elegant-fix/SKILL.md"] -->|reads| STD_ANG
    NIGHTLY_SK -->|reads| STD_ANG
    ADD_RECIPE["skills/add-recipe/SKILL.md"] -->|reads| STD_DOM["standards-domain.md"]
    NIGHTLY_SK -->|reads| STD_DOM
    AUTH_LOG["skills/auth-and-logging/SKILL.md"] -->|reads| STD_SEC["standards-security.md"]
    AUTH_CR["skills/auth-crypto/SKILL.md"] -->|reads| STD_SEC
    NIGHTLY_SK -->|reads| STD_SEC

    %% Skills invoking security officer
    AUTH_LOG -->|invokes| SECOFC["agents/security-officer.md"]
    AUTH_CR -->|invokes| SECOFC
    SECOFC -->|reads| STD_SEC
```
