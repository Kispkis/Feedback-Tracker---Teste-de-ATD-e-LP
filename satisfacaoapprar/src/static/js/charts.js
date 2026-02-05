function renderCharts(stats){
    const labels = Object.keys(stats);
    const counts = labels.map(l=>stats[l]);

    // Map labels to correct colors to ensure consistency
    const colorMap = {
        "Muito satisfeito": "#4caf50", // Green
        "Satisfeito": "#fdd835",       // Yellow
        "Insatisfeito": "#f44336"      // Red
    };

    const backgroundColors = labels.map(label => colorMap[label] || "#9e9e9e");

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
                legend: { display: false }
            }
        }
    });

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
