"""Base agent definition (stub)."""
from abc import ABC, abstractmethod


class BaseAgent(ABC):
    """Common contract for all PhysioVision agents."""

    name: str = "base"
    description: str = "Abstract agent."

    @abstractmethod
    async def run(self, target_id: int, **kwargs) -> dict:
        """Execute the agent against a target resource and return results."""
        raise NotImplementedError
