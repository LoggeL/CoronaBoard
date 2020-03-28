function parseCSV(str) {
    const arr = []
    let quote = false  // true means we're inside a quoted field

    // iterate over each character, keep track of current row and column (of the returned array)
    for (let row = 0, col = 0, c = 0; c < str.length; c++) {
        const cc = str[c], nc = str[c + 1]        // current character, next character
        arr[row] = arr[row] || []             // create a new row if necessary
        arr[row][col] = arr[row][col] || ''   // create a new column (start with empty string) if necessary

        // If the current character is a quotation mark, and we're inside a
        // quoted field, and the next character is also a quotation mark,
        // add a quotation mark to the current column and skip the next character
        if (cc == '"' && quote && nc == '"') {
            arr[row][col] += cc
            ++c
            continue
        }

        // If it's just one quotation mark, begin/end quoted field
        if (cc == '"') {
            quote = !quote
            continue
        }

        // If it's a comma and we're not in a quoted field, move on to the next column
        if (cc == ',' && !quote) {
            ++col
            continue
        }

        // If it's a newline (CRLF) and we're not in a quoted field, skip the next character
        // and move on to the next row and move to column 0 of that new row
        if (cc == '\r' && nc == '\n' && !quote) {
            ++row
            col = 0
            ++c
            continue
        }

        // If it's a newline (LF or CR) and we're not in a quoted field,
        // move on to the next row and move to column 0 of that new row
        if (cc == '\n' && !quote) {
            ++row
            col = 0
            continue
        }
        if (cc == '\r' && !quote) {
            ++row
            col = 0
            continue
        }

        // Otherwise, append the current character to the current column
        arr[row][col] += cc
    }
    return arr
}

Array.prototype.max = function () {
    return Math.max.apply(null, this);
}

function exchangeName(oldName, newName) {
    covidObj[newName] = covidObj[oldName]
    delete covidObj[oldName]
}

let covidData
let legend
let covidObj = {}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

fetch('https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_global.csv').then(response =>
    response.text().then(csv => {
        covidData = parseCSV(csv)
        legend = covidData.shift()

        covidData = covidData.sort((a, b) => b[a.length - 1] - a[b.length - 1])
        covidData.forEach(e => covidObj[e[1]] = Number(covidObj[e[1]] || 0) + Number(e[e.length - 1]))

        // Fix names
        covidObj['United States of America'] = covidObj['US']
        delete covidObj['US']
        const greenland = covidData.find(e => e[0] == "Greenland")
        covidObj['Greenland'] = greenland[greenland.length - 1]
        covidObj['Denmark'] = covidObj['Denmark'] - covidObj['Greenland']

        exchangeName('Korea, South', 'South Korea')
        exchangeName('Congo (Brazzaville)', 'Congo')
        exchangeName('Congo (Kinshasa)', 'Dem. Rep. Congo')
        exchangeName('Cote d\'Ivoire', 'Côte d\'Ivoire')
        exchangeName('Bosnia and Herzegovina', 'Bosnia and Herz.')
        exchangeName('Taiwan*', 'Taiwan')
        exchangeName('Dominican Republic', 'Dominican Rep.')


        const maxInfected = covidData.map(e => e.slice(-1)[0]).max()
        document.getElementById('colorbarMaxInfected').innerText = maxInfected
        document.getElementById('infectedHeader').innerText += ` (${legend[legend.length - 1]})`

        fetch('../data/countries-50m.json').then((r) => r.json()).then((data) => {
            const countries = ChartGeo.topojson.feature(data, data.objects.countries).features

            new Chart(document.getElementById("infectedMap").getContext("2d"), {
                type: 'choropleth',
                data: {
                    labels: countries.map((d) => (d.properties.name + ' ' + (covidObj[d.properties.name] || "| No data")).replace(/\B(?=(\d{3})+(?!\d))/g, " ")),
                    datasets: [{
                        label: 'Countries',
                        backgroundColor: (context) => {
                            if (context.dataIndex == null) {
                                return null;
                            }
                            const value = context.dataset.data[context.dataIndex];
                            const colorScale = 255 - Math.round(Math.log10(value.value) / Math.log10(maxInfected) * 255)
                            return `rgb(255, ${colorScale}, ${colorScale})`
                            // 255, 0, 0 || 255, 255, 255
                        },
                        data: countries.map((d) => {
                            return {
                                feature: d,
                                value: covidObj[d.properties.name] || 0
                            }
                        }),
                    }]
                },
                options: {
                    showOutline: true,
                    showGraticule: true,
                    legend: {
                        display: false
                    },
                    scale: {
                        projection: 'equalEarth'
                    }
                }
            })

            let historicalData = []
            for (let i = 0; i < 5; i++) {
                const e = covidData[i]
                historicalData.push({
                    label: e[1],
                    data: e.slice(4),
                    borderColor: getRandomColor(),
                    fill: false
                })
            }

            console.log(historicalData)

            new Chart(document.getElementById("infectedHistorical").getContext("2d"), {
                type: 'line',
                data: {
                    labels: legend.slice(4),
                    datasets: historicalData
                },
                options: {
                    //legend: true,
                    scales: {
                        xAxes: [{
                            display: true,
                        }],
                        yAxes: [{
                            display: true,
                            type: 'logarithmic',
                        }]
                    }
                }
            });
        })

        const covidTableData = covidData.map(e => {
            [province, state, lat, lon, ...cases] = e
            return [province, state, ...cases.reverse()]
        });
        [province, state, lat, lon, ...cases] = legend
        const tableData = {
            headings: [province, state, ...cases.reverse()],
            data: covidTableData
        }
        new simpleDatatables.DataTable(document.getElementById('infectedHistoricalTable'), { data: tableData, fixedHeight: true })
    })
)
