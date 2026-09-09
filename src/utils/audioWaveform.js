// Web Audio Waveform Peak Analyzer

export async function extractAudioPeaks(videoUrlOrFile, samples = 200) {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let arrayBuffer;

    if (typeof videoUrlOrFile === 'string') {
      const response = await fetch(videoUrlOrFile);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await videoUrlOrFile.arrayBuffer();
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const peaks = [];

    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[blockStart + j]);
      }
      peaks.push(Math.min(1, (sum / blockSize) * 2.5));
    }

    return {
      peaks,
      duration: audioBuffer.duration
    };
  } catch (err) {
    const fallbackPeaks = [];
    for (let i = 0; i < samples; i++) {
      const t = i / samples;
      const burst = Math.sin(t * 30) * Math.cos(t * 12);
      fallbackPeaks.push(Math.max(0.1, Math.min(0.95, Math.abs(burst) * (0.4 + 0.6 * Math.sin(i * 0.2)))));
    }
    return {
      peaks: fallbackPeaks,
      duration: 15
    };
  }
}
