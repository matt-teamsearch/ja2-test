var lineYticks
var lineXticks
var lineChartSetup={
  type: 'line',
  data: {
    labels: [],
    datasets: [
    ]
  },
  options: {
    animation: {
        duration: 0
    },
    tooltips: {
      callbacks: {
        label: function(tooltipItem, data) {
          var label = data.datasets[tooltipItem.datasetIndex].label || '';
          if (label) {
              label += ': ';
          }
          label += Math.floor(tooltipItem.yLabel);
          return label;
        }
      }
    },
    plugins: {
      datalabels: {
        display:false
      }
    },
    annotation: {
      drawTime: "afterDatasetsDraw",
      annotations: [
        {
          id: 'box1',
          display: false,
          type: 'box',
          xScaleID: 'x-axis-0',
          yScaleID: 'y-axis-0',
          backgroundColor: 'rgba(255, 0, 0, 0.1)',
          borderColor: 'rgba(255, 0, 0, 0.1)',
          borderWidth: 1
        }
      ]
    },
    responsive: true,
    legend: {
      display: true,
      labels: {
        usePointStyle: true,
        boxWidth: 10,
        fontColor: 'black',
        filter: function(item, chart) {
          console.log(item)
          return !item.text.includes('holiday');
        }
      }
    },
    title: {
      display: false,
      text: '',
      fontColor: 'black',
      fontSize: 14,
      fontStyle: 'normal'
      },
    scales: {
      yAxes : [
        {
          id:'y-axis-0',
          display:false,
          ticks : {
            beginAtZero : true,
            callback : function(value,index,values){
                lineYticks = values;
                return value;
            }
          }
        },
      ],
      xAxes : [{
        ticks : {
          beginAtZero : true,
          callback : function(value,index,values){
              lineXticks = values;
              return value;
          }
        }
      }]
    },
  }
}
