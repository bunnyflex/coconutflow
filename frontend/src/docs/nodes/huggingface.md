# Hugging Face Inference Node

The Hugging Face node calls the Hugging Face Inference API to run any hosted model. It supports text generation, text classification, embeddings, and other inference tasks.

## Configuration

| Field | Description |
|-------|-------------|
| Model ID | The Hugging Face model repository (e.g. `mistralai/Mistral-7B-Instruct-v0.2`) |
| Task | Inference task type: `text-generation`, `text-classification`, `feature-extraction`, etc. |
| API Key | Your Hugging Face API token |
| Parameters | Optional JSON object of model-specific parameters |

## Requirements

- A Hugging Face account — sign up at [huggingface.co](https://huggingface.co)
- An API token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
- The target model must be available via the Inference API (shown on the model page)

## Common Tasks

| Task | Description |
|------|-------------|
| `text-generation` | Generate text completions (chat, summarisation) |
| `text-classification` | Classify text into categories (sentiment, topic) |
| `feature-extraction` | Generate embeddings for semantic similarity |
| `question-answering` | Extract answers from context |

## Example Parameters

```json
{
  "max_new_tokens": 256,
  "temperature": 0.7,
  "return_full_text": false
}
```

## Tips

- Free-tier Inference API has rate limits; use a paid plan for production
- Save your HuggingFace token in the Keys page
- For open-weight models requiring more compute, consider Hugging Face Inference Endpoints
