function renderCharts(stats){
    const labels = Object.keys(stats);
    const counts = labels.map(l=>stats[l]);

    new Chart(document.getElementById("bar"),{
        type:"bar",
        data:{labels:labels,datasets:[{label:"Total",data:counts,backgroundColor:["#4caf50","#ffc107","#f44336"]}]},
        options:{responsive:true}
    });

    new Chart(document.getElementById("pie"),{
        type:"pie",
        data:{labels:labels,datasets:[{data:counts,backgroundColor:["#4caf50","#ffc107","#f44336"]}]},
        options:{responsive:true}
    });
}
