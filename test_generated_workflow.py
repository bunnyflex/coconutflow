#!/usr/bin/env python3
"""
Python Export Test

Description: Input → Agent → Output test flow
Generated from CoconutFlow on 2026-02-12 09:46:37 UTC
"""

from agno import Agent
import asyncio


async def run_workflow(user_input: str):
    """Execute the workflow with given input."""
    # User Input
    print(f'Input: {user_input}')
    input_1 = user_input

    # AI Assistant
    agent_agent_1 = Agent(
        name='AI Assistant',
        model='openai:gpt-4o-mini',
        instructions='You are a helpful assistant.',
    )
    response_agent_1 = await agent_agent_1.run(str(user_input))
    agent_1 = response_agent_1.content

    # Response
    print(f'Output: {agent_1}')
    return agent_1



if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python workflow.py <input_text>")
        sys.exit(1)
    
    input_text = sys.argv[1]
    result = asyncio.run(run_workflow(input_text))
    print(f"\nFinal Result: {result}")
