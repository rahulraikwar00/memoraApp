# Personal Interview Prep: Rahul Raikwar (MemoraApp Project Creator)

This document provides 20 personalized interview questions based on your specific professional profile (GitHub/LinkedIn) and your technical focus on the MemoraApp.

---

## 🏗️ 1. Project-Based Questions (FocusWalker, AddressSync, ADvault)

1.  **Transition to Native**: "In **FocusWalker**, you built a PWA using TypeScript to gamify focus sessions as virtual walks. Why did you choose React Native specifically for **MemoraApp** instead of sticking with a PWA approach?"
2.  **Sensitive Data (Aadhaar)**: "Both **AddressSync** and **ADvault** deal with highly sensitive Aadhaar data. How did those projects influence the way you manage user privacy and local indexing in **MemoraApp**?"
3.  **FastAPI vs. Node**: "You used **FastAPI** for your Aadhaar-based sync tools. Why did you switch to a **TypeScript/Node** server for MemoraApp? What are the key differences in how you handle async task execution between these two stacks?"
4.  **Hardware Integration**: "**ForeverFrames** deals with location pinning and photo footprints. How did you optimize the coordinate-based search in that project, and did any of that spatial logic carry over to MemoraApp's localized bookmarks?"
5.  **CLI and Developer Tools**: "You built **prworkflow_tool** to bring PR management to the terminal. How does your experience building CLI tools for developers affect the way you design 'Dev-Friendly' APIs for your own backend?"

## 🛠️ 2. The "Debugger" Mindset (GitHub Bio Focus)

6.  **Debugging Pitch**: "Your GitHub bio says: 'If you need someone to DEBUG your code ..HIRE ME.' What is your most systematic approach to debugging a memory leak in a React Native app that only happens after 15 minutes of use?"
7.  **The Hardest Bug**: "Across your 122 repositories, what was the single most difficult bug you've ever fixed, and how did you finally isolate the root cause?"
8.  **Audit Strategy**: "When you're hired to 'debug' someone's code, what's the first thing you look for in their database schema vs. their frontend state management?"

## 🌐 3. Domain & Scale (Indian Tech Ecosystem)

9.  **Twilio Integration**: "In **AddressSync**, you used Twilio for syncing. How would you handle a scenario where SMS delivery fails during the 'sync' process? Does MemoraApp use a similar 'retry-with-notification' logic?"
10. **Aadhaar Vaulting (Lexicographic Search)**: "When building **ADvault**, you replaced Aadhaar numbers with reversible tokens. How do you maintain searchability in an encrypted vault without plain-text exposure?"
11. **Scalability in India**: "Building for the Indian market often involves handling low-bandwidth or 'spotty' 4G/5G connections. How does MemoraApp's exponential backoff specifically address these intermittent network failures?"

## 📱 4. Mobile & React Native Specifics

12. **Zustand Persistence**: "You used Zustand for MemoraApp. Why did you choose it over Redux Toolkit, which is very common in the industry? How do you handle store hydration from SQLite during the 'Splash Screen' phase?"
13. **Masonry Layout Performance**: "In a 2-column masonry grid like the one in MemoraApp, how do you prevent 'layout jumps' when the user scrolls and images of different aspect ratios are loading?"
14. **Expo FileSystem vs. SQLite**: "Why store voice notes as files in the `FileSystem` instead of using `Base64` strings directly inside the SQLite database?"

## 🧠 5. Architecture & Modern Workflow (The "Lead" Mindset)

15. **Technical Debt Ownership**: "You have 122 repos. How do you decide when to 'finish' a repo and when to keep maintaining it as a long-term product?"
16. **AI as a Teammate**: "You mentioned using AI as a 'Force Multiplier'. How do you ensure that your code review process (for yourself or a team) catches logical hallucinations in AI-suggested SQLite queries?"
17. **Ownership**: "If you had to hire someone for the MemoraApp team, what is the one 'red flag' answer they could give you regarding database indexing?"
18. **The PWA Trade-off**: "FocusWalker is a PWA. When is a PWA 'good enough' and when is a Native app 'absolutely necessary'?"
19. **Future-Proofing**: "If you had to migrate MemoraApp's backend from Node to a Rust-based microservice for performance, what would be the most difficult part of the migration for the mobile client?"
20. **Product Vision**: "Where do you see MemoraApp in 2 years? How does the current 'Offline-First' architecture support that long-term vision?"

---

*Prepared by: Antigravity (Personal AI Career Assistant)*
