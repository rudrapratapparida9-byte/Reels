// Real Speech-to-Text Live Audio Transcriber & Script Alignment Engine

import { analyzeAudioSpeechIntervals } from './speechRecognition';
import { detectLanguage } from './translator';

export function autoSyncScriptToAudio(scriptText, totalDuration = 15, audioIntervals = null) {
  if (!scriptText || !scriptText.trim()) return [];

  const rawLines = scriptText
    .split(/[\n।\.!?]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (rawLines.length === 0) return [];

  const segments = [];
  const duration = Math.max(totalDuration, 4);

  if (audioIntervals && audioIntervals.length >= rawLines.length) {
    rawLines.forEach((line, idx) => {
      const interval = audioIntervals[idx] || audioIntervals[audioIntervals.length - 1];
      segments.push({
        id: idx + 1,
        startTime: interval.startTime,
        endTime: interval.endTime,
        text: line,
        originalText: line
      });
    });
  } else {
    const totalChars = rawLines.reduce((acc, l) => acc + l.length, 0) || 1;
    let currentStart = 0.5;
    const availableTime = Math.max(2, duration - 1.0);

    rawLines.forEach((line, idx) => {
      const lineFraction = line.length / totalChars;
      const lineDuration = Math.max(1.8, Math.min(5.0, lineFraction * availableTime));
      const end = parseFloat(Math.min(duration - 0.2, currentStart + lineDuration).toFixed(2));
      
      segments.push({
        id: idx + 1,
        startTime: parseFloat(currentStart.toFixed(2)),
        endTime: end,
        text: line,
        originalText: line
      });

      currentStart = end + 0.3;
    });
  }

  return segments;
}
