import express from "express";
import cors from "cors";
import { generarImagenFinal } from "./servicioImagen.js";

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


app.listen(3000, () => console.log("🚀 Servidor corriendo en http://localhost:3000"));
