"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CameraState = "idle" | "starting" | "ready" | "denied" | "unavailable";

/**
 * Câmera frontal ao vivo para a selfie. Usa getUserMedia (não aceita foto da galeria).
 * `capture()` devolve um JPEG de até 640 px de largura.
 */
export function useCamera(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("ready");
    } catch (error) {
      setState(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Inicia a câmera quando a tela abre; o navegador pede permissão na primeira vez.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start() só altera o estado após a resposta da câmera
    void start();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [enabled, start]);

  const capture = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || state !== "ready" || !video.videoWidth) return null;
    const scale = Math.min(1, 640 / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  }, [state]);

  return { videoRef, state, start, capture };
}
