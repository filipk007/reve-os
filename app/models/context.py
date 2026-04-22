from pydantic import BaseModel


class ClientProfile(BaseModel):
    """Client profile v2 schema.

    Loads sections for email-gen (outbound copy): Who They Are, What They Sell,
    Value Proposition, Tone Preferences, Social Proof, Market Feedback.

    Strategy-skill-only sections: Target ICP, Competitive Landscape.

    Market Feedback is an append-only dated log written by the
    transcript-feedback-loop skill.
    """

    slug: str
    name: str
    who_they_are: str = ""
    what_they_sell: str = ""
    value_proposition: str = ""
    tone_preferences: str = ""
    social_proof: str = ""
    market_feedback: str = ""
    target_icp: str = ""
    competitive_landscape: str = ""
    raw_markdown: str = ""


class ClientSummary(BaseModel):
    slug: str
    name: str


class CreateClientRequest(BaseModel):
    slug: str
    name: str
    who_they_are: str = ""
    what_they_sell: str = ""
    value_proposition: str = ""
    tone_preferences: str = ""
    social_proof: str = ""
    market_feedback: str = ""
    target_icp: str = ""
    competitive_landscape: str = ""


class UpdateClientRequest(BaseModel):
    name: str | None = None
    who_they_are: str | None = None
    what_they_sell: str | None = None
    value_proposition: str | None = None
    tone_preferences: str | None = None
    social_proof: str | None = None
    market_feedback: str | None = None
    target_icp: str | None = None
    competitive_landscape: str | None = None


class KnowledgeBaseFile(BaseModel):
    path: str
    category: str
    name: str
    content: str


class UpdateKnowledgeBaseRequest(BaseModel):
    content: str


class CreateKnowledgeBaseRequest(BaseModel):
    category: str
    filename: str
    content: str


class PromptPreviewRequest(BaseModel):
    skill: str
    client_slug: str
    sample_data: dict | None = None


class PromptPreviewResponse(BaseModel):
    assembled_prompt: str
    context_files_loaded: list[str]
    estimated_tokens: int
