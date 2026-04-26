"""
Run all 3 Layer 2 uAgents in a single process using Bureau.

  cd backend && python3 -m app.agents.layer2.run_all

Each agent registers on Agentverse and prints its address.
Save addresses for orchestrator config.
"""
from __future__ import annotations

from uagents import Bureau

from app.agents.layer2.bear_agent import agent as bear_agent
from app.agents.layer2.bull_agent import agent as bull_agent
from app.agents.layer2.facilitator_agent import agent as facilitator_agent


if __name__ == "__main__":
    bureau = Bureau()
    bureau.add(bull_agent)
    bureau.add(bear_agent)
    bureau.add(facilitator_agent)
    bureau.run()
