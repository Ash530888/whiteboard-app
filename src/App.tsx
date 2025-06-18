import React, { useState, useRef, useEffect, useCallback } from "react";
import { HexColorPicker } from "react-colorful";
import { Rnd } from "react-rnd";
import "@fortawesome/fontawesome-free/css/all.min.css";

type Tool = "pen" | "sticker" | "eraser" | "text" | "none";
type StickerType = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
type TextBoxType = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
};
type ImageType = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  url: string;
};

const STICKER_OPTIONS = [
  { type: "fas fa-heart", label: "Heart" },
  { type: "fas fa-star", label: "Star" },
  { type: "fas fa-smile", label: "Smile" },
  { type: "fas fa-cloud", label: "Cloud" },
  { type: "fas fa-moon", label: "Moon" },
  { type: "fas fa-sun", label: "Sun" },
  { type: "fas fa-tree", label: "Tree" },
  { type: "fas fa-gift", label: "Gift" },
  { type: "fas fa-music", label: "Music" },
  { type: "fas fa-camera", label: "Camera" },
];

const PREDEFINED_COLORS = [
  "#ff0000",
  "#ff8000",
  "#ffff00",
  "#80ff00",
  "#00ff00",
  "#00ff80",
  "#00ffff",
  "#0080ff",
  "#0000ff",
  "#8000ff",
  "#ff00ff",
  "#ff0080",
  "#000000",
  "#808080",
  "#ffffff",
];

const DEFAULT_PEN_SIZE = 3;
const DEFAULT_COLOR = "#000000";
const STICKER_DEFAULT_SIZE = 50;

const App: React.FC = () => {
  const [tool, setTool] = useState<Tool>("none");
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_COLOR);
  const [penSize, setPenSize] = useState<number>(DEFAULT_PEN_SIZE);
  const [selectedSticker, setSelectedSticker] = useState<string>("");
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showStickerPicker, setShowStickerPicker] = useState<boolean>(false);
  const [stickers, setStickers] = useState<StickerType[]>([]);
  const [textBoxes, setTextBoxes] = useState<TextBoxType[]>([]);
  const [images, setImages] = useState<ImageType[]>([]);
  const [scale, setScale] = useState<number>(1);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeTextBox, setActiveTextBox] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPosition = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    // Get and configure context
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(2, 2); // For higher resolution
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = selectedColor;
      context.lineWidth = penSize;
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      contextRef.current = context;
    }
  }, []);

  // Handle color and pen size changes
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = selectedColor;
      contextRef.current.lineWidth = penSize;
    }
  }, [selectedColor, penSize]);

  // Handle tool selection
  const handleToolChange = (newTool: Tool) => {
    setTool(newTool);

    if (newTool === "pen") {
      setShowColorPicker(true);
      setShowStickerPicker(false);
    } else if (newTool === "sticker") {
      setShowColorPicker(false);
      setShowStickerPicker(true);
    } else {
      setShowColorPicker(false);
      setShowStickerPicker(false);
    }
  };

  // Drawing functionality
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool !== "pen") return;

      const canvas = canvasRef.current;
      if (!canvas || !contextRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
      setIsDrawing(true);
      lastPosition.current = { x, y };
    },
    [tool, scale]
  );

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (
        !isDrawing ||
        tool !== "pen" ||
        !contextRef.current ||
        !lastPosition.current
      )
        return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
      lastPosition.current = { x, y };
    },
    [isDrawing, tool, scale]
  );

  const stopDrawing = useCallback(() => {
    if (contextRef.current) {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
    lastPosition.current = null;
  }, []);

  // Eraser functionality
  const erase = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool !== "eraser" || !contextRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      const radius = penSize * 2; // Larger eraser size

      // Erase from canvas
      contextRef.current.save();
      contextRef.current.beginPath();
      contextRef.current.arc(x, y, radius, 0, Math.PI * 2);
      contextRef.current.clip();
      contextRef.current.fillStyle = "white";
      contextRef.current.fillRect(
        x - radius,
        y - radius,
        radius * 2,
        radius * 2
      );
      contextRef.current.restore();

      // Check for stickers to erase
      setStickers((prevStickers) =>
        prevStickers.filter((sticker) => {
          const stickerCenterX = sticker.x + sticker.width / 2;
          const stickerCenterY = sticker.y + sticker.height / 2;
          const distance = Math.sqrt(
            Math.pow(stickerCenterX - x, 2) + Math.pow(stickerCenterY - y, 2)
          );
          return distance > radius;
        })
      );

      // Check for text boxes to erase
      setTextBoxes((prevTextBoxes) =>
        prevTextBoxes.filter((textBox) => {
          const textBoxCenterX = textBox.x + textBox.width / 2;
          const textBoxCenterY = textBox.y + textBox.height / 2;
          const distance = Math.sqrt(
            Math.pow(textBoxCenterX - x, 2) + Math.pow(textBoxCenterY - y, 2)
          );
          return distance > radius;
        })
      );

      // Check for images to erase
      setImages((prevImages) =>
        prevImages.filter((image) => {
          const imageCenterX = image.x + image.width / 2;
          const imageCenterY = image.y + image.height / 2;
          const distance = Math.sqrt(
            Math.pow(imageCenterX - x, 2) + Math.pow(imageCenterY - y, 2)
          );
          return distance > radius;
        })
      );
    },
    [tool, penSize, scale]
  );

  // Handle canvas clicks for various tools
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      if (tool === "sticker" && selectedSticker) {
        setStickers((prev) => [
          ...prev,
          {
            id: `sticker-${Date.now()}`,
            type: selectedSticker,
            x,
            y,
            width: STICKER_DEFAULT_SIZE,
            height: STICKER_DEFAULT_SIZE,
          },
        ]);
        setSelectedSticker(""); // Reset selected sticker
        setTool("none");
      } else if (tool === "text") {
        const newId = `text-${Date.now()}`;
        setTextBoxes((prev) => [
          ...prev,
          {
            id: newId,
            x,
            y,
            width: 150,
            height: 50,
            content: "",
          },
        ]);
        setActiveTextBox(newId);
        setTool("none");
      } else if (tool === "eraser") {
        erase(e);
      }
    },
    [tool, selectedSticker, scale, erase]
  );

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      const items = e.clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const url = URL.createObjectURL(blob);

            // Create a temporary image to get dimensions
            const img = new Image();
            img.onload = () => {
              const aspectRatio = img.width / img.height;
              const width = 300; // Default width
              const height = width / aspectRatio;

              // Add the image to state
              setImages((prev) => [
                ...prev,
                {
                  id: `img-${Date.now()}`,
                  x: window.innerWidth / 2 / scale - width / 2,
                  y: window.innerHeight / 2 / scale - height / 2,
                  width,
                  height,
                  url,
                },
              ]);
            };
            img.src = url;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [scale]);

  // Zoom functionality
  const handleZoom = (direction: "in" | "out") => {
    setScale((prev) => {
      if (direction === "in" && prev < 3) return prev + 0.1;
      if (direction === "out" && prev > 0.5) return prev - 0.1;
      return prev;
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div
        ref={canvasContainerRef}
        className="flex-grow relative overflow-auto"
        style={{
          cursor:
            tool === "pen"
              ? "crosshair"
              : tool === "eraser"
              ? "cell"
              : tool === "sticker" && selectedSticker
              ? "copy"
              : tool === "text"
              ? "text"
              : "default",
        }}
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={(e) => {
              if (isDrawing && tool === "pen") draw(e);
              if (tool === "eraser") erase(e);
            }}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onClick={handleCanvasClick}
            className="absolute top-0 left-0 bg-white"
          />

          {/* Stickers */}
          {stickers.map((sticker) => (
            <Rnd
              key={sticker.id}
              default={{
                x: sticker.x,
                y: sticker.y,
                width: sticker.width,
                height: sticker.height,
              }}
              style={{ zIndex: 10 }}
              onDragStop={(e, d) => {
                setStickers((prev) =>
                  prev.map((s) =>
                    s.id === sticker.id ? { ...s, x: d.x, y: d.y } : s
                  )
                );
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                setStickers((prev) =>
                  prev.map((s) =>
                    s.id === sticker.id
                      ? {
                          ...s,
                          width: parseInt(ref.style.width),
                          height: parseInt(ref.style.height),
                          x: position.x,
                          y: position.y,
                        }
                      : s
                  )
                );
              }}
              disableDragging={tool === "eraser"}
            >
              <div className="flex items-center justify-center w-full h-full">
                <i
                  className={`${sticker.type} text-4xl`}
                  style={{ color: selectedColor }}
                ></i>
              </div>
            </Rnd>
          ))}

          {/* Text Boxes */}
          {textBoxes.map((textBox) => (
            <Rnd
              key={textBox.id}
              default={{
                x: textBox.x,
                y: textBox.y,
                width: textBox.width,
                height: textBox.height,
              }}
              style={{ zIndex: 10 }}
              onDragStop={(e, d) => {
                setTextBoxes((prev) =>
                  prev.map((t) =>
                    t.id === textBox.id ? { ...t, x: d.x, y: d.y } : t
                  )
                );
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                setTextBoxes((prev) =>
                  prev.map((t) =>
                    t.id === textBox.id
                      ? {
                          ...t,
                          width: parseInt(ref.style.width),
                          height: parseInt(ref.style.height),
                          x: position.x,
                          y: position.y,
                        }
                      : t
                  )
                );
              }}
              disableDragging={tool === "eraser"}
              onClick={() => setActiveTextBox(textBox.id)}
            >
              <textarea
                value={textBox.content}
                onChange={(e) => {
                  setTextBoxes((prev) =>
                    prev.map((t) =>
                      t.id === textBox.id
                        ? { ...t, content: e.target.value }
                        : t
                    )
                  );
                }}
                className="w-full h-full p-2 border-2 border-dashed border-gray-300 focus:outline-none focus:border-blue-400 bg-transparent"
                style={{
                  color: selectedColor,
                  pointerEvents: tool === "eraser" ? "none" : "auto",
                  resize: "none",
                }}
                placeholder="Type here..."
                onClick={(e) => e.stopPropagation()}
              />
            </Rnd>
          ))}

          {/* Images */}
          {images.map((image) => (
            <Rnd
              key={image.id}
              default={{
                x: image.x,
                y: image.y,
                width: image.width,
                height: image.height,
              }}
              style={{ zIndex: 5 }}
              onDragStop={(e, d) => {
                setImages((prev) =>
                  prev.map((img) =>
                    img.id === image.id ? { ...img, x: d.x, y: d.y } : img
                  )
                );
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                setImages((prev) =>
                  prev.map((img) =>
                    img.id === image.id
                      ? {
                          ...img,
                          width: parseInt(ref.style.width),
                          height: parseInt(ref.style.height),
                          x: position.x,
                          y: position.y,
                        }
                      : img
                  )
                );
              }}
              disableDragging={tool === "eraser"}
              lockAspectRatio
            >
              <img
                src={image.url}
                alt="Pasted"
                className="w-full h-full object-contain"
                style={{ pointerEvents: tool === "eraser" ? "none" : "auto" }}
              />
            </Rnd>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-gray-800 text-white p-4 flex flex-wrap items-center">
        <div className="flex space-x-4 items-center mr-8">
          <button
            className={`p-2 rounded ${
              tool === "pen" ? "bg-blue-500" : "bg-gray-600 hover:bg-gray-500"
            }`}
            onClick={() => handleToolChange("pen")}
            title="Pen Tool"
          >
            <i className="fas fa-pen"></i>
          </button>

          <button
            className={`p-2 rounded ${
              tool === "sticker"
                ? "bg-blue-500"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
            onClick={() => handleToolChange("sticker")}
            title="Sticker Tool"
          >
            <i className="fas fa-sticky-note"></i>
          </button>

          <button
            className={`p-2 rounded ${
              tool === "eraser"
                ? "bg-blue-500"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
            onClick={() => handleToolChange("eraser")}
            title="Eraser Tool"
          >
            <i className="fas fa-eraser"></i>
          </button>

          <button
            className={`p-2 rounded ${
              tool === "text" ? "bg-blue-500" : "bg-gray-600 hover:bg-gray-500"
            }`}
            onClick={() => handleToolChange("text")}
            title="Text Tool"
          >
            <i className="fas fa-font"></i>
          </button>
        </div>

        <div className="flex space-x-4 items-center mr-8">
          <div className="text-sm">Zoom: {Math.round(scale * 100)}%</div>
          <button
            className="p-2 rounded bg-gray-600 hover:bg-gray-500"
            onClick={() => handleZoom("in")}
            title="Zoom In"
          >
            <i className="fas fa-search-plus"></i>
          </button>
          <button
            className="p-2 rounded bg-gray-600 hover:bg-gray-500"
            onClick={() => handleZoom("out")}
            title="Zoom Out"
          >
            <i className="fas fa-search-minus"></i>
          </button>
        </div>

        <div className="text-sm italic ml-auto">
          Tip: Paste images with Ctrl+V
        </div>
      </div>

      {/* Color Picker */}
      {showColorPicker && (
        <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg z-50">
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {PREDEFINED_COLORS.map((color) => (
                <div
                  key={color}
                  className="w-6 h-6 rounded-full cursor-pointer border border-gray-300"
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                ></div>
              ))}
            </div>
            <HexColorPicker color={selectedColor} onChange={setSelectedColor} />
            <div className="mt-3 flex items-center">
              <label className="mr-3 text-sm text-gray-600">Pen Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={penSize}
                onChange={(e) => setPenSize(parseInt(e.target.value))}
                className="w-32"
              />
              <span className="ml-2 text-sm text-gray-600">{penSize}px</span>
            </div>
          </div>
        </div>
      )}

      {/* Sticker Picker */}
      {showStickerPicker && (
        <div className="absolute bottom-20 left-4 bg-white p-4 rounded-lg shadow-lg z-50">
          <div className="grid grid-cols-5 gap-2">
            {STICKER_OPTIONS.map((sticker) => (
              <div
                key={sticker.type}
                className={`p-2 cursor-pointer flex items-center justify-center rounded hover:bg-gray-100 ${
                  selectedSticker === sticker.type ? "bg-blue-100" : ""
                }`}
                onClick={() => {
                  setSelectedSticker(sticker.type);
                  setTool("sticker");
                }}
                title={sticker.label}
              >
                <i className={`${sticker.type} text-xl`}></i>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <label className="mr-2 text-sm text-gray-600">Color:</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {PREDEFINED_COLORS.slice(0, 7).map((color) => (
                <div
                  key={color}
                  className="w-5 h-5 rounded-full cursor-pointer border border-gray-300"
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
