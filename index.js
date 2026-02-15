const express = require('express');
const axios = require('axios');
const { PNG } = require('pngjs');
const app = express();
app.use(express.json());

app.post('/analizar-carbono', async (req, res) => {
    const { url } = req.body;
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        new PNG().parse(buffer, (err, png) => {
            if (err) return res.json({ valido: false, error: "Imagen ilegible" });

            let pixelesVerdes = 0, pixelesAmarillos = 0, pixelesRojos = 0, pixelesNube = 0;
            const total = png.width * png.height;

            for (let i = 0; i < png.data.length; i += 4) {
                const r = png.data[i], g = png.data[i+1], b = png.data[i+2], a = png.data[i+3];
                if (a === 0 || (r > 240 && g > 240 && b > 240)) pixelesNube++;
                else if (g > r && g > b) pixelesVerdes++;
                else if (r > g && g > b) pixelesAmarillos++;
                else pixelesRojos++;
            }

            const visibilidad = ((total - pixelesNube) / total) * 100;
            res.json({
                valido: visibilidad > 20, // Solo es válida si no es pura nube
                calidad: visibilidad.toFixed(2) + "%",
                conteo: {
                    alta_captura_ha: ((pixelesVerdes / total) * req.body.areaHa).toFixed(2),
                    media_captura_ha: ((pixelesAmarillos / total) * req.body.areaHa).toFixed(2),
                    suelo_ha: ((pixelesRojos / total) * req.body.areaHa).toFixed(2)
                },
                url_procesada: url
            });
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(process.env.PORT || 3000);
