import { ChangeEvent, DragEvent, useRef, useState } from "react";
import "./App.css";

function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    setSelectedFiles(Array.from(files));
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(event.dataTransfer.files);

    if (!droppedFiles.length) {
      return;
    }

    setSelectedFiles(droppedFiles);

    if (!fileInputRef.current) {
      return;
    }

    const dataTransfer = new DataTransfer();
    droppedFiles.forEach((file) => dataTransfer.items.add(file));
    fileInputRef.current.files = dataTransfer.files;
  };

  const dropBoxText = "Drag & drop, or click to choose file";
  const selectedFileSummary =
    selectedFiles.length > 0
      ? selectedFiles.map((file) => file.name).join(", ")
      : dropBoxText;

  return (
    <div className="page">
      <header className="topbar">
        <div className="logo">
          <div className="logo-main">Brock</div>
          <div className="logo-sub">University</div>
        </div>
      </header>

      <main className="content">
        <h1 className="title">Submit Your Assignment</h1>

        <div className="layout">
          <section className="left-card">
            <label className="label">Your Name</label>
            <input
              className="input"
              type="text"
              placeholder="Null Pointers"
            />

            <label className="label">Student ID</label>
            <input
              className="input"
              type="text"
              placeholder="1234567"
            />

            <label
              className={`upload-box ${isDragging ? "upload-box-active" : ""}`}
              htmlFor="assignment-file-input"
              title={selectedFileSummary}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="assignment-file-input"
                ref={fileInputRef}
                type="file"
                className="file-input"
                multiple
                onChange={handleFileChange}
              />
              {dropBoxText}
            </label>

            <button className="submit-btn">Submit Assignment</button>
          </section>

          <aside className="right-card">
            <div className="deadline-box">
              <p className="deadline-title">Deadline:</p>
              <p className="deadline-date">April 30th, 2026</p>
              <p className="deadline-time">11:57 PM</p>
            </div>

            <p className="attempt-text">
              You have 3 attempts to
              <br />
              submit your file
            </p>

            <div className="attempts-section">
              <p className="attempts-label">Attempts Used:</p>
              <div className="attempt-line"></div>
              <p className="attempts-used">
                <span className="red">1</span> of 3 Attempts Used
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default App;
