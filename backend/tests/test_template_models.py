"""Tests for template-related model fields on FlowDefinition."""
from app.models.flow import FlowDefinition


def test_flow_definition_defaults():
    """FlowDefinition defaults is_featured and is_public to False."""
    flow = FlowDefinition(id="test-1", name="Test")
    assert flow.is_featured is False
    assert flow.is_public is False
    assert flow.category is None


def test_flow_definition_template_fields():
    """FlowDefinition accepts template fields."""
    flow = FlowDefinition(
        id="test-2",
        name="Featured Flow",
        is_featured=True,
        is_public=True,
        category="research",
    )
    assert flow.is_featured is True
    assert flow.is_public is True
    assert flow.category == "research"
