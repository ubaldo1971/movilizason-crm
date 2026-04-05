const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        let mapServers = new Set();
        page.on('request', request => {
            const url = request.url();
            if(url.includes('MapServer') || url.includes('FeatureServer') || url.includes('/arcgis/')) {
                mapServers.add(url.split('?')[0]);
            }
        });
        
        await page.goto('https://cartografia.ine.mx/sige8/mapas/mapas-digitales', {waitUntil: 'networkidle2'});
        await browser.close();
        
        console.log("FOUND MAP SERVERS:");
        mapServers.forEach(url => console.log(url));
    } catch(e) {
        console.error(e);
    }
})();
