from google.adk.agents import Agent
from google.adk.tools import FunctionTool

async def dummy_tool():
    pass

print("Testing FunctionTool(dummy_tool)...")
try:
    Agent(
        name="test",
        tools=[FunctionTool(dummy_tool)]
    )
    print("  Success wrapper!")
except Exception as e:
    print(f"  Failed: {e}")

print("\nTesting raw dummy_tool...")
try:
    Agent(
        name="test",
        tools=[dummy_tool]
    )
    print("  Success raw!")
except Exception as e:
    print(f"  Failed: {e}")
