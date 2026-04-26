"""
Run Layer 5 uAgents in a single process using Bureau.

  cd backend && python -m app.agents.layer5.run_all
"""
from __future__ import annotations

from uagents import Bureau

from app.agents.layer5.wealth_manager_agent import agent as wealth_manager_agent


if __name__ == "__main__":
    bureau = Bureau()
    bureau.add(wealth_manager_agent)
    bureau.run()
