"""
Run all 4 Layer 4 uAgents in a single process using Bureau.

  cd backend && python -m app.agents.layer4.run_all

All 4 agent addresses are printed at startup — save them for the orchestrator.
"""
from __future__ import annotations

from uagents import Bureau

from app.agents.layer4.aggressive_agent import agent as aggressive_agent
from app.agents.layer4.neutral_agent import agent as neutral_agent
from app.agents.layer4.conservative_agent import agent as conservative_agent
from app.agents.layer4.risk_manager_agent import agent as risk_manager_agent

if __name__ == "__main__":
    bureau = Bureau()
    bureau.add(aggressive_agent)
    bureau.add(neutral_agent)
    bureau.add(conservative_agent)
    bureau.add(risk_manager_agent)
    bureau.run()
