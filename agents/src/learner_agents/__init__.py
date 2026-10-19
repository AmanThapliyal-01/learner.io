def main() -> None:
    """Run the agents service: `uv run learner-agents`."""
    import uvicorn

    from learner_agents.core.config import get_settings

    uvicorn.run(
        "learner_agents.main:create_app", factory=True, host="127.0.0.1", port=get_settings().port, reload=True
    )
