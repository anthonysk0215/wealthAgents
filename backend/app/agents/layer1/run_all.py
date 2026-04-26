"""
Run all 4 Layer 1 uAgents in a single process using Bureau.

  cd backend && python -m app.agents.layer1.run_all

Each agent registers on Agentverse and prints its address.
All 4 addresses are printed in a block at startup — save them for the orchestrator.
"""
from __future__ import annotations

from uagents import Bureau

from app.agents.layer1.cash_flow_agent import agent as cash_flow_agent
from app.agents.layer1.retirement_agent import agent as retirement_agent
from app.agents.layer1.housing_agent import agent as housing_agent
from app.agents.layer1.investment_agent import agent as investment_agent

if __name__ == "__main__":
    bureau = Bureau()
    bureau.add(cash_flow_agent)
    bureau.add(retirement_agent)
    bureau.add(housing_agent)
    bureau.add(investment_agent)
    bureau.run()
