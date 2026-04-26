"""
Run Layer 3 uAgents in a single process using Bureau.

  cd backend && python -m app.agents.layer3.run_all
"""
from __future__ import annotations

from uagents import Bureau

from app.agents.layer3.allocator_agent import agent as allocator_agent


if __name__ == "__main__":
    bureau = Bureau()
    bureau.add(allocator_agent)
    bureau.run()
