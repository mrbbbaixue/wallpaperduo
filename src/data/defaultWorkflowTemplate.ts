export const defaultComfyWorkflowTemplate = `{
  "1": {
    "inputs": {
      "text": "A cinematic wallpaper",
      "clip": ["2", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "2": {
    "inputs": {
      "text": "blurry, noisy, artifacts",
      "clip": ["2", 1]
    },
    "class_type": "CLIPTextEncode"
  },
  "3": {
    "inputs": {
      "seed": 123456,
      "steps": 20,
      "cfg": 6,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["1", 0],
      "negative": ["2", 0],
      "latent_image": ["5", 0]
    },
    "class_type": "KSampler"
  }
}`;
