# Local Model Deployment Guide

Running LLMs locally for AIWG workflows. Covers Ollama, llama.cpp, and vLLM; quantization trade-offs; hardware sizing; and how to connect local models to AIWG via OpenAI-compatible APIs.

---

## When to Use This Guide

Use this guide if you are:

- Running AIWG in an air-gapped or on-premises environment
- Reducing API costs for high-volume, repetitive SDLC tasks
- Experimenting with open-weight models alongside Claude or GPT
- Setting up a local fallback for when API providers are unavailable

---

## Quick Start

```bash
# Install Ollama (macOS / Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull and run a model
ollama pull llama3.3:70b
ollama serve

# Point AIWG at the local endpoint
export OPENAI_BASE_URL="http://localhost:11434/v1"
export OPENAI_API_KEY="ollama"  # Ollama accepts any non-empty key

# Deploy AIWG using the local endpoint
aiwg use sdlc --provider codex
```

---

## Decision Tree: Is Local Worth It?

```
Do you have GPU hardware with >= 16GB VRAM?
  No → Cloud API is almost certainly cheaper. Stop here.
  Yes → Continue.

Are your tasks highly repetitive (batch processing, summaries, formatting)?
  Yes → Local is likely cost-effective for the haiku/efficiency tier.
  No → Cloud API may still be cheaper when you factor in GPU time.

Do you have data residency or air-gap requirements?
  Yes → Local is required regardless of cost.

Are you running > 10,000 requests/month on the efficiency tier?
  Yes → Calculate break-even point (see Cost Comparison section).
```

---

## Ollama

Ollama is the fastest path to a working local model. It handles model download, quantization selection, and serving.

### Installation

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows (PowerShell)
winget install Ollama.Ollama

# Verify
ollama --version
```

### Recommended Models by Use Case

| Use Case | Model | Size | VRAM Required |
|----------|-------|------|---------------|
| Code generation (sonnet-tier) | codellama:34b | ~20GB | 24GB |
| Code generation (budget) | codellama:13b | ~8GB | 10GB |
| General reasoning | llama3.3:70b | ~40GB | 48GB |
| General reasoning (budget) | llama3.1:8b | ~5GB | 6GB |
| Fast summaries (haiku-tier) | llama3.2:3b | ~2GB | 4GB |
| Code completion | qwen2.5-coder:14b | ~9GB | 12GB |

```bash
# Pull models
ollama pull codellama:34b
ollama pull llama3.3:70b
ollama pull llama3.2:3b

# List running models
ollama ps

# Check available models
ollama list
```

### OpenAI-Compatible Endpoint

Ollama exposes an OpenAI-compatible API at `http://localhost:11434/v1`. No extra configuration is required.

```bash
# Test the endpoint
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ollama" \
  -d '{
    "model": "llama3.1:8b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Persistent Service

```bash
# macOS: Ollama runs as a background service after install
# Linux: Enable and start the systemd service
sudo systemctl enable ollama
sudo systemctl start ollama

# Check status
sudo systemctl status ollama
```

---

## llama.cpp

For maximum control over inference parameters, quantization, and hardware utilization, use llama.cpp directly.

### Installation

```bash
# Clone and build (requires cmake and a C++ compiler)
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
cmake -B build -DLLAMA_CUDA=ON   # Add -DLLAMA_CUDA=ON for NVIDIA GPU
cmake --build build --config Release -j $(nproc)
```

### Starting the Server

```bash
# Serve a GGUF model on OpenAI-compatible API
./build/bin/llama-server \
  --model models/codellama-34b-instruct.Q5_K_M.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --n-gpu-layers 40 \
  --ctx-size 8192 \
  --parallel 4
```

Key flags:

| Flag | Description |
|------|-------------|
| `--n-gpu-layers` | Layers to offload to GPU (higher = faster, more VRAM) |
| `--ctx-size` | Context window size (larger = more VRAM) |
| `--parallel` | Concurrent request slots |
| `--n-predict` | Max tokens per response |

### Finding GGUF Models

```bash
# Download from Hugging Face using huggingface-cli
pip install huggingface_hub
huggingface-cli download \
  TheBloke/CodeLlama-34B-Instruct-GGUF \
  codellama-34b-instruct.Q5_K_M.gguf \
  --local-dir ./models/
```

---

## vLLM

vLLM provides production-grade serving with continuous batching and high throughput. Use it when serving multiple concurrent AIWG agent sessions.

### Installation

```bash
pip install vllm
```

### Starting the Server

```bash
# Serve with OpenAI-compatible API
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.3-70B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 2 \  # Number of GPUs
  --dtype bfloat16 \
  --max-model-len 32768
```

### When to Use vLLM vs. Ollama vs. llama.cpp

| Scenario | Recommended Tool |
|----------|-----------------|
| Personal/dev use, 1 user | Ollama |
| Maximum control, embedded use | llama.cpp |
| Team deployment, multiple concurrent users | vLLM |
| Production serving with SLAs | vLLM |
| Air-gapped workstation | Ollama or llama.cpp |

---

## Quantization Impact on Agent Performance

Quantization compresses model weights, reducing VRAM requirements at the cost of some quality. The trade-off is well-characterized for coding and reasoning tasks.

### Quantization Levels

| Format | Quality vs. F16 | Size vs. F16 | VRAM vs. F16 | Notes |
|--------|----------------|--------------|--------------|-------|
| F16 | Baseline (100%) | 100% | 100% | Maximum quality, most VRAM |
| Q8_0 | ~99% | 50% | 50% | Near-lossless, recommended if VRAM allows |
| Q5_K_M | ~97% | 31% | 31% | Best size/quality balance |
| Q4_K_M | ~95% | 25% | 25% | Good for coding tasks, some degradation on reasoning |
| Q4_0 | ~93% | 23% | 23% | Faster inference, more quality loss |
| Q2_K | ~87% | 13% | 13% | Useful only for low-complexity tasks |

### Quantization Recommendations by AIWG Tier

| AIWG Tier | Task Type | Minimum Quantization | Recommended |
|-----------|-----------|---------------------|-------------|
| opus (reasoning) | Architecture, security review | Q5_K_M | Q8_0 or F16 |
| sonnet (coding) | Code generation, debugging | Q4_K_M | Q5_K_M |
| haiku (efficiency) | Summaries, formatting | Q4_0 | Q4_K_M |

For security-critical tasks (threat modeling, vulnerability review), use Q8_0 or F16. Quality loss in lower quantizations can cause subtle reasoning errors that are difficult to detect.

---

## Hardware Requirements by Model Size

### Minimum VRAM for Full GPU Inference

| Model Size | Q4_K_M | Q5_K_M | Q8_0 | F16 |
|------------|--------|--------|------|-----|
| 3B | 2GB | 2.5GB | 4GB | 6GB |
| 7B | 4GB | 5GB | 8GB | 14GB |
| 13B | 8GB | 10GB | 14GB | 26GB |
| 34B | 20GB | 25GB | 38GB | 68GB |
| 70B | 40GB | 50GB | 75GB | 140GB |

### GPU Hardware Reference

| GPU | VRAM | Usable Models |
|-----|------|---------------|
| RTX 4060 | 8GB | 7B Q4, 13B partial offload |
| RTX 4070 Ti | 12GB | 13B Q4, 7B Q8 |
| RTX 4090 | 24GB | 34B Q4, 13B Q8, 7B F16 |
| 2x RTX 4090 | 48GB | 70B Q4, 34B Q8 |
| A100 80GB | 80GB | 70B Q8, 34B F16 |
| 2x A100 80GB | 160GB | 70B F16 |

### CPU Fallback

llama.cpp supports CPU inference for machines without sufficient VRAM. Expect 5–20x slower throughput than GPU. Acceptable for low-volume efficiency-tier tasks.

```bash
# CPU-only (no GPU flags)
./build/bin/llama-server \
  --model models/llama3.2-3b.Q5_K_M.gguf \
  --ctx-size 4096
```

---

## Cost Comparison: Local vs. API

### Example: Efficiency-Tier Agent at Scale

Scenario: Running 50,000 requests/month with average 500 input + 200 output tokens each.

| Approach | Monthly Cost | Notes |
|----------|-------------|-------|
| codex-mini-latest (API) | ~$52 | $1.50/1M input + $6/1M output |
| claude-haiku-3-5 (API) | ~$25 | $0.25/1M input + $1.25/1M output |
| Ollama on RTX 4070 Ti | ~$15 | Electricity at $0.15/kWh, 80W GPU load |
| Ollama on A100 (cloud) | ~$300 | $2/hr instance, 6 hrs/day at batch |

At 50,000 requests/month, local inference on owned hardware is competitive only when:
- The GPU is already paid for and sitting idle
- Electricity costs are low
- Requests are batchable (no interactive latency requirement)

For interactive SDLC workflows, cloud API almost always wins on effective cost per hour of developer time saved.

### Break-Even Calculation

```
GPU cost: $1,500 (RTX 4090)
Monthly electricity: $20
API cost avoided: $100/month (efficiency-tier at medium volume)

Break-even: $1,500 / ($100 - $20) = 18.75 months

If you plan to run for > 19 months AND have data residency needs: local wins.
Otherwise: cloud API is more practical.
```

---

## AIWG Integration: Configuring Local Model Providers

### Environment Variables

```bash
# Point AIWG's OpenAI-compatible calls at local endpoint
export OPENAI_BASE_URL="http://localhost:11434/v1"  # Ollama
export OPENAI_API_KEY="local"                        # Any non-empty value

# Or for llama.cpp server
export OPENAI_BASE_URL="http://localhost:8080/v1"

# Or for vLLM
export OPENAI_BASE_URL="http://localhost:8000/v1"
```

### models.json for Local Models

```json
{
  "openai": {
    "reasoning": {
      "model": "llama3.3:70b",
      "description": "Local 70B for complex reasoning"
    },
    "coding": {
      "model": "codellama:34b",
      "description": "Local CodeLlama for implementation"
    },
    "efficiency": {
      "model": "llama3.2:3b",
      "description": "Local 3B for quick tasks"
    }
  },
  "shorthand": {
    "opus": "llama3.3:70b",
    "sonnet": "codellama:34b",
    "haiku": "llama3.2:3b"
  }
}
```

### Testing the Connection

```bash
# Verify AIWG can reach the local endpoint
curl "$OPENAI_BASE_URL/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Should return a list of available local models
```

### Prompt Format Considerations

Some open-weight models require specific prompt formats. Ollama handles this automatically. If using llama.cpp or vLLM directly, specify the correct template:

```bash
# llama.cpp: use the model's chat template
./build/bin/llama-server \
  --model models/llama3.3-70b.Q5_K_M.gguf \
  --chat-template llama3  # Applies correct <|begin_of_text|> formatting
```

Common templates: `llama2`, `llama3`, `chatml`, `mistral`, `gemma`.

---

## Performance Tuning

### Context Size vs. VRAM

Larger context windows require more VRAM for the KV cache:

```
KV cache ≈ 2 × n_layers × n_heads × head_dim × ctx_size × 2 bytes (fp16)

For Llama 3.1 8B at ctx=8192: ~0.5GB additional VRAM
For Llama 3.1 8B at ctx=32768: ~2GB additional VRAM
```

Set context size to match your actual usage, not the model maximum.

### Parallel Slots

```bash
# llama.cpp: allow 4 concurrent AIWG agents
./build/bin/llama-server --parallel 4

# vLLM handles this automatically via continuous batching
```

### Ollama Concurrency

```bash
# Set concurrency in Ollama environment
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_MAX_LOADED_MODELS=2
```

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| VRAM OOM error | Model too large for available VRAM | Use lower quantization or smaller model |
| Slow first response | Model loading on first request | Pre-warm with a test request at startup |
| Garbled output | Wrong prompt format/template | Specify `--chat-template` in llama.cpp or use Ollama |
| `connection refused` | Server not running | Verify `ollama serve` or llama-server is active |
| Low throughput on batch ops | Sequential processing | Enable `--parallel` in llama.cpp or use vLLM |
| AIWG sends to wrong endpoint | `OPENAI_BASE_URL` not set | Export variable before running `aiwg` commands |

---

## See Also

- `docs/models/hybrid-architectures.md` — Routing between local and cloud models
- `docs/models/gpt-optimization.md` — OpenAI-compatible API patterns
- `docs/integrations/codex-quickstart.md` — Codex CLI setup
- `agentic/code/addons/rlm/README.md` — Handling large contexts with local models
