// In-browser Canvas 2D + MediaRecorder Video Burn-in Exporter

export async function exportCaptionedVideo(
  videoElement,
  segments,
  style,
  onProgress,
  onStatusUpdate
) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!videoElement) {
        throw new Error("Video element is not available");
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const videoWidth = videoElement.videoWidth || 1280;
      const videoHeight = videoElement.videoHeight || 720;

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const duration = videoElement.duration || 15;

      onStatusUpdate?.("Preparing video & audio stream tracks...");

      const canvasStream = canvas.captureStream(30);

      let combinedStream = canvasStream;
      try {
        let audioStream = null;
        if (videoElement.captureStream) {
          audioStream = videoElement.captureStream();
        } else if (videoElement.mozCaptureStream) {
          audioStream = videoElement.mozCaptureStream();
        }

        if (audioStream && audioStream.getAudioTracks().length > 0) {
          audioStream.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
        }
      } catch (e) {}

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5000000
      });

      const recordedChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        resolve({
          blob,
          url,
          extension: 'webm'
        });
      };

      onStatusUpdate?.("Rendering hardcoded subtitles frame by frame...");
      mediaRecorder.start();

      videoElement.currentTime = 0;
      videoElement.muted = false;
      await videoElement.play();

      const renderFrame = () => {
        if (videoElement.paused || videoElement.ended) {
          if (videoElement.ended || videoElement.currentTime >= duration - 0.1) {
            mediaRecorder.stop();
            return;
          }
        }

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

        const currTime = videoElement.currentTime;
        const activeSeg = segments.find(
          (s) => currTime >= s.startTime && currTime <= s.endTime
        );

        if (activeSeg && activeSeg.text) {
          const fontSize = Math.max(24, Math.round((style.fontSize || 28) * (canvas.height / 720)));
          const fontFamily = style.fontFamily || 'Inter';

          ctx.font = `${style.fontWeight || '700'} ${fontSize}px ${fontFamily}, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const text = style.textTransform === 'uppercase' 
            ? activeSeg.text.toUpperCase() 
            : style.textTransform === 'lowercase' 
            ? activeSeg.text.toLowerCase() 
            : activeSeg.text;

          const posYRatio = (style.customY || 82) / 100;
          const posX = canvas.width / 2;
          const posY = canvas.height * posYRatio;

          const textMetrics = ctx.measureText(text);
          const padding = style.bgPadding || 14;

          if (style.showBg) {
            ctx.fillStyle = style.bgColor || 'rgba(0, 0, 0, 0.85)';
            const bgWidth = textMetrics.width + padding * 2.5;
            const bgHeight = fontSize * 1.5 + padding;
            
            ctx.beginPath();
            ctx.roundRect(
              posX - bgWidth / 2,
              posY - bgHeight / 2,
              bgWidth,
              bgHeight,
              12
            );
            ctx.fill();
          }

          if (style.strokeWidth > 0) {
            ctx.lineWidth = style.strokeWidth * (canvas.height / 720);
            ctx.strokeStyle = style.strokeColor || '#000000';
            ctx.strokeText(text, posX, posY);
          }

          ctx.fillStyle = style.textColor || '#ffffff';
          ctx.fillText(text, posX, posY);
        }

        const progressPercent = Math.min(99, Math.round((currTime / duration) * 100));
        onProgress?.(progressPercent);

        if (!videoElement.ended) {
          requestAnimationFrame(renderFrame);
        }
      };

      requestAnimationFrame(renderFrame);

    } catch (err) {
      reject(err);
    }
  });
}
