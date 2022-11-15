const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

export async function createChart(xvalues: any[], yvalues_total: number[][], titles:string[], colors:string[], pixelwidth:number, pixelheight:number) {
    // console.log(yvalues_total);
    
    var configuration: any = {
        type: 'line',
        data: {
            labels: xvalues,
            datasets: []
        }
    }

    for (var i in yvalues_total) {
        const title = titles[i];
        var entry:any = {
            label: title,
            data: yvalues_total[i],
            borderColor: colors[i],
            borderWidth: 1
        };
        configuration.data.datasets.push(entry);
    }

    // console.log(configuration);
    
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: pixelwidth, height: pixelheight });

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    return image;
}