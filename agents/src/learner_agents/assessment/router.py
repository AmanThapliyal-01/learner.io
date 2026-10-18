from typing import Annotated

from fastapi import APIRouter, Depends

from learner_agents.assessment.schemas import GenerateRequest, GenerateResponse, GradeRequest, GradeResponse
from learner_agents.assessment.service import AssessmentModels, assessment_models, generate, grade

router = APIRouter(prefix="/assessment", tags=["assessment"])

Models = Annotated[AssessmentModels, Depends(assessment_models)]


@router.post("/generate")
async def generate_questions(request: GenerateRequest, models: Models) -> GenerateResponse:
    """Target levels for every skill, plus 3 multiple-choice and 1 short-answer question per tested skill."""
    return await generate(request, models)


@router.post("/grade")
async def grade_answers(request: GradeRequest, models: Models) -> GradeResponse:
    """Scores every answer and returns the assessed level, strengths and gaps per skill."""
    return await grade(request, models)
