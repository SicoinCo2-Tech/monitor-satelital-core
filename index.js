const express = require('express');
const axios = require('axios');
const { PNG } = require('pngjs');
const app = express();
app.use(express.json());

app.post('/analizar', async (req, res) => {
    const { url, estudio } = req.body;
    
    if (!url) return res.status(400).json({ valido: false, error: "Falta URL" });

    try {
        // 1. Descargamos la imagen como un flujo de datos (buffer)
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        // 2. Procesamos el PNG
        new PNG().parse(buffer, (err, png) => {
            if (err) return res.json({ valido: false, error: "PNG corrupto o vacío" });

            let pixelesConDatos = 0;
            let pixelesNube = 0;
            const totalPixeles = png.width * png.height;

            for (let i = 0; i < png.data.length; i += 4) {
                const r = png.data[i];
                const g = png.data[i + 1];
                const b = png.data[i + 2];
                const a = png.data[i + 3];

                // Detectar transparencia (dataMask = 0)
                if (a === 0) continue; 
                
                // Detectar nubes (pixeles casi blancos puros generados por el script)
                if (r > 250 && g > 250 && b > 250) {
                    pixelesNube++;
                } else {
                    pixelesConDatos++;
                }
            }

            const coberturaReal = (pixelesConDatos / totalPixeles) * 100;

            // 3. Resultado para n8n
            res.json({
                valido: coberturaReal > 30, // Solo es válido si más del 30% tiene datos reales
                calidad_score: coberturaReal.toFixed(2),
                estudio_tipo: estudio || "General",
                timestamp: new Date().toISOString()
            });
        });
    } catch (e) {
        res.status(500).json({ valido: false, error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));
