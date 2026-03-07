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
