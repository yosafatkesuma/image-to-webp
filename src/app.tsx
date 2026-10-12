import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { zipSync } from "fflate";
import webpfy from "webpfy";

type Item = {
  id: string;
  sourceName: string;
  sourceSize: number;
  status: "converting" | "done" | "error";
  fileName?: string;
  blob?: Blob;
  url?: string;
  error?: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function download(url: string, fileName: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
}

async function downloadZip(items: Item[]) {
  const entries: Record<string, Uint8Array> = {};
  for (const item of items) {
    // Two sources can map to the same .webp name; suffix duplicates so none get overwritten.
    const base = item.fileName!.replace(/\.webp$/, "");
    let name = `${base}.webp`;
    for (let n = 1; name in entries; n++) name = `${base}-${n}.webp`;
    entries[name] = new Uint8Array(await item.blob!.arrayBuffer());
  }
  // WebP is already compressed, so store entries as-is (level 0).
  const zip = zipSync(entries, { level: 0 });
  const url = URL.createObjectURL(new Blob([zip], { type: "application/zip" }));
  download(url, "webp-images.zip");
  URL.revokeObjectURL(url);
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(75);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke any object URLs still alive when the app unmounts.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(
    () => () => itemsRef.current.forEach((item) => item.url && URL.revokeObjectURL(item.url)),
    []
  );

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const convert = (files: File[]) => {
    const images = files.filter((file) => file.type.startsWith("image/"));
    const queued: Item[] = images.map((file) => ({
      id: crypto.randomUUID(),
      sourceName: file.name,
      sourceSize: file.size,
      status: "converting",
    }));
    setItems((prev) => [...queued, ...prev]);

    images.forEach(async (image, index) => {
      const { id } = queued[index];
      try {
        const { webpBlob, fileName } = await webpfy({ image, quality });
        update(id, {
          status: "done",
          blob: webpBlob,
          fileName,
          url: URL.createObjectURL(webpBlob),
        });
      } catch (error) {
        update(id, { status: "error", error: String(error) });
      }
    });
  };

  const remove = (id: string) =>
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((item) => item.id !== id);
    });

  const clear = () => {
    items.forEach((item) => item.url && URL.revokeObjectURL(item.url));
    setItems([]);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    convert(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    convert(Array.from(event.dataTransfer.files));
  };

  const done = items.filter((item) => item.status === "done");
  const before = done.reduce((sum, item) => sum + item.sourceSize, 0);
  const after = done.reduce((sum, item) => sum + (item.blob?.size ?? 0), 0);

  return (
    <main className="page">
      <header className="header">
        <h1>image → webp</h1>
        <p className="muted">
          Converts in your browser. Files never leave this machine.
        </p>
      </header>

      <section
        className={`drop${dragging ? " drop--active" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <p>
          Drop images here, or{" "}
          <button type="button" className="link" onClick={() => inputRef.current?.click()}>
            choose files
          </button>
        </p>
        <p className="muted small">PNG, JPG, GIF, BMP, SVG</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onInputChange}
        />
      </section>

      <div className="controls">
        <label className="quality">
          <span>Quality</span>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(event) => setQuality(Number(event.target.value))}
          />
          <output className="num">{quality}</output>
        </label>
        <p className="muted small">Applies to the next files you add.</p>
      </div>

      {items.length > 0 && (
        <section>
          <div className="toolbar">
            <p className="num small">
              {done.length}/{items.length} done
              {done.length > 0 && (
                <>
                  {" · "}
                  {formatBytes(before)} → {formatBytes(after)}
                </>
              )}
            </p>
            <div className="actions">
              <button type="button" className="button" onClick={clear}>
                Clear
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={done.length === 0}
                onClick={() => downloadZip(done)}
              >
                Download all (.zip)
              </button>
            </div>
          </div>

          <ul className="list">
            {items.map((item) => (
              <li key={item.id} className="row">
                <div className="thumb">
                  {item.url && <img src={item.url} alt="" />}
                </div>
                <div className="meta">
                  <p className="name" title={item.fileName ?? item.sourceName}>
                    {item.fileName ?? item.sourceName}
                  </p>
                  <p className="num small muted">
                    {item.status === "converting" && "Converting…"}
                    {item.status === "error" && <span className="error">{item.error}</span>}
                    {item.status === "done" && item.blob && (
                      <>
                        {formatBytes(item.sourceSize)} → {formatBytes(item.blob.size)}{" "}
                        <Delta before={item.sourceSize} after={item.blob.size} />
                      </>
                    )}
                  </p>
                </div>
                <div className="actions">
                  {item.status === "done" && (
                    <a className="button" href={item.url} download={item.fileName}>
                      Download
                    </a>
                  )}
                  <button
                    type="button"
                    className="button button--ghost"
                    aria-label={`Remove ${item.sourceName}`}
                    onClick={() => remove(item.id)}
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Delta({ before, after }: { before: number; after: number }) {
  const change = Math.round(((after - before) / before) * 100);
  return (
    <span className={change > 0 ? "worse" : "better"}>
      {change > 0 ? `+${change}%` : `${change}%`}
    </span>
  );
}
