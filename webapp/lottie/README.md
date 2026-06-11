# Lottie Animation Files

This folder contains local Lottie JSON animations for **offline support**.

## When to use local files

Use local files (via `localPath` prop) when the animation needs to work offline:
- **AppHome** and other offline-capable features
- Critical loading states that must always display
- Animations shown before network is available

## CDN vs Local

| Approach | Pros | Cons |
|----------|------|------|
| **CDN (default)** | Smaller bundle, no maintenance | Requires network |
| **Local files** | Works offline, faster first load | Increases app size |

## Adding local animations

1. Download JSON from [LottieFiles](https://lottiefiles.com)
2. Place in this folder with descriptive name
3. Reference via `localPath="/lottie/your-animation.json"`

## Example usage

```vue
<!-- Online mode (CDN) -->
<LottieLoading />

<!-- Offline mode (local file) -->
<LottieLoading localPath="/lottie/loading-dots.json" />
```

## Recommended local animations for offline

- `loading-dots.json` - Primary loading spinner
- `empty-box.json` - Empty state illustration  
- `success-check.json` - Success confirmation
- `error-x.json` - Error state
