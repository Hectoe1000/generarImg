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

export async function generarImagenFinal({ prompt, titulo, subtitulo, precio, }) {
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

    const ofertainsignia = await sharp("insignia.png").resize(750).png().toBuffer();
    const rasgado = await sharp("rasgado.png").resize(800).png().toBuffer();


    const overlay = Buffer.from(`
<svg width="1600" height="1500">
  <style>
  .titulo {
    fill: url(#gradTitulo); /* Gradiente */
    font-size: 300px;
    font-weight: bold;
    text-anchor: middle;
    font-family: 'Impact', sans-serif;
    stroke: #000; /* Borde negro */
    stroke-width: 10px;
    paint-order: stroke fill;
    filter: drop-shadow(10px 10px 15px rgba(0,0,0,0.7)); /* Sombra */
  }
  .subtitulo {
    fill: white;
    font-size: 150px;
    font-weight: bold;
    text-anchor: middle;
    font-family: 'Impact', sans-serif;
    stroke: #000;
    stroke-width: 6px;
    paint-order: stroke fill;
    filter: drop-shadow(6px 6px 10px rgba(0,0,0,0.6));
  }
</style>

<!-- Definimos un gradiente -->
<defs>
  <linearGradient id="gradTitulo" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" style="stop-color:#FFA500;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#FF4500;stop-opacity:1" />
  </linearGradient>
</defs>

<text x="50%" y="1100" class="titulo">${titulo}</text>
<text x="50%" y="1250" class="subtitulo">${subtitulo}</text>

</svg>`);

    const starburst = Buffer.from(`
<svg width="1800" height="1500">
   <style>
 
  .precio {
   font-size: 300px;
    font-weight: bold;
    font-family: 'Impact', sans-serif;
   
  }
</style>

  <text x="1380" y="790" fill="white" font-size="250" font-weight="bold"
        text-anchor="middle">s/${precio}</text>
</svg>`);

    const banner = Buffer.from(`
<svg width="2000" height="140" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" x2="1">
      <stop offset="0" stop-color="#FF8A00"/>
      <stop offset="1" stop-color="#FF3D00"/>
    </linearGradient>
    <filter id="s2" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.35)"/>
    </filter>
  </defs>
  <rect width="2000" height="140" fill="url(#g1)"/>
  <text x="50%" y="86" font-size="46" font-weight="600"
        font-family="'Trebuchet MS', Verdana, sans-serif"
        text-anchor="middle" fill="#FFF" filter="url(#s2)">
    📍 794 Calle Unión, Chilca — Huancayo, Perú
  </text>
</svg>

`);

    const finalFile = `final_${Date.now()}.png`;

    await base
      .composite([
        { input: banner, top: 20, left: 0 },
        { input: logo, top: 20, left: 5 },
        { input: ofertainsignia, top: 800, left: 1120 },
        { input: starburst, top: 500, left: 80 },
        { input: overlay, top: 500, left: 90 },
        { input: rasgado, top: 1880, left: 1300 },
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
