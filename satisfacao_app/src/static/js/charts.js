/**
 * Função principal para gerar os gráficos no dashboard administrativo.
 * @param {Object} stats - Objeto contendo as contagens por nível de satisfação.
 */
function renderCharts(stats){
    const labels = Object.keys(stats);
    const counts = labels.map(l=>stats[l]);

    // Mapeamento de etiquetas para cores específicas para manter a consistência visual
    const colorMap = {
        "Muito satisfeito": "#4caf50", // Verde
        "Satisfeito": "#fdd835",       // Amarelo
        "Insatisfeito": "#f44336"      // Vermelho
    };

    // Atribui cor cinzenta caso a etiqueta não seja reconhecida
    const backgroundColors = labels.map(label => colorMap[label] || "#9e9e9e");

    // Configuração do gráfico de barras (Bar Chart)
    new Chart(document.getElementById("bar"),{
        type:"bar",
        data:{
            labels:labels,
            datasets:[{
                label:"Total",
                data:counts,
                backgroundColor:backgroundColors
            }]
        },
        options:{
            responsive:true,
            plugins: {
                legend: { display: false } // Oculta a legenda no gráfico de barras
            }
        }
    });

    // Configuração do gráfico circular (Pie Chart)
    new Chart(document.getElementById("pie"),{
        type:"pie",
        data:{
            labels:labels,
            datasets:[{
                data:counts,
                backgroundColor:backgroundColors
            }]
        },
        options:{responsive:true}
    });
}
