import "./styles.css";
import * as React from "react";
import webpfy from "webpfy";

export default function App() {
  const [files, setFiles] = React.useState<
    { webpBlob: any; fileName: string }[]
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    setError("");
    setLoading(true);
    const imageFiles = event.target.files as FileList;

    try {
      const result = await Promise.all(
        Object.entries(imageFiles).map(async ([val, file]) => {
          const resWebpfy = await webpfy({ image: file });
          return { webpBlob: resWebpfy.webpBlob, fileName: resWebpfy.fileName };
        })
      );
      setFiles((prev) => prev.concat(result));
    } catch (error) {
      console.error("Image conversion error:", error);
      setError(error?.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>Image convert to webp</h1>
      {!!error && <p>{error}</p>}
      <div
        style={{
          gap: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <button
            onClick={() => {
              setFiles([]);
            }}
          >
            Clear
          </button>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            multiple
          />
        </div>
        <button
          style={{
            backgroundColor: "#099CFF",
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            display: "flex",
            padding: 8,
            height: "fit-content",
            color: "white",
            textDecoration: "none",
            cursor: "pointer",
            borderColor: "transparent",
          }}
          onClick={() => {
            files.map((file) => {
              var a = document.createElement("a") as any;
              document.body.appendChild(a);
              a.style = "display: none";
              var csvUrl = URL.createObjectURL(file.webpBlob);
              a.href = csvUrl;
              a.download = file.fileName;
              a.click();
              URL.revokeObjectURL(a.href);
              a.remove();
            });
          }}
        >
          Download All
        </button>
      </div>
      {loading && <span>Loading ...</span>}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {!!files.length &&
          files.map((file) => (
            <div
              key={file.fileName}
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid grey",
                padding: 8,
              }}
            >
              <div>
                <img
                  src={URL.createObjectURL(file.webpBlob)}
                  alt={file.fileName}
                  style={{ width: 80 }}
                />
                <h3>{file.fileName}:</h3>
              </div>
              <a
                href={URL.createObjectURL(file.webpBlob)}
                download={file.fileName}
                style={{
                  backgroundColor: "#099CFF",
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  display: "flex",
                  padding: 8,
                  height: "fit-content",
                  color: "white",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
              >
                Download
              </a>
            </div>
          ))}
      </div>
    </div>
  );
}
