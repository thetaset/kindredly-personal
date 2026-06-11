# Text Embedding Service - Model Setup

## Overview

The Text Embedding Service uses the **all-MiniLM-L6-v2** model from Hugging Face for generating semantic embeddings. This model provides:
- 384-dimensional embeddings
- ~23MB size (quantized ONNX format)
- Good balance of speed and quality
- Works in browser via ONNX Runtime Web

## Model Download Instructions

### Option 1: Automatic Download (Recommended)

The model will be automatically downloaded from Hugging Face when first used. Transformers.js handles this automatically.

**Configuration is already set in the service:**
```typescript
// For webapp (browser mode)
env.localModelPath = "/modeldata/";
env.allowRemoteModels = false;
env.allowLocalModels = true;

// For extension
env.localModelPath = chrome.runtime.getURL('/modeldata');
env.allowRemoteModels = false;
env.allowLocalModels = true;
```

### Option 2: Manual Download (For Offline Use)

If you want to bundle the model with your application:

1. **Create the model directory:**
```bash
mkdir -p tset-client/public/modeldata/Xenova/all-MiniLM-L6-v2
```

2. **Download the model files:**

You can use the Hugging Face CLI or download manually:

```bash
# Install Hugging Face CLI
pip install huggingface_hub

# Download the model
huggingface-cli download Xenova/all-MiniLM-L6-v2 \
  --local-dir tset-client/public/modeldata/Xenova/all-MiniLM-L6-v2 \
  --local-dir-use-symlinks False
```

Or download manually from: https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main

**Required files:**
- `config.json` - Model configuration
- `tokenizer.json` - Tokenizer configuration
- `tokenizer_config.json` - Tokenizer settings
- `onnx/model.onnx` - Main ONNX model file (or quantized version)
- `onnx/model_quantized.onnx` - Quantized model (recommended for production)

3. **Directory structure should be:**
```
tset-client/public/modeldata/
└── Xenova/
    └── all-MiniLM-L6-v2/
        ├── config.json
        ├── tokenizer.json
        ├── tokenizer_config.json
        └── onnx/
            ├── model.onnx
            └── model_quantized.onnx
```

## Model Variants

The service supports different model variants:

### Current Model: all-MiniLM-L6-v2
- **Size:** ~23MB (quantized)
- **Dimensions:** 384
- **Speed:** Fast
- **Quality:** Good for most use cases
- **Use case:** General-purpose semantic search, similarity

### Alternative Models (Future)

If you need different trade-offs, you can modify the service to use:

1. **all-distilroberta-v1** (Higher quality, larger)
   - Size: ~82MB
   - Dimensions: 768
   - Better quality, slower

2. **all-MiniLM-L12-v2** (Better quality, same dimensions)
   - Size: ~33MB
   - Dimensions: 384
   - Slightly better quality

To switch models, edit `TextEmbeddingService.ts`:
```typescript
const modelName = 'Xenova/all-distilroberta-v1'; // Change model here
```

## TF-IDF Fallback

The service includes a TF-IDF fallback that doesn't require any model files:
- Automatically used if transformer model fails to load
- No download required
- Lower quality but always available
- Good for basic similarity matching

To force TF-IDF fallback:
```typescript
await service.generateEmbedding(text, { useFallback: true });
```

## Verifying Installation

To verify the model is working:

1. **Run the test suite:**
```bash
cd tset-client
npm run test __tests__/TextEmbeddingService.test.ts
```

2. **Or test in browser console:**
```javascript
import { TextEmbeddingService } from '@/bg/services/TextEmbeddingService';

const service = TextEmbeddingService.instance;
const result = await service.generateEmbedding('Hello world');
console.log('Model:', result.model);
console.log('Dimensions:', result.dimensions);
console.log('Embedding:', result.embedding.slice(0, 5)); // First 5 values
```

Expected output:
```
Model: all-MiniLM-L6-v2
Dimensions: 384
Embedding: [0.123, -0.456, 0.789, ...]
```

If you see `model: 'tf-idf'`, the transformer model failed to load and the fallback is being used.

## Troubleshooting

### Model won't load in browser

**Check console for errors:**
- CORS errors: Model files must be served from same origin
- 404 errors: Check model files are in `public/modeldata/`
- Memory errors: Try using quantized model variant

**Solutions:**
1. Verify files are in correct location
2. Check browser console for specific errors
3. Try using TF-IDF fallback temporarily
4. Clear browser cache and reload

### Model won't load in extension

**Extension-specific issues:**
- Check `manifest.json` includes model files in `web_accessible_resources`
- Verify `chrome.runtime.getURL()` returns correct path
- Check extension has sufficient storage permissions

**Add to manifest.json:**
```json
{
  "web_accessible_resources": [{
    "resources": ["modeldata/*"],
    "matches": ["<all_urls>"]
  }]
}
```

### Slow first load

First load downloads and initializes the model (~23MB):
- Expected delay: 2-10 seconds depending on network
- Subsequent loads use browser cache: < 1 second
- Consider showing loading indicator to users

### Out of memory errors

If you get memory errors:
1. Use quantized model variant (smaller)
2. Reduce batch size in configuration
3. Clear embedding cache periodically
4. Consider server-side embeddings for large batches

## Performance Tips

1. **Enable caching:**
```typescript
service.configure({ 
  cacheEnabled: true,
  cacheTTL: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

2. **Batch multiple requests:**
```typescript
// Instead of:
for (const text of texts) {
  await service.generateEmbedding(text);
}

// Do:
await service.batchEmbeddings(texts.map((text, i) => ({ 
  id: i.toString(), 
  text 
})));
```

3. **Adjust concurrency:**
```typescript
service.configure({
  maxConcurrentProcessing: 5 // Process 5 items in parallel
});
```

4. **Use quantized model:**
Smaller, faster, minimal quality loss for most use cases.

## Storage Requirements

- **Model files:** ~23MB (quantized) or ~90MB (full precision)
- **Cache:** Varies based on usage
  - 1000 embeddings × 384 dims × 8 bytes ≈ 3MB
  - Configure `cacheTTL` to limit growth
- **Total:** ~30-100MB depending on cache

## Next Steps

Once the model is set up:

1. **Test basic functionality:** Run the test suite
2. **Integrate with your app:** Use BGRouter routes
3. **Build features:** Collection suggestions, tag suggestions, similarity search
4. **Monitor performance:** Check queue stats and adjust configuration

## Support

If you encounter issues:
1. Check browser console for errors
2. Run tests to verify setup
3. Try TF-IDF fallback mode
4. Review Transformers.js documentation: https://huggingface.co/docs/transformers.js

## References

- **Model:** https://huggingface.co/Xenova/all-MiniLM-L6-v2
- **Transformers.js:** https://huggingface.co/docs/transformers.js
- **ONNX Runtime Web:** https://onnxruntime.ai/docs/tutorials/web/
- **Original Model:** https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2
