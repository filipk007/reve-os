# Twelve Labs

## Company
- **Domain:** twelvelabs.io
- **Industry:** AI / Video Intelligence / Developer Tools
- **Size:** ~50-100 employees (Series B startup)
- **Stage:** Series B ($107M total raised, $300M valuation)
- **HQ:** San Francisco, CA
- **Founded:** 2021

## What They Sell

Twelve Labs builds a **video understanding platform** — an API that lets developers
search, analyze, summarize, and embed video content using multimodal AI models.

Think of it as "Google for video" — instead of tagging videos manually, developers
use natural language queries to find exact moments inside videos. Their models
(Marengo for search, Pegasus for generation) understand visual frames, audio,
speech, and temporal relationships simultaneously.

**Key products:**
- **Semantic Video Search** — find the exact moment in a video using natural language
- **Video-to-Text Generation** — summaries, reports, captions, chapter splits
- **Multimodal Embeddings (Embed API)** — vector representations for RAG, similarity search
- **Classification & Clustering** — auto-categorize video content at scale
- **Image-to-Video Search** — find similar scenes using an image as query

**Models:**
- Marengo 2.7 — search + indexing (best-in-class semantic video retrieval)
- Pegasus 1.2 — generation (summaries, captions, Q&A from video)
- Both available on AWS Bedrock as managed services

**Pricing:** Usage-based. Free tier = 600 minutes. Developer plan starts ~$0.033/min.
SDKs for Python and Node.js.

## Target ICP — Who Twelve Labs Sells To

### Primary Buyers
| Title | Why They Buy | What They Care About |
|-------|-------------|---------------------|
| VP/Head of Engineering | Build video features without training own models | API reliability, latency, accuracy, cost per minute |
| CTO / Technical Co-founder | Need video intelligence as a core product capability | Model quality, embedding flexibility, scalability |
| Product Manager (AI/ML) | Add video search/analysis to existing product | Time-to-integration, SDK quality, use case fit |
| Head of Data / ML Engineer | Video understanding in data pipelines | Embeddings quality, vector DB integrations, batch processing |

### Secondary Buyers
| Title | Why They Buy | What They Care About |
|-------|-------------|---------------------|
| VP Content / Media Ops | Search massive video archives, automate tagging | Accuracy on their content type, workflow integrations |
| Head of Security | Automated surveillance analysis at scale | Detection accuracy, real-time processing, compliance |
| Director of Sports Analytics | Auto-generate highlights, search game footage | Sport-specific accuracy, speed, highlight generation |

### ICP Firmographics
- **Company size:** 50-5,000 employees (mid-market to enterprise)
- **Verticals:** Media & Entertainment, Security/Surveillance, Sports, E-learning, AdTech, Healthcare (surgical video)
- **Technical signal:** Has engineering team, builds products (not just buys SaaS)
- **Stack signal:** Uses cloud infra (AWS, GCP, Azure), vector DBs (Pinecone, Milvus), data platforms (Databricks, Snowflake)
- **Video signal:** Company creates, hosts, or processes significant video content

### Negative ICP (Don't Target)
- Non-technical buyers with no engineering team
- Companies with < 100 hours of video content
- Pure consumer plays with no API integration need
- Companies already building in-house video ML (Google, Meta, etc.)

## Competitive Landscape
- **Direct:** Moments Lab, Mantis AI, LiveLink AI
- **Adjacent:** OpenAI (GPT-4V for video), Google (Gemini multimodal), Amazon Rekognition
- **Twelve Labs' edge:** Video-FIRST foundation models (not image models applied to video frames).
  Purpose-built for temporal relationships + multimodal understanding. Better accuracy
  on actual video comprehension benchmarks (not just frame-by-frame analysis).

## Recent News & Signals (good for personalization)
- Series B: $103M raised at $300M valuation (Dec 2024)
- AWS Bedrock integration: Marengo + Pegasus available as managed services
- 30,000+ developers on the platform
- Partners: AWS, Databricks, Snowflake, Adobe, Mimir, Iconik
- Moving toward "agentic video intelligence" (autonomous video understanding agents)
- Presented at AWS re:Invent 2025

## Value Proposition (for outbound on their behalf)
- "Build video intelligence into your product with a few API calls"
- "Stop treating video like a pile of frames — understand what's actually happening"
- "30,000 developers already use Twelve Labs to search, analyze, and understand video"
- "One-time indexing, unlimited downstream tasks — search, summarize, classify, embed"

## Tone Preferences
- **Formality:** Technical but approachable. Developer-friendly.
- **Approach:** Lead with the technical capability, ground in specific use case
- **Things to avoid:** Overpromising on AI ("revolutionary"), vague claims, non-technical fluff

## Campaign Angles Worth Testing
1. **"Video is the new unstructured data"** — for data/ML leaders at companies drowning in video
2. **"Your users are searching text. Your content is video."** — for product leaders adding search
3. **"Stop building video ML in-house"** — for engineering leaders burning cycles on video models
4. **"From 10,000 hours to the exact moment"** — for media/content companies with massive archives
5. **"Video understanding, not video generation"** — differentiation from text-to-video hype

## Personas

### VP Engineering
- **Why they buy:** Team is burning cycles building video search/analysis in-house with stitched-together open-source models. Twelve Labs replaces months of ML engineering with API calls.
- **What they care about:** API reliability and latency, cost per minute of video processed, accuracy on their specific content type, not adding ML headcount
- **Opening angle:** "Stop building video ML in-house" — reference their eng team size and video-heavy product
- **Language that works:** "API-first", "ship in days not quarters", "one integration, multiple use cases", "purpose-built models"
- **Language to avoid:** "AI-powered" (too generic), "revolutionary" (overpromise), "end-to-end platform" (they want focused tools)

### CTO
- **Why they buy:** Needs video intelligence as a core product capability without the risk of training and maintaining foundation models in-house.
- **What they care about:** Model quality benchmarks, embedding flexibility for their architecture, vendor lock-in risk, scalability under load
- **Opening angle:** "Video understanding, not video generation" — differentiate from the GPT-4V / Gemini noise
- **Language that works:** "Foundation models purpose-built for video", "temporal understanding", "multimodal embeddings", "AWS Bedrock managed"
- **Language to avoid:** "Black box AI", anything that implies they can't evaluate the models themselves

### Data Leader
- **Why they buy:** Video is the largest unstructured data type they can't query. Twelve Labs makes video searchable and embeddable like text.
- **What they care about:** Embedding quality for RAG pipelines, vector DB integrations (Pinecone, Milvus), batch processing throughput, cost per inference
- **Opening angle:** "Video is the new unstructured data" — reference their data stack (Databricks, Snowflake)
- **Language that works:** "Multimodal embeddings", "video-to-vector", "batch indexing", "integrate with your existing data stack"
- **Language to avoid:** "Simple drag-and-drop" (they want technical depth), consumer-grade language

### Product Leader
- **Why they buy:** Users want to search and navigate video content, but current search is text-metadata only. Twelve Labs enables true semantic video search.
- **What they care about:** Time-to-integration, SDK quality, use case fit for their specific content type, user experience impact
- **Opening angle:** "Your users are searching text. Your content is video." — reference a specific feature gap in their product
- **Language that works:** "Semantic search", "natural language queries over video", "find the exact moment", "user engagement"
- **Language to avoid:** Infrastructure jargon (they care about user outcomes, not model architecture)

## Battle Cards

### vs OpenAI (GPT-4V for video)
- **Their pitch:** General-purpose multimodal AI that can understand images and video frames
- **Our edge:** Twelve Labs models are video-FIRST — they understand temporal relationships, audio-visual alignment, and scene progression. GPT-4V analyzes individual frames, missing what happens between them.
- **When they win:** Customer just needs basic frame-level description or already uses OpenAI for everything
- **When we win:** Customer needs actual video comprehension — searching for moments, understanding sequences, analyzing temporal patterns
- **Trap question:** "How does your current approach handle temporal relationships — like finding the moment someone says X while doing Y?"

### vs Google (Gemini multimodal)
- **Their pitch:** Massive multimodal model that handles text, images, audio, and video
- **Our edge:** Twelve Labs is purpose-built for video with dedicated search and generation APIs. Gemini is a generalist — good at many things, best-in-class at none for video-specific tasks.
- **When they win:** Customer is already deep in Google Cloud ecosystem and needs "good enough" video analysis
- **When we win:** Customer needs best-in-class video search accuracy, dedicated video APIs, or runs on AWS/multi-cloud
- **Trap question:** "Have you benchmarked video search accuracy specifically, or are you evaluating general multimodal capabilities?"

### vs Amazon Rekognition
- **Their pitch:** AWS-native video analysis — object detection, face recognition, content moderation
- **Our edge:** Rekognition does label-based analysis (objects, faces). Twelve Labs does semantic understanding (find the moment where the CEO discusses revenue growth). Completely different capability layer.
- **When they win:** Customer only needs basic object/face detection and is locked into AWS
- **When we win:** Customer needs semantic search, natural language queries, video summarization, or multimodal embeddings
- **Trap question:** "Can you search your video archive using a natural language question — like 'show me every scene where a customer complaint is discussed'?"

## Signal Playbook
| Signal | What It Means | Messaging Angle | Urgency |
|--------|--------------|-----------------|---------|
| Funding round | Scaling pressure, new budget | "Building video features post-raise" | High — 30 day window |
| Hiring ML/AI engineers | Building video/AI capabilities in-house | "Ship video intelligence without the ML hiring cycle" | High — they're spending now |
| Video product launch | Already investing in video, may need better tooling | "Level up your video features" | Medium |
| Partnership with video platform | Expanding video ecosystem | "Adding intelligence to your video pipeline" | Medium |
| Content library growth | More video = more need for search/analysis | "From 10,000 hours to the exact moment" | Medium |
| Competitor using Twelve Labs | Social proof / FOMO | "[Competitor] just shipped video search — here's how" | High |
| Tech stack includes vector DBs | Ready for embeddings-based approach | "Add video to your RAG pipeline" | Low — nurture |

## Proven Responses
(Empty — populate as campaigns generate results)

## Active Campaigns
| Campaign | Angle | Status | Pipeline | Notes |
|----------|-------|--------|----------|-------|
