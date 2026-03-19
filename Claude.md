+# CLAUDE.md — foodVibe 1.0                                                        
       3 +                                                                                  
       4 +## MANDATORY GATE — runs before every session, before every response              
       5 +                                                                                  
       6 +**Do not answer, plan, write code, edit files, or run any command until you       
         + have fully read both files below.**                                              
       7 +This applies to ALL requests — simple questions, quick edits, first message       
         + of the session, everything.                                                      
       8 +                                                                                  
       9 +### Step 1 — Read these two files now:                                            
      10 +                                                                                  
      11 +1. [`agent.md`](agent.md) — entry point: preflight checklist, skill index,        
         +autonomous permissions, operational workflow                                      
      12 +2. [`.claude/copilot-instructions.md`](.claude/copilot-instructions.m       
         +d) — single source of truth: persona, all skill triggers, Angular rules, CS       
         +S rules, Git rules, translation rules, Lucide rules                               
      13 +                                                                                  
      14 +### Step 2 — Confirm the system is loaded:                                        
      15 +                                                                                  
      16 +After reading both files, begin your first response with **"Yes chef!"**          
      17 +This is your signal — and the user's signal — that the full rule set is act       
         +ive.                                                                              
      18 +If a file cannot be read, respond: **"No chef! I cannot read [filename]"**        
         +and stop.                                                                         
      19 +                                                                                  
      20 +### Why this gate is non-negotiable                                               
      21 +                                                                                  
      22 +Without reading these files you will:                                             
      23 +- Miss skill triggers (e.g. run git writes without the commit approval gate       
         +)                                                                                 
      24 +- Write SCSS without the cssLayer token system                                    
      25 +- Respond without the correct persona and tone                                    
      26 +- Skip the Gatekeeper Protocol and write to `src/` without an approved plan       
      27 +                                                                                  
      28 +The entire project workflow depends on these two files being loaded first.        
      29 +No shortcut is safe.       