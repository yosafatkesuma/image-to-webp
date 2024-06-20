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
    const imageFiles = event.target.files as FileList;
    console.log(imageFiles);

    try {
      const result = await Promise.all(
        Object.entries(imageFiles).map(async ([val, file]) => {
          const resWebpfy = await webpfy({ image: file });
          return { webpBlob: resWebpfy.webpBlob, fileName: resWebpfy.fileName };
        })
      );
      // const result = await Promise.all(
      //   Object.keys()
      //   imageFiles.map(async (file) => {
      //     const result = await webpfy({ image: file });
      //     return { webpBlob: result.webpBlob, fileName: result.fileName };
      //   })
      // );
      console.log(result);
      setFiles((prev) => prev.concat(result));
    } catch (error) {
      console.error("Image conversion error:", error);
    }
  };

  return (
    <div className="App">
      <h1>Image convert to webp</h1>
      {!!error && <p>{error}</p>}
      <div style={{ gap: 8, display: "flex" }}>
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
              >
                Download
              </a>
            </div>
          ))}
      </div>
    </div>
  );
}
