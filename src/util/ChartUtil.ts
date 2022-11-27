import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

export async function createChart(xvalues: (string|number)[], yvalues_total: number[][], titles:string[], colors:string[], pixelwidth:number, pixelheight:number):Promise<Buffer> {
    // console.log(yvalues_total);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configuration: any = {
        type: 'line',
        data: {
            labels: xvalues,
            datasets: []
        },
        options: {
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit:xvalues.length
                    }
                }
            }
        }
    }

    for (const i in yvalues_total) {
        const title = titles[i];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry:any = {
            label: title,
            data: yvalues_total[i],
            borderColor: colors[i],
            borderWidth: 1,
            radius: 0
        };
        configuration.data.datasets.push(entry);
    }

    // console.log(configuration);
    
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: pixelwidth, height: pixelheight });

    const image:Buffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return image;
}