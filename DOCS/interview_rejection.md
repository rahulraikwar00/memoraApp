# Mock Interview: Rejection Case (Red Flags)

This document analyzes a hypothetical "failing" interview for the MemoraApp project. It highlights 10 critical "Red Flag" answers that demonstrate a lack of senior-level depth, poor ownership, and tutorial-driven development.

---

### **1. The "Magic Library" Red Flag**
**Interviewer**: "Why did you choose `Drizzle ORM` for this project instead of raw SQL or another ORM?"
**Candidate**: "Oh, I just like Drizzle. Everyone on Twitter is using it, and it seemed easy to set up. I didn't really think about other options."
> [!CAUTION]
> **Why it's a Red Flag**: Choice driven by "hype" rather than technical requirements (Schema safety, Type-safety, SQL performance trade-offs).

---

### **2. The "30-Second Polling" Red Flag**
**Interviewer**: "Your sync worker polls every 30 seconds. What happens to the battery life on a real device?"
**Candidate**: "30 seconds isn't that frequent. Modern phones have big batteries, so I don't think users will care. It works fine for me."
> [!WARNING]
> **Why it's a Red Flag**: Lack of empathy for "Resource Management" (Radio state, Battery impact) and a dismissive attitude toward performance bottlenecks.

---

### **3. The "Tutorial Clone" Red Flag**
**Interviewer**: "I see some complex Full-Text Search (FTS5) logic here. Can you explain how the virtual table is indexed?"
**Candidate**: "Honestly, I followed a YouTube video for that part. I just copied the SQL commands and it worked. I’m not really sure how it works under the hood."
> [!CAUTION]
> **Why it's a Red Flag**: Total lack of "Ownership" and "Foundation." A senior dev must understand the tools they put into production, especially for core features like search.

---

### **4. The "Security Afterthought" Red Flag**
**Interviewer**: "How are you handling secure token storage for the Auth system?"
**Candidate**: "I’m just using `AsyncStorage`. It’s easy and it’s what most people do for Expo apps. I’ll add a password later if needed."
> [!IMPORTANT]
> **Why it's a Red Flag**: High-risk security ignorance. Storing JWTs or sensitive tokens in unencrypted storage on-device is a major vulnerability.

---

### **5. The "Sync Conflict" Red Flag**
**Interviewer**: "What happens if a user edits a bookmark on two devices while offline? How are the conflicts resolved?"
**Candidate**: "The app just saves whatever was done last. I haven't really tested that scenario yet. It probably won't happen that often."
> [!CAUTION]
> **Why it's a Red Flag**: Ignoring "Edge Cases." In an offline-first app, sync conflicts are a certainty, not a possibility. A lead must have a strategy (Last-Write-Wins, CRDTs, etc.).

---

### **6. The "AI Copy-Paste" Red Flag**
**Interviewer**: "Some of your database retry logic looks very specific. Did you use an AI to write this?"
**Candidate**: (Defensively) "No, I wrote all of that from my head. I’ve just been coding a long time."
**Interviewer**: "Okay, then can you explain why you chose a 1000ms base delay for the exponential backoff?"
**Candidate**: "Uh, 1000ms just sounded like a good number. It’s what everyone uses."
> [!WARNING]
> **Why it's a Red Flag**: Lack of "Transparency" and "Foundation." It’s okay to use AI, but it is *not* okay to deny it and then fail to explain the resulting logic.

---

### **7. The "Scale Blindness" Red Flag**
**Interviewer**: "You’re using `Date.now() + Math.random()` for your IDs. What happens if we have 10 million users saving bookmarks simultaneously?"
**Candidate**: "That’s a lot of users! We can worry about that when we get there. For now, it works fine."
> [!CAUTION]
> **Why it's a Red Flag**: "Short-termism." While you shouldn't over-engineer, choosing a flawed ID scheme that will cause collisions eventually shows a lack of "Scalability Mindset."

---

### **8. The "State Management Overkill" Red Flag**
**Interviewer**: "I see you have 5 different Zustand stores. Could any of these have been simpler React Contexts?"
**Candidate**: "I just use Zustand for everything. It’s better than Context because it’s faster. I didn't want to overthink it."
> [!NOTE]
> **Why it's a Red Flag**: "Cargo Culting." Applying a tool to every problem without evaluating the simpler, native alternatives.

---

### **9. The "Test-Lite" Red Flag**
**Interviewer**: "How do you verify your sync logic works under poor network conditions (latency, packet loss)?"
**Candidate**: "I just turn off my Wi-Fi on my laptop and see if it tries to sync. I don't really have automated tests for that yet."
> [!WARNING]
> **Why it's a Red Flag**: Lack of "Rigorous Verification." Critical logic (Sync) requires more than just manual "vibe checks" to be robust at scale.

---

### **10. The "God Object" Red Flag**
**Interviewer**: "Your `save.tsx` screen is over 1,000 lines and handles 4 different media types. How would you refactor this?"
**Candidate**: "It’s easier for me to have everything in one file so I don't have to keep switching tabs. I’ll split it up if it gets to 2,000 lines."
> [!CAUTION]
> **Why it's a Red Flag**: Poor "Code Hygiene." A senior lead should proactively identify and fix "God Objects" to maintain team productivity and code readability.

---

## Verdict: **REJECT**

**Lead's Summary Feedback**:
The candidate is a "Builder" who can get things to work on the surface, but they lack the underlying technical foundation and architectural discipline required for a Senior role. They trend toward "Tutorial-driven development" and "AI-pasting" without understanding the *why* behind the patterns. There is a significant risk of shipping major security vulnerabilities (Auth storage) and performance bottlenecks (Sync battery drain) that would require an expensive rewrite later.
