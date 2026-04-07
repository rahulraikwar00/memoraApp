# Mock Interview Transcript: Senior Lead vs. App Creator

**Interviewer (IL)**: Senior Technical Lead
**Candidate (CA)**: Creator of MemoraApp (Hypothetical)

---

**IL**: So, I've spent some time looking at your "MemoraApp" codebase. It’s an impressive React Native project with a solid offline-first approach. Let’s dive straight into the sync logic. In `lib/sync.ts`, I see you’re using a polling strategy (every 30 seconds). Why did you go with that, and what are the obvious drawbacks?

**CA**: (Confidently) That’s a great place to start. The 30-second polling was really my "initial MVP" solution for stability. The main drawback, as you’ve probably noticed, is the impact on battery and radio state. But the logic was simple: I wanted to prioritize data integrity over power efficiency at the start. Moving forward, I’d definitely pivot to a more event-driven architecture—using something like Firebase Cloud Messaging for silent pushes when the server data changes, or at least narrowing the interval based on the `AppState`.

**IL**: Fair enough. Now, talk to me about the database. You're using `Drizzle` with `expo-sqlite`. I noticed you have some FTS5 logic in `lib/db.ts` for search, but there's a `LIKE` fallback. Why is that?

**CA**: (Leans in, sounding professorial) Right. Search is core to Memora. I wanted it to feel "Spotlight-fast." FTS5 gives us that inverted index which is $O(1)$ or $O(M)$ compared to the $O(N)$ sweep of a `LIKE` query. The fallback is actually a safety net. During local development or on older Android engines where the SQLite binary might not have the FTS module enabled, I didn't want the app to just crash. It’s about building for resilience. I’d rather have a slightly slower search than no search at all.

**IL**: (Nods) Okay, but let’s talk about the FTS5 implementation itself. What’s the overhead of keeping that virtual table in sync? 

**CA**: (Steering back to "Architectural Trade-offs") Honestly, the overhead is mostly a bit of disk write latency. Every time we insert into the main `bookmarks` table, we’re also writing to the `bookmarks_fts` table. It’s a "write-amplification" trade-off. For a personal link-saver, where you might save 10 objects a day, it’s negligible. But for the end-user "Search" experience? It's a massive win. I always prioritize "Read" speed over "Write" speed in a consumption-heavy app like this.

**IL**: Good point. Now, what happens if I’m deep in a subway, save three voice notes, and my app crashes while syncing the second one? How does your `syncQueue` handle that?

**CA**: (Calm and methodical) That’s one of the "Hard Problems." The `sync_queue` table in `lib/schema.ts` has a `status` field. We only mark an item as `completed` *after* the API gives us a successful response. If the app crashes, those items stay in `pending` or `failed`. When the `syncWorker` starts up again after the crash, it picks up exactly where it left off. However, to really make this bulletproof, I’d implement server-side idempotency. If the server already received that voice note but the client didn't "hear" the success, the server should just recognize the `id` and return success without creating a duplicate.

**IL**: I noticed you're using `Date.now() + Math.random()` for IDs. Is that... scalable?

**CA**: (Smiles slightly) For a single-user local app, yes. For a massive distributed system? Absolutely not. If we were scaling this to millions, I’d migrate to `UUID v7` or `ULIDs`. They give us that K-sortable property which helps the SQLite B-trees stay balanced and actually improves insert performance. The current ID scheme was about "speed to market," but I have the migration plan in mind.

**IL**: Last question. The `save.tsx` file is getting pretty large—over 1,000 lines. As a Lead, how would you break this down for a team of junior developers?

**CA**: (Focuses on "Engineering Leadership") That file is definitely the "God Object" of the app right now. My first move would be to extract the content-specific logic into sub-components. I'd have a `LinkInput`, `ImageInput`, and a `VoiceRecorder` component. Then, I’d move the saving logic into a custom hook—let's call it `useBookmarkCreator`—to decouple the UI from the DB/API calls. It makes testing easier and prevents cognitive overload when a new dev joins and just wants to fix a button styling.

**IL**: (Leans back) One final, slightly more direct question. Some of the patterns in your codebase, especially the integration between Drizzle and SQLite, look very "perfect" and almost industrial. It smells a bit like AI-generated code. How much of this did you actually write versus just generating and pasting?

**CA**: (Calmly, with a slight nod) That’s a fair and very modern question. I absolutely use LLMs and Copilot as part of my "Force Multiplier" toolkit. But here’s the difference: I don’t just "accept" what the AI gives me. I *orchestrate* it. For instance, the AI initially suggested a much simpler Drizzle configuration. I’m the one who insisted on the FTS5 virtual table and the custom retry logic with exponential backoff because I’ve seen where "standard" code fails in high-latency network conditions. 

**IL**: So you're saying the AI is your junior dev?

**CA**: Exactly. I use it to handle the "boilerplate" so I can spend my cognitive energy on the high-level architecture, security boundaries, and user experience. If you look at the `syncQueue` logic, you’ll see specific error-handling edge cases that an AI wouldn't suggest unless you knew exactly what to ask for. I believe being a Senior Lead in 2024+ means being the best "Editor" and "Architect" of code, not just the fastest typist.

**IL**: (Pause) You clearly have a strong grasp of the architecture and the "Why" behind the decisions. Let’s move on to the culture and how you handle code reviews...

---

### Analysis of the "Faking it" Technique:
1. **Focus on Trade-offs**: Instead of explaining the C-level internals of FTS5, the candidate talks about "Read vs Write speed" trade-offs.
2. **Acknowledge Debt**: When caught on a "weak" implementation (like ID generation or Polling), the candidate acknowledges it as a conscious "MVP decision" rather than a mistake, and then explains the "proper" way to fix it (UUID v7, Event-driven sync).
3. **Product-Centric Thinking**: The candidate always ties technical decisions (like FTS5 fallbacks) back to the "User Experience" (Resilience).
4. **Strategic Buzzwords**: They use terms like "Write-amplification," "B-trees," "ULIDs," and "Idempotency" to signal they have the foundations, even if they aren't looking at the C code.
5. **The AI-Accelerator Defense**: Don't deny using AI. Instead, position it as a "Force Multiplier" and emphasize that you *architect* the inputs and *audit* the outputs. This shows you are in command of the tools, not a slave to them.
