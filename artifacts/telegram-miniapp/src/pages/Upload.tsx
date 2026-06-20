import { useState, useRef, useEffect } from "react";
import { FolderUp, CheckCircle2 } from "lucide-react";
import { TG } from "../lib/theme";
import { useToast } from "../components/Toast";

const ALLOWED_EXT = [".html", ".csv", ".tsv", ".json", ".jsonl"];

interface UploadRecord {
  key: string;
  filename: string;
  uploaded_at: string;
  count: number;
}

export function UploadPage() {
  const [file, setFile]       = useState<File | null>(null);
  const [status, setStatus]   = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [result, setResult]   = useState<{ key: string; count: number; filename: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const inputRef              = useRef<HTMLInputElement>(null);
  const { show: showToast, node: toastNode } = useToast();

  const apiBase  = import.meta.env.VITE_API_URL || "";
  const initData = (window as unknown as { Telegram?: { WebApp?: { initData: string } } }).Telegram?.WebApp?.initData ?? "";

  useEffect(() => {
    fetch(`${apiBase}/api/twa/upload`, {
      headers: { "X-Telegram-Init-Data": initData },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setUploads(data as UploadRecord[]); })
      .catch(() => {});
  }, [result, apiBase, initData]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      showToast(`Формат не поддерживается: ${ALLOWED_EXT.join(", ")}`, "error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setResult(null);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${apiBase}/api/twa/upload`, {
        method: "POST",
        headers: { "X-Telegram-Init-Data": initData },
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { key: string; count: number; filename: string };
      setResult(data);
      setStatus("done");
      setFile(null);
      showToast(`Загружено ${data.count} записей`, "success");
    } catch (e: unknown) {
      setErrorMsg((e as Error).message);
      setStatus("error");
      showToast("Ошибка загрузки", "error");
    }
  }

  return (
    <div className="tab-content" style={{ height: "100%", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 14px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: "linear-gradient(145deg,rgba(255,159,64,0.28),rgba(255,159,64,0.12))",
            border: "1px solid rgba(255,159,64,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FolderUp size={20} color="#ff9f40" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#eef2ff" }}>Файлы аудитории</div>
            <div style={{ fontSize: 12, color: "rgba(238,242,255,0.4)" }}>CSV, TSV, JSON, JSONL, HTML</div>
          </div>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            borderRadius: 18,
            border: "2px dashed rgba(255,159,64,0.35)",
            background: "rgba(255,159,64,0.04)",
            padding: "32px 20px",
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_EXT.join(",")}
            style={{ display: "none" }}
            onChange={onFileChange}
          />
          {file ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ color: "#ff9f40", fontWeight: 700, fontSize: 14 }}>{file.name}</div>
              <div style={{ color: "rgba(238,242,255,0.4)", fontSize: 12, marginTop: 4 }}>
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}>☁️</div>
              <div style={{ color: "rgba(238,242,255,0.6)", fontSize: 14 }}>Нажмите для выбора файла</div>
              <div style={{ color: "rgba(238,242,255,0.3)", fontSize: 12, marginTop: 4 }}>
                {ALLOWED_EXT.join(", ")} · до 10 МБ
              </div>
            </>
          )}
        </div>

        {/* Upload button */}
        {file && status === "idle" && (
          <button
            onClick={handleUpload}
            style={{
              padding: "14px",
              borderRadius: 14,
              background: "linear-gradient(135deg,rgba(255,159,64,0.45),rgba(255,159,64,0.25))",
              border: "1px solid rgba(255,159,64,0.4)",
              color: "#ff9f40",
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            ⬆️ Загрузить файл
          </button>
        )}

        {status === "uploading" && (
          <div style={{ textAlign: "center", color: "rgba(238,242,255,0.5)", fontSize: 14, padding: 12 }}>
            ⏳ Загружаю...
          </div>
        )}

        {status === "error" && (
          <div style={{
            borderRadius: 12, background: "rgba(255,107,122,0.08)", border: "1px solid rgba(255,107,122,0.25)",
            padding: "12px 14px", color: "#ff6b7a", fontSize: 13,
          }}>
            ❌ {errorMsg}
          </div>
        )}

        {status === "done" && result && (
          <div style={{
            borderRadius: 14, background: "rgba(45,232,151,0.08)", border: "1px solid rgba(45,232,151,0.25)",
            padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
          }}>
            <CheckCircle2 size={20} color={TG.green} />
            <div>
              <div style={{ color: TG.green, fontWeight: 700, fontSize: 14 }}>
                Загружено {result.count} записей
              </div>
              <div style={{ color: "rgba(238,242,255,0.4)", fontSize: 12, marginTop: 2 }}>{result.filename}</div>
            </div>
          </div>
        )}

        {/* Upload history */}
        {uploads.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(238,242,255,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", paddingTop: 4 }}>
              История загрузок
            </div>
            {uploads.map(u => (
              <div key={u.key} style={{
                borderRadius: 14,
                background: "linear-gradient(145deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.02) 100%)",
                border: "1px solid rgba(255,255,255,0.09)",
                padding: "12px 14px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ color: "#eef2ff", fontSize: 13, fontWeight: 600 }}>{u.filename}</div>
                  <div style={{ color: "rgba(238,242,255,0.35)", fontSize: 11, marginTop: 2 }}>
                    {u.uploaded_at?.slice(0, 16).replace("T", " ")}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ff9f40" }}>
                  {u.count} строк
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      {toastNode}
    </div>
  );
}
