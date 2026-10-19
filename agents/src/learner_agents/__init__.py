def main() -> None:
    """Run the agents service with auto-reload: `uv run learner-agents`."""
    import uvicorn
    from uvicorn._subprocess import get_subprocess
    from uvicorn.supervisors import ChangeReload

    from learner_agents.core.config import get_settings

    class KillingReload(ChangeReload):
        # On Windows uvicorn stops the old worker with os.kill(pid, CTRL_C_EVENT). With no real console (the Claude
        # desktop preview, a background shell) the event never arrives, so join() blocks forever and stale code is
        # served. Kill the worker instead, as uvicorn already does elsewhere (SIGTERM). On Windows that's a hard kill:
        # a plan job it had claimed is picked up again once its lock goes stale (planner/jobs.py STALE_LOCK).
        def restart(self) -> None:
            self.process.terminate()
            self.process.join()
            self.process = get_subprocess(config=self.config, target=self.target, sockets=self.sockets)
            self.process.start()

    config = uvicorn.Config(
        "learner_agents.main:create_app", factory=True, host="127.0.0.1", port=get_settings().port, reload=True
    )
    KillingReload(config, target=uvicorn.Server(config).run, sockets=[config.bind_socket()]).run()
