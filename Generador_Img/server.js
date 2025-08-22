import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { generarImagenFinal } from "./servicioImagen.js";

const app = express();
app.use(cors());
app.use(express.json());

// Necesario para rutas absolutas en ESModules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📂 Servir imágenes estáticas
app.use("/imagenes", express.static(path.join(__dirname, "imagenes")));

app.post("/generar", async (req, res) => {
  try {
    const { prompt, titulo, subtitulo, precio, direccion } = req.body;
    const fileName = await generarImagenFinal({ prompt, titulo, subtitulo, precio, direccion });

    if (!fileName) {
      return res.status(500).json({ error: "Error generando la imagen" });
    }

    // 🌍 URL dinámica (Render/Railway da su propio dominio)
    const baseUrl = process.env.BASE_URL || `http://localhost:3000`;

    res.json({ url: `${baseUrl}/imagenes/${fileName}` });
  } catch (err) {
    console.error("❌ Error en /generar:", err);
    res.status(500).json({ error: "Error generando la imagen" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
