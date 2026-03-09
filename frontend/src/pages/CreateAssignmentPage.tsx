import { ChangeEvent, DragEvent, useRef, useState } from "react";
import "../App.css";

function CreateAssignmentPage() {
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

  const hasSelectedFiles = selectedFiles.length > 0;
  const selectedFileSummary = hasSelectedFiles
    ? selectedFiles.map((file) => file.name).join(", ")
    : "No file selected";

  return (
    <div className="page">
      <header className="topbar">
        <div className="logo">
          <div className="logo-main">Brock</div>
          <div className="logo-sub">University</div>
        </div>
      </header>

      <main className="content create-content">
        <section className="assignment-card">
          <h1 className="create-title">Create New Assignment</h1>

          <div className="form-group">
            <label className="create-label">Assignment Name</label>
            <input
              className="text-input"
              type="text"
              placeholder="Enter assignment name"
            />
          </div>

          <div className="form-group">
            <label className="create-label">
              Upload Boilerplate code (.c, .cpp, java)
            </label>

            <label
              className={`create-upload-box ${isDragging ? "create-upload-box-active" : ""}`}
              htmlFor="boilerplate-file-input"
              title={selectedFileSummary}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                id="boilerplate-file-input"
                ref={fileInputRef}
                type="file"
                className="file-input"
                multiple
                onChange={handleFileChange}
              />

              {hasSelectedFiles ? (
                <div className="create-upload-content">
                  <div className="create-upload-icon">📄</div>
                  <div className="create-upload-main-text">Files selected</div>
                  <div className="create-upload-file-name">{selectedFileSummary}</div>
                </div>
              ) : (
                <div className="create-upload-content">
                  <div className="create-upload-icon">⬆</div>
                  <div className="create-upload-main-text">Drag &amp; Drop file here</div>
                  <div className="create-upload-sub-text">
                    or <span className="upload-link">click to choose file</span>
                  </div>
                </div>
              )}
            </label>
          </div>

          <div className="form-group create-key-group">
            <label className="create-label">Generate Access Key</label>
            <input
              className="text-input"
              type="text"
              placeholder="Enter access key"
            />
          </div>

          <div className="button-row">
            <button className="cancel-btn" type="button">
              Cancel
            </button>
            <button className="create-btn" type="button">
              Create
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default CreateAssignmentPage;
