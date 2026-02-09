"""Tests for Hugging Face Inference node compiler."""

import pytest
from app.models.flow import FlowNode, NodeConfig, HuggingFaceInferenceConfig


def test_huggingface_inference_compiler_basic():
    """Test basic Hugging Face Inference compilation."""
    from app.compiler.nodes.huggingface_inference_compiler import HuggingFaceInferenceNodeCompiler

    node = FlowNode(
        id="test-hf",
        type="huggingface_inference",
        config=NodeConfig(
            huggingface_inference=HuggingFaceInferenceConfig(
                model_id="gpt2",
                task="text-generation",
                parameters={"max_length": 50},
                input_key="{{upstream.data}}"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = HuggingFaceInferenceNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["node_type"] == "huggingface_inference"
    assert result["node_id"] == "test-hf"
    assert result["model_id"] == "gpt2"
    assert result["task"] == "text-generation"
    assert result["parameters"]["max_length"] == 50
    assert result["input_key"] == "{{upstream.data}}"


def test_huggingface_inference_compiler_embeddings():
    """Test HF Inference with embeddings task."""
    from app.compiler.nodes.huggingface_inference_compiler import HuggingFaceInferenceNodeCompiler

    node = FlowNode(
        id="test-embeddings",
        type="huggingface_inference",
        config=NodeConfig(
            huggingface_inference=HuggingFaceInferenceConfig(
                model_id="sentence-transformers/all-MiniLM-L6-v2",
                task="embeddings",
                parameters={},
                input_key="{{upstream.text}}"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = HuggingFaceInferenceNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["model_id"] == "sentence-transformers/all-MiniLM-L6-v2"
    assert result["task"] == "embeddings"
    assert result["input_key"] == "{{upstream.text}}"


def test_huggingface_inference_compiler_with_credential():
    """Test HF Inference with credential ID."""
    from app.compiler.nodes.huggingface_inference_compiler import HuggingFaceInferenceNodeCompiler

    node = FlowNode(
        id="test-cred",
        type="huggingface_inference",
        config=NodeConfig(
            huggingface_inference=HuggingFaceInferenceConfig(
                model_id="meta-llama/Llama-2-7b-chat-hf",
                task="text-generation",
                parameters={"temperature": 0.7, "top_p": 0.95},
                credential_id="cred-hf-123"
            )
        ),
        position={"x": 0, "y": 0}
    )

    compiler = HuggingFaceInferenceNodeCompiler()
    result = compiler.compile(node, context={})

    assert result["credential_id"] == "cred-hf-123"
    assert result["parameters"]["temperature"] == 0.7
    assert result["parameters"]["top_p"] == 0.95


def test_huggingface_inference_compiler_node_type():
    """Test compiler reports correct node type."""
    from app.compiler.nodes.huggingface_inference_compiler import HuggingFaceInferenceNodeCompiler

    compiler = HuggingFaceInferenceNodeCompiler()
    assert compiler.node_type == "huggingface_inference"


def test_huggingface_inference_compiler_missing_config():
    """Test compiler raises error when config is missing."""
    from app.compiler.nodes.huggingface_inference_compiler import HuggingFaceInferenceNodeCompiler

    node = FlowNode(
        id="test-missing",
        type="huggingface_inference",
        config=NodeConfig(),  # Missing huggingface_inference config
        position={"x": 0, "y": 0}
    )

    compiler = HuggingFaceInferenceNodeCompiler()

    with pytest.raises(ValueError, match="missing huggingface_inference configuration"):
        compiler.compile(node, context={})
