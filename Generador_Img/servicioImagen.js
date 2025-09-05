import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import path from "path";


dotenv.config();

const API_KEY = process.env.FREEPIK_API_KEY;

// 🔹 Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function generarImagenFinal({ prompt, titulo, subtitulo, precio, }) {
  // Prompt fijo publicitario (predeterminado en backend)
const basePrompt = `
High-quality professional advertising design,
modern marketing poster style,
eye-catching composition,
vibrant commercial colors,
premium look, perfect for promotional campaigns
`;

// Prompt dinámico que llega desde frontend
const userPrompt = prompt || "";

// Fusión de ambos
const finalPrompt = `${userPrompt}, ${basePrompt}`;

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
        prompt: finalPrompt
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
const { width, height } = await base.metadata();

const fontSizeTitulo = Math.round(width * 0.18);
const fontSizeSubtitulo = Math.round(width * 0.05);
const posTitulo = Math.round(height * 0.55);     // 75% de la altura
const posSubtitulo = Math.round(height * 0.60);  // 85% de la altura
const overlay = Buffer.from(`
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .titulo {
      fill: url(#gradTitulo);
      font-size: ${fontSizeTitulo}px;
      font-weight: 2000;
      text-anchor: middle;
      font-family: 'Impact', Arial Black, sans-serif;
      stroke: #8B0000; /* borde rojo oscuro */
      stroke-width: 8px;
      paint-order: stroke fill;
      text-transform: uppercase;
      letter-spacing: 3px;
      filter: url(#shadow);
    }
    .subtitulo {
      fill: #ffffff;
      font-size: ${fontSizeSubtitulo}px;
      font-weight: 1200;
      text-anchor: middle;
      font-family: 'Arial Black', sans-serif;
      stroke: #d84315; /* borde naranja/rojo */
      stroke-width: 3px;
      paint-order: stroke fill;
      text-transform: uppercase;
      filter: url(#glow);
    }
  </style>
  <defs>
    <!-- Degradado del título -->
    <linearGradient id="gradTitulo" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ff3d00;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ff9800;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ffc107;stop-opacity:1" />
    </linearGradient>

    <!-- Sombra -->
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6"/>
      <feOffset dx="5" dy="10" result="offset"/>
      <feFlood flood-color="#ff6f00" flood-opacity="0.7"/>
      <feComposite in2="offset" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Glow -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Texto principal -->
  <text x="50%" y="${posTitulo}" class="titulo">${titulo}</text>

  <!-- Texto secundario -->
  <text x="50%" y="${posSubtitulo}" class="subtitulo">${subtitulo}</text>
</svg>


`);



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

// ////////////////////////////////////////////////////////////////////////////////

// 1. Crear tarea de conversión imagen → video
// 1. Crear tarea con kling-v2-1-master
export async function generateVideoFromFile(filePath, mimetype, prompt) {
  try {
    console.log('📌 Leyendo archivo:', filePath);
    const imageBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const imageData = `data:${mimetype};base64,${imageBase64}`;

    console.log('📌 Enviando solicitud a Freepik...');
    const createRes = await fetch('https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-master', {
      method: 'POST',
      headers: { 'x-freepik-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData, prompt, cfg_scale: 0.5, duration: "5" })
    });

    const createData = await createRes.json();
    console.log('📌 Respuesta de creación de tarea:', createData);

    if (!createData.data || !createData.data.task_id) {
      throw new Error('❌ No se recibió task_id de Freepik');
    }

    const taskId = createData.data.task_id;
    console.log('📌 Task ID:', taskId);

    let status = "CREATED";
    let result;
    const timeout = Date.now() + 5 * 60 * 1000; // 5 minutos

    while (status !== "COMPLETED" && status !== "FAILED" && Date.now() < timeout) {
      console.log(`⏳ Estado actual: ${status}...`);
      await new Promise(r => setTimeout(r, 5000));

      const checkRes = await fetch(`https://api.freepik.com/v1/ai/image-to-video/kling-v2-1-master/${taskId}`, {
        method: 'GET',
        headers: { 'x-freepik-api-key': API_KEY }
      });

      const checkData = await checkRes.json();
      console.log('📌 Estado de la tarea:', checkData);

      status = checkData.data.status;
      result = checkData;
    }

    fs.unlinkSync(filePath);
    console.log('📌 Archivo temporal borrado');

    if (status === "COMPLETED") {
      console.log('✅ Video generado correctamente:', result.data.generated[0].url);
      return result.data.generated[0];
    } else {
      console.error('❌ La tarea falló o se agotó el tiempo', result);
      throw new Error('Video no se pudo generar');
    }
  } catch (err) {
    console.error('💥 Error en generateVideoFromFile:', err.message);
    throw err;
  }
}