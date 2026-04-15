"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { FileText, ImageIcon, Mic, Music, Paperclip, Pause, Play, SendHorizontal, Square, Trash2, Video, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const ACCEPTED_MEDIA_TYPES = [
  "image/*",
  "audio/*",
  "video/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain"
].join(",");

const MAX_FILES = 5;

type Attachment = {
  id: string;
  file: File;
  previewUrl: string | null;
  source: "upload" | "recording";
  durationSeconds?: number;
};

type RecordingState = "idle" | "recording" | "paused";

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function getAttachmentIcon(file: File) {
  if (file.type.startsWith("image/")) return ImageIcon;
  if (file.type.startsWith("audio/")) return Music;
  if (file.type.startsWith("video/")) return Video;
  return FileText;
}

function createAttachment(file: File, source: Attachment["source"], durationSeconds?: number): Attachment {
  const shouldPreview = file.type.startsWith("image/") || source === "recording";
  return {
    id: `${source}-${Date.now()}-${crypto.randomUUID()}`,
    file,
    previewUrl: shouldPreview ? URL.createObjectURL(file) : null,
    source,
    durationSeconds
  };
}

function revokeAttachment(attachment: Attachment) {
  if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
}

function getSupportedAudioMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function getAudioExtension(mimeType: string) {
  return mimeType.includes("ogg") ? "ogg" : "webm";
}

export function MessageInput({
  leadId,
  onSent
}: {
  leadId: string | null;
  onSent: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelRecordingRef = useRef(false);
  const attachmentsRef = useRef<Attachment[]>([]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach(revokeAttachment);
      stopRecordingTimer();
      stopMicrophoneTracks();
    };
  }, []);

  function stopRecordingTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startRecordingTimer() {
    stopRecordingTimer();
    timerRef.current = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);
  }

  function stopMicrophoneTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function clearFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addAttachments(files: File[], source: Attachment["source"] = "upload", durationSeconds?: number) {
    if (!files.length) return;

    setAttachments((current) => {
      const availableSlots = MAX_FILES - current.length;
      if (availableSlots <= 0) {
        setSendError(`Envie no maximo ${MAX_FILES} arquivos por vez.`);
        return current;
      }

      const accepted = files.slice(0, availableSlots);
      if (accepted.length < files.length) {
        setSendError(`Apenas ${availableSlots} arquivo(s) foram adicionados. O limite e ${MAX_FILES}.`);
      }

      return [
        ...current,
        ...accepted.map((file) => createAttachment(file, source, durationSeconds))
      ];
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addAttachments(Array.from(event.target.files ?? []));
    clearFileInput();
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((current) => {
      const removed = current.find((attachment) => attachment.id === attachmentId);
      if (removed) revokeAttachment(removed);
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  }

  function clearAttachments() {
    attachmentsRef.current.forEach(revokeAttachment);
    attachmentsRef.current = [];
    setAttachments([]);
    clearFileInput();
  }

  async function startRecording() {
    if (!leadId || isSending || recordingState !== "idle") return;
    setRecordingError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError("Este navegador nao suporta gravacao de audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      cancelRecordingRef.current = false;
      streamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setRecordingState("recording");
      startRecordingTimer();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopRecordingTimer();
        stopMicrophoneTracks();
        mediaRecorderRef.current = null;
        setRecordingState("idle");

        if (cancelRecordingRef.current) {
          chunksRef.current = [];
          setRecordingSeconds(0);
          return;
        }

        const audioType = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: audioType });
        chunksRef.current = [];

        if (!blob.size) {
          setRecordingError("Nao foi possivel capturar o audio.");
          return;
        }

        const extension = getAudioExtension(audioType);
        const file = new File([blob], `audio-gravado-${Date.now()}.${extension}`, { type: audioType });
        addAttachments([file], "recording", recordingSeconds);
        setRecordingSeconds(0);
      };

      recorder.start();
    } catch (error) {
      stopRecordingTimer();
      stopMicrophoneTracks();
      setRecordingState("idle");
      setRecordingError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Permissao de microfone negada."
          : "Nao foi possivel iniciar a gravacao."
      );
    }
  }

  function pauseRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    stopRecordingTimer();
    setRecordingState("paused");
  }

  function resumeRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    startRecordingTimer();
    setRecordingState("recording");
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    cancelRecordingRef.current = false;
    recorder.stop();
  }

  function cancelRecording() {
    const recorder = mediaRecorderRef.current;
    cancelRecordingRef.current = true;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      stopRecordingTimer();
      stopMicrophoneTracks();
      setRecordingState("idle");
      setRecordingSeconds(0);
    }
  }

  async function sendTextMessage() {
    const response = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, content: value.trim() })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Falha ao enviar mensagem" }))) as {
        error?: string;
      };
      throw new Error(payload.error ?? "Falha ao enviar mensagem");
    }
  }

  async function sendMediaBatch() {
    const formData = new FormData();
    formData.append("leadId", leadId ?? "");
    for (const attachment of attachments) {
      formData.append("files", attachment.file);
    }

    const response = await fetch("/api/messages/send-media", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Falha ao enviar midia" }))) as {
        error?: string;
        sent?: number;
      };
      const suffix = typeof payload.sent === "number" && payload.sent > 0 ? ` ${payload.sent} arquivo(s) ja foram enviados.` : "";
      throw new Error(`${payload.error ?? "Falha ao enviar midia"}${suffix}`);
    }
  }

  async function handleSubmit() {
    if (!leadId || isSending || recordingState !== "idle" || (!value.trim() && attachments.length === 0)) return;

    setIsSending(true);
    setSendError(null);
    try {
      if (value.trim()) {
        setSendStatus("Enviando mensagem...");
        await sendTextMessage();
      }

      if (attachments.length > 0) {
        setSendStatus(`Enviando ${attachments.length} anexo(s)...`);
        await sendMediaBatch();
      }

      setValue("");
      clearAttachments();
      await onSent();
      textareaRef.current?.focus();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Falha ao enviar mensagem");
      await onSent();
    } finally {
      setSendStatus(null);
      setIsSending(false);
    }
  }

  const canSend = Boolean(leadId) && recordingState === "idle" && (value.trim().length > 0 || attachments.length > 0) && !isSending;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_MEDIA_TYPES}
        className="hidden"
        onChange={handleFileChange}
        disabled={!leadId || isSending || recordingState !== "idle"}
      />

      {attachments.length > 0 ? (
        <div className="grid gap-2 rounded-xl border border-border bg-surface p-2">
          {attachments.map((attachment) => {
            const Icon = getAttachmentIcon(attachment.file);
            return (
              <div key={attachment.id} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/70 p-2 text-xs">
                {attachment.previewUrl && attachment.file.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.previewUrl} alt="" className="h-12 w-12 rounded-lg border border-border object-cover" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{attachment.file.name}</p>
                  <p className="text-secondary">
                    {attachment.file.type || "Arquivo"} | {formatFileSize(attachment.file.size)}
                    {attachment.durationSeconds ? ` | ${formatSeconds(attachment.durationSeconds)}` : ""}
                  </p>
                  {attachment.source === "recording" && attachment.previewUrl ? (
                    <audio controls preload="metadata" src={attachment.previewUrl} className="mt-2 h-8 w-full max-w-[280px]" />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-secondary transition-colors hover:bg-muted"
                  aria-label={`Remover ${attachment.file.name}`}
                  disabled={isSending}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      {recordingState !== "idle" ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="flex items-center gap-2 font-medium">
            <span className={cn("h-2.5 w-2.5 rounded-full bg-red-500", recordingState === "recording" && "animate-pulse")} />
            {recordingState === "paused" ? "Gravacao pausada" : "Gravando audio"}
          </span>
          <span className="font-mono">{formatSeconds(recordingSeconds)}</span>
          {recordingState === "recording" ? (
            <button type="button" onClick={pauseRecording} className="rounded-lg border border-red-200 px-2 py-1 text-xs hover:bg-red-100">
              <Pause className="mr-1 inline h-3.5 w-3.5" />
              Pausar
            </button>
          ) : (
            <button type="button" onClick={resumeRecording} className="rounded-lg border border-red-200 px-2 py-1 text-xs hover:bg-red-100">
              <Play className="mr-1 inline h-3.5 w-3.5" />
              Retomar
            </button>
          )}
          <button type="button" onClick={stopRecording} className="rounded-lg border border-red-200 px-2 py-1 text-xs hover:bg-red-100">
            <Square className="mr-1 inline h-3.5 w-3.5" />
            Parar
          </button>
          <button type="button" onClick={cancelRecording} className="rounded-lg border border-red-200 px-2 py-1 text-xs hover:bg-red-100">
            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>
      ) : null}

      {recordingError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {recordingError}
        </div>
      ) : null}

      {sendStatus ? (
        <div className="rounded-lg border border-accent/20 bg-accent/[0.06] px-3 py-2 text-xs font-medium text-secondary">
          {sendStatus}
        </div>
      ) : null}

      {sendError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>{sendError}</span>
          <button type="button" className="font-semibold hover:underline" onClick={() => setSendError(null)}>
            Fechar
          </button>
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!leadId || isSending || recordingState !== "idle" || attachments.length >= MAX_FILES}
          className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Anexar arquivos"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={leadId ? "Mensagem... (Enter para enviar)" : "Selecione um lead"}
          disabled={!leadId || isSending || recordingState !== "idle"}
          className="min-h-[80px] resize-none pl-12 pr-24"
        />
        <button
          type="button"
          onClick={() => void startRecording()}
          disabled={!leadId || isSending || recordingState !== "idle" || attachments.length >= MAX_FILES}
          className="absolute bottom-3 right-14 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Gravar audio"
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSend}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Enviar mensagem"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
