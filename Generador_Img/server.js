import express from "express";
import cors from "cors";
import { generarImagenFinal,generateVideoFromFile } from "./servicioImagen.js";
import multer from "multer";
import path from 'path';

// import { v2 as cloudinary } from "cloudinary";
const upload = multer({ dest: "uploads/" });

const app = express();
app.use(cors());
app.use(express.json());

// Servir imágenes generadas
app.use("/imagenes", express.static("imagenes"));

app.post("/generar", async (req, res) => {
  try {
    const { prompt, titulo, subtitulo, precio, direccion } = req.body;
    const imageUrl = await generarImagenFinal({ prompt, titulo, subtitulo, precio, direccion });

    if (!imageUrl) {
      return res.status(500).json({ error: "Error generando la imagen" });
    }

    res.json({ url: imageUrl }); // 👈 ahora viene directo de Cloudinary
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error generando la imagen" });
  }
});



app.post('/generate-video', upload.single('image'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const file = req.file;

    if (!file || !prompt) return res.status(400).json({ error: 'Falta archivo o prompt' });

    const videoUrl = await generateVideoFromFile(file.path, file.mimetype, prompt);
    res.json({ url: videoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});





app.listen(3000, () => console.log("🚀 Servidor corriendo en http://localhost:3000"));
