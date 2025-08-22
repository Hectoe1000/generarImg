import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const API_KEY = process.env.FREEPIK_API_KEY;

// 🔹 Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function generarImagenFinal({ prompt, titulo, subtitulo, precio, direccion }) {
  try {
    // 1️⃣ Enviar prompt a Freepik
    const response = await axios.post(
      "https://api.freepik.com/v1/ai/mystic",
      {
        structure_strength: 50,
        adherence: 50,
        hdr: 50,
        resolution: "2k",
        aspect_ratio: "square_1_1",
        model: "realism",
        creative_detailing: 33,
        engine: "automatic",
        fixed_generation: false,
        filter_nsfw: true,
        prompt,
      },
      {
        headers: {
          "x-freepik-api-key": API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const taskId = response.data.data.task_id;
    console.log("📌 Tarea creada con ID:", taskId);

    // 2️⃣ Polling hasta que termine
    let status = "CREATED";
    let imageUrl = null;

    while (status !== "COMPLETED") {
      await new Promise((res) => setTimeout(res, 3000));
      const check = await axios.get(
        `https://api.freepik.com/v1/ai/mystic/${taskId}`,
        { headers: { "x-freepik-api-key": API_KEY } }
      );

      status = check.data.data.status;
      console.log("⏳ Estado:", status);

      if (status === "COMPLETED") {
        imageUrl = check.data.data.generated?.[0];
      }
    }

    if (!imageUrl) throw new Error("❌ No se pudo obtener la imagen generada");

    // 3️⃣ Descargar imagen base
    const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const tempFile = `temp_${Date.now()}.png`;
    fs.writeFileSync(tempFile, imgResponse.data);

    // 4️⃣ Preparar overlays dinámicos con Sharp
    const base = sharp(tempFile);

    const logo = await sharp("El_Gallo_Vip.png").resize(450).png().toBuffer();

    const overlay = Buffer.from(`
<svg width="1600" height="1500">
  <style>
    .titulo { fill: #FFA500; font-size: 300px; font-weight: bold; text-anchor: middle; }
    .subtitulo { fill: white; font-size: 150px; font-weight: bold; text-anchor: middle; }
  </style>
  <text x="50%" y="1100" class="titulo">${titulo}</text>
  <text x="50%" y="1200" class="subtitulo">${subtitulo}</text>
</svg>`);

    const starburst = Buffer.from(`
<svg width="1800" height="1500">
  <polygon points="800,0 880,180 1080,100 1020,280 1220,350 1020,420 1080,600 880,520
                   800,700 720,520 520,600 580,420 380,350 580,280 520,100 720,180"
           fill="red"
           transform="scale(0.7) translate(1200,500)" />
  <text x="1380" y="670" fill="white" font-size="150" font-weight="bold"
        text-anchor="middle">${precio}</text>
</svg>`);

    const banner = Buffer.from(`
<svg width="2000" height="150">
  <rect x="0" y="0" width="2000" height="100" fill="orange"/>
  <text x="50%" y="70" fill="white" font-size="48" font-weight="bold" 
        font-family="Arial" text-anchor="middle">
    📍 ${direccion}
  </text>
</svg>`);

    const finalFile = `final_${Date.now()}.png`;

    await base
      .composite([
        { input: starburst, top: 500, left: 50 },
        { input: banner, top: 20, left: 0 },
        { input: logo, top: 20, left: 5 },
        { input: overlay, top: 500, left: 90 },
      ])
      .toFile(finalFile);

    // 5️⃣ Subir a Cloudinary
    const uploadResult = await cloudinary.uploader.upload(finalFile, {
      folder: "imagenes_generadas",
    });

    // 6️⃣ Borrar archivos temporales
    fs.unlinkSync(tempFile);
    fs.unlinkSync(finalFile);

    console.log("✅ Imagen final lista en Cloudinary:", uploadResult.secure_url);
    return uploadResult.secure_url;
  } catch (error) {
    console.error("❌ Error en generarImagenFinal:", error.message);
    throw error;
  }
}
