const path = require('path');
const fs = require('fs');

/**
 * Native Keyword Spotting Engine using sherpa-onnx-node
 * Strictly offline, running in the Electron main process.
 */
class NativeWakeWordSpotter {
  constructor() {
    this.status = 'INITIALIZING'; // 'MODEL NOT INSTALLED' | 'INITIALIZING' | 'READY' | 'ERROR'
    this.errorMessage = null;
    this.spotter = null;
    this.stream = null;
    this.modelPath = null;
    this.lastDetectionTime = 0;
    this.cooldownMs = 2000;
    this.detectionCallback = null;
    this.sherpa = null;

    this.init();
  }

  setDetectionCallback(callback) {
    this.detectionCallback = callback;
  }

  init() {
    try {
      this.status = 'INITIALIZING';

      // 1. Try loading sherpa-onnx-node native addon
      try {
        this.sherpa = require('sherpa-onnx-node');
      } catch (err) {
        this.status = 'ERROR';
        this.errorMessage = `Native sherpa-onnx-node addon failed to load: ${err.message}`;
        console.warn('[NativeWakeWordSpotter]', this.errorMessage);
        return false;
      }

      // 2. Locate model directory
      const defaultModelDir = path.resolve(__dirname, '../models/wake-word/sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01');
      if (!fs.existsSync(defaultModelDir)) {
        this.status = 'MODEL NOT INSTALLED';
        this.errorMessage = `Model directory not found at ${defaultModelDir}`;
        return false;
      }

      // Verify required model files
      const encoderPath = path.join(defaultModelDir, 'encoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx');
      const decoderPath = path.join(defaultModelDir, 'decoder-epoch-12-avg-2-chunk-16-left-64.int8.onnx');
      const joinerPath = path.join(defaultModelDir, 'joiner-epoch-12-avg-2-chunk-16-left-64.int8.onnx');
      const tokensPath = path.join(defaultModelDir, 'tokens.txt');
      let keywordsPath = path.join(defaultModelDir, 'breakpoint_keywords.txt');

      if (!fs.existsSync(encoderPath) || !fs.existsSync(decoderPath) || !fs.existsSync(joinerPath) || !fs.existsSync(tokensPath)) {
        this.status = 'MODEL NOT INSTALLED';
        this.errorMessage = 'Required ONNX model files or tokens.txt are missing.';
        return false;
      }

      // 3. Ensure "Break Point" keywords file exists with exact BPE tokens: " ▁B R E A K ▁POINT"
      if (!fs.existsSync(keywordsPath)) {
        fs.writeFileSync(keywordsPath, ' ▁B R E A K ▁POINT\n', 'utf8');
      }

      // 4. Configure KeywordSpotter
      const config = {
        featConfig: {
          sampleRate: 16000,
          featureDim: 80
        },
        modelConfig: {
          transducer: {
            encoder: encoderPath,
            decoder: decoderPath,
            joiner: joinerPath
          },
          tokens: tokensPath,
          numThreads: 2,
          provider: 'cpu'
        },
        maxActivePaths: 4,
        numTrailingBlanks: 1,
        keywordsScore: 1.0,
        keywordsThreshold: 0.22,
        keywordsFile: keywordsPath
      };

      this.spotter = new this.sherpa.KeywordSpotter(config);
      this.stream = this.spotter.createStream();
      this.modelPath = defaultModelDir;
      this.status = 'READY';
      this.errorMessage = null;

      console.info('[NativeWakeWordSpotter] Genuine offline Sherpa-ONNX Zipformer engine initialized in READY state.');
      return true;
    } catch (err) {
      this.status = 'ERROR';
      this.errorMessage = `Spotter initialization error: ${err.message}`;
      console.error('[NativeWakeWordSpotter]', this.errorMessage);
      return false;
    }
  }

  feedPcmChunk(samples) {
    if (this.status !== 'READY' || !this.spotter || !this.stream) {
      return null;
    }

    try {
      // Input must be Float32Array at 16000Hz
      const float32Samples = samples instanceof Float32Array
        ? samples
        : new Float32Array(samples);

      if (float32Samples.length === 0) return null;

      this.stream.acceptWaveform({
        samples: float32Samples,
        sampleRate: 16000
      });

      let detectedResult = null;

      while (this.spotter.isReady(this.stream)) {
        this.spotter.decode(this.stream);
        const result = this.spotter.getResult(this.stream);

        if (result && result.keyword && result.keyword.trim().length > 0) {
          const now = Date.now();
          if (now - this.lastDetectionTime >= this.cooldownMs) {
            this.lastDetectionTime = now;
            detectedResult = {
              keyword: result.keyword,
              startTime: result.start_time,
              timestamps: result.timestamps,
              tokens: result.tokens,
              detectedAt: now
            };

            console.info('[NativeWakeWordSpotter] Genuine keyword detected:', JSON.stringify(detectedResult));

            if (this.detectionCallback) {
              this.detectionCallback(detectedResult);
            }
          }
          // Reset stream after keyword match to avoid duplicate triggers
          this.spotter.reset(this.stream);
          break;
        }
      }

      return detectedResult;
    } catch (err) {
      console.warn('[NativeWakeWordSpotter] Decode error:', err.message);
      return null;
    }
  }

  resetStream() {
    if (this.spotter && this.stream) {
      try {
        this.spotter.reset(this.stream);
      } catch {}
    }
  }

  stop() {
    this.resetStream();
  }

  getStatus() {
    return {
      status: this.status, // 'READY' | 'MODEL NOT INSTALLED' | 'INITIALIZING' | 'ERROR'
      engine: 'sherpa-onnx-node',
      model: 'sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01',
      license: 'Apache-2.0',
      modelPath: this.modelPath,
      isOfflineGuaranteed: true,
      lastDetectionTime: this.lastDetectionTime,
      errorMessage: this.errorMessage
    };
  }
}

const nativeWakeWordSpotter = new NativeWakeWordSpotter();

module.exports = {
  NativeWakeWordSpotter,
  nativeWakeWordSpotter
};
