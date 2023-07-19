const reportTilePresets=(params)=>{
  var meaningless=['with','they','have',"it's"]
  var workloadLineSetup={
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
          filter: item=>!item.text.includes('holiday')
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
  function getWorkloadData(p){
    let params=$.extend(true,{
      projStart:moment('1900-01-01'),
      projEnd:moment('1900-01-01')
    }, p)
    return new Promise((resolve,reject)=>{
      params.stDate=moment.utc(params.stDate)
      params.enDate=moment.utc(params.enDate)
      $.ajax({
        url: '/get-pm-workloads/'+params.stDate.format("YYYY-MM-DD")+'/'+params.enDate.format("YYYY-MM-DD")+'/'+params.jobTitleID,
        type: 'GET',
        contentType: 'application/json',
        // global:false,
        success: function (response) {
          // console.log("rendering workload data")
          params.stDate=params.stDate.format()
          params.enDate=params.enDate.format()
          params.projStart=params.projStart.format()
          params.projEnd=params.projEnd.format()
          // console.log(params,response)
          $.ajax({url:'/render-workloads/',type:'POST',data:{response:response,params:params},success:(workloads)=>{
            // console.log(workloads)
            // console.log("rendered workload data")
            resolve(workloads)
          }})
          // var dateLabels=Array.from(moment.range(params.stDate,params.enDate).by('day'))
          // let responseData=response.jobs[0].filter(pmRow=>isSqlGroup(pmRow,['grpstaff']) && response.teamupCals.find(el=>el.id==pmRow.teamupID)).map((pmRow, i) => {
          //   var pm=pmRow.staffName
          //   pmRow.days=dateLabels.map((dte,d)=>({
          //     date:dte,
          //     label:dte.format("DD-MMM"),
          //     jobs:response.jobs[d].filter(el=>el.staffName==pm),
          //     teamup:response.teamup.filter(t=>t.subcalendar_ids.includes(Number(pmRow.teamupID)) && t.all_day==false && moment.utc(t.start_dt).isSame(dte,'day')).map(t=>({task:t,mins:moment.utc(t.end_dt).diff(moment.utc(t.start_dt),'minutes')>480?0:moment.utc(t.end_dt).diff(moment.utc(t.start_dt),'minutes'),})),
          //     absenceMultiplier:(dte.isSameOrAfter(params.projEnd,'day') || dte.isSameOrBefore(params.projStart,'day')?2:1)
          //   })).filter(dte=>dte.date.format('e')!=0 && dte.date.format('e')!=6)
          //   pmRow.absences=response.absences.filter(el=>el.cancelled==false && el.employee.id==pmRow.breatheID && moment.utc(el.start_date).isSameOrBefore(params.enDate,'day') && moment.utc(el.end_date).isSameOrAfter(params.stDate,'day'))
          //   pmRow.teamup=[]
          //   pmRow.jobs=response.jobs.map(day=>day.find(staff=>isSqlGroup(staff,['grpstaff','grpjob']) && staff.staffName==pm))
          //   pmRow.colourRef=response.teamupCals.find(el=>el.id==pmRow.teamupID)
          //   pmRow.colour=response.teamupColors.find(el=>el.id==pmRow.colourRef.color).hex
          //   return pmRow
          // })
          // console.log("rendered workload data")
          // resolve(responseData)
        },
        error: function (jqXHR, exception) {
          console.log(getErrorMessage(jqXHR, exception))
          reject(getErrorMessage(jqXHR, exception))
        },
      });
    })
  }
  function getWorkloadJobChart(p,pmJobsChart,data,renderDrill){
    // console.log("rendering workload chart")
    let params=$.extend(true,{
      projStart:moment('1900-01-01'),
      projEnd:moment('1900-01-01')
    }, p)
    params.stDate=moment.utc(params.stDate)
    params.enDate=moment.utc(params.enDate)
    var dateLabels=data[0].days.map(d=>moment(d.date))
    pmJobsChart.data.labels=dateLabels.map(el=>el.format("DD-MMM"))
    pmJobsChart.data.datasets=[]
    pmJobsChart.options.onClick=function(e,data){
      let line=this.getElementAtEvent(e)[0]
      if (line) {
        e.stopPropagation()
        let x=line._chart.config.data.labels[line._index]
        let y=line._chart.config.data.datasets[line._datasetIndex].label
        $(pmJobsChart.canvas).closest('.reportTile').removeClass("btn btn-light")
        renderDrill(1,$(pmJobsChart.canvas).closest('.visual.custom'),{x:x,y:y},y+" - "+x)
      }
    }
    data.forEach((pmRow, i) => {
      var pm=pmRow.staffName
      pmJobsChart.data.datasets.push({
        data:pmRow.days.map(el=>el.jobs?el.jobs.filter(j=>isSqlGroup(j,['grpstaff','grpjob'])).length:0),
        spanGaps:true,
        pointRadius:1,
        pointHitRadius:5,
        borderColor:hexToRGB(pmRow.colour, 0.7),
        pointBorderColor:hexToRGB(pmRow.colour, 0.7),
        pointBackgroundColor:hexToRGB(pmRow.colour, 0.3),
        borderWidth:4,
        backgroundColor:'rgba(0,0,0,0)',
        label:pm
      })
      pmRow.absences.forEach((absence, i) => {
        var barData=[]
        let xOfDateVal=(dateVal)=>pmRow.days.findIndex(el=>moment(el.date).isSame(moment.utc(dateVal),'day'))
        barData.push(xOfDateVal(absence.start_date))
        barData.push(xOfDateVal(absence.end_date)+1)
        var abs={
          type:'horizontalBar',
          label:pm,
          data: [barData],
          yAxisID: 'bar',
          borderColor:hexToRGB(pmRow.colour, 0.3),
          borderWidth:1,
          categoryPercentage: 1,
          barPercentage: 1,
          backgroundColor:hexToRGB(pmRow.colour, 0.3)
        }
        pmJobsChart.data.datasets.push(abs)
      });
    })
    pmJobsChart.options.tooltips={
      callbacks: {
        label: function(tooltipItem, data) {
          var label = data.datasets[tooltipItem.datasetIndex].label || '';
          if (label) {
            label += ': ';
          }
          if (tooltipItem.yLabel=="Holiday") {
            label += tooltipItem.xLabel.map(el=>data.labels[el]).join(" - ");
          }else {
            label += Math.floor(tooltipItem.yLabel);
          }
          return label;
        }
      }
    }
    pmJobsChart.options.legend.labels.filter=item=>item.lineWidth>1
    var holYaxis={
      id:'bar',
      type: "category",
      stacked: true,
      display:false,
      labels: ["Holiday"],
      offset: true
    }
    pmJobsChart.options.scales.yAxes.push(holYaxis)
    pmJobsChart.options.legend.onClick=function (e, legendItem) {
      e.stopPropagation()
      var thisPM=legendItem.text
      this.chart.data.datasets.forEach((dataset,i)=>{
        if (dataset.label==thisPM) {
          var meta=this.chart.getDatasetMeta(i)
          meta.hidden=(meta.hidden===null?true:null)
        }
      });
      this.chart.update()
    }
    pmJobsChart.update()
    if (dateLabels.filter(el=>el.isSame(params.projStart,'day') || el.isSame(params.projEnd,'day')).length>0) {
      pmJobsChart.annotation.elements['box1'].options.xMin = dateLabels.find(el=>el.isSame(params.projStart,'day'))?params.projStart.format("DD-MMM"):dateLabels[0].format("DD-MMM")
      pmJobsChart.annotation.elements['box1'].options.xMax = dateLabels.find(el=>el.isSame(params.projEnd,'day'))?params.projEnd.format("DD-MMM"):dateLabels[dateLabels.length-1].format("DD-MMM")
      pmJobsChart.annotation.elements['box1'].options.yMin = 0
      pmJobsChart.annotation.elements['box1'].options.yMax = 9999
      pmJobsChart.annotation.elements['box1'].options.backgroundColor = 'rgba(255, 0, 0, 0.1)'
    }else {
      pmJobsChart.annotation.elements['box1'].options.backgroundColor = 'rgba(255, 0, 0, 0)'
    }
    pmJobsChart.update()
  }
  function getWorkloadTeamupChart(p,pmTeamupChart,data,renderDrill){
    let params=$.extend(true,{
      projStart:moment('1900-01-01'),
      projEnd:moment('1900-01-01')
    }, p)
    params.stDate=moment.utc(params.stDate)
    params.enDate=moment.utc(params.enDate)
    var dateLabels=data[0].days.map(d=>moment(d.date))
    pmTeamupChart.data.labels=dateLabels.map(el=>el.format("DD-MMM"))
    pmTeamupChart.data.datasets=[]
    pmTeamupChart.options.onClick=function(e,data){
      let line=this.getElementAtEvent(e)[0]
      if (line) {
        e.stopPropagation()
        let x=line._chart.config.data.labels[line._index]
        let y=line._chart.config.data.datasets[line._datasetIndex].label
        $(pmTeamupChart.canvas).closest('.reportTile').removeClass("btn btn-light")
        renderDrill(1,$(pmTeamupChart.canvas).closest('.visual.custom'),{x:x,y:y},y+" - "+x)
      }
    }
    data.forEach((pmRow, i) => {
      var pm=pmRow.staffName
      pmTeamupChart.data.datasets.push({
        data:pmRow.days.map(el=>el.teamup?el.teamup.reduce((a,b)=>a+b.mins,0):0).flat(2).map((mins,i,self)=>{
          let r=(i==0?mins:(mins+self[i-1])/2)
          if (i>1) {
            r=(mins+self[i-1]+self[i-2])/3
          }
          return Math.round(r/60*100)/100
        }),
        spanGaps:true,
        pointRadius:1,
        pointHitRadius:5,
        borderColor:hexToRGB(pmRow.colour, 0.7),
        pointBorderColor:hexToRGB(pmRow.colour, 0.7),
        pointBackgroundColor:hexToRGB(pmRow.colour, 0.3),
        borderWidth:4,
        backgroundColor:'rgba(0,0,0,0)',
        label:pm
      })
      pmRow.absences.forEach((absence, i) => {
        var barData=[]
        let xOfDateVal=(dateVal)=>pmRow.days.findIndex(el=>moment(el.date).isSame(moment.utc(dateVal),'day'))
        barData.push(xOfDateVal(absence.start_date))
        barData.push(xOfDateVal(absence.end_date)+1)
        var abs={
          type:'horizontalBar',
          label:pm,
          data: [barData],
          yAxisID: 'bar',
          borderColor:hexToRGB(pmRow.colour, 0.3),
          borderWidth:1,
          categoryPercentage: 1,
          barPercentage: 1,
          backgroundColor:hexToRGB(pmRow.colour, 0.3)
        }
        pmTeamupChart.data.datasets.push(abs)
      });
    })
    var holYaxis={
      id:'bar',
      type: "category",
      stacked: true,
      display:false,
      labels: ["Holiday"],
      offset: true
    }
    pmTeamupChart.options.scales.yAxes.push(holYaxis)
    pmTeamupChart.options.legend.onClick=function (e, legendItem) {
      e.stopPropagation()
      var thisPM=legendItem.text
      this.chart.data.datasets.forEach((dataset,i)=>{
        if (dataset.label==thisPM) {
          var meta=this.chart.getDatasetMeta(i)
          meta.hidden=(meta.hidden===null?true:null)
        }
      });
      this.chart.update()
    }
    pmTeamupChart.options.legend.labels.filter=item=>item.lineWidth>1
    pmTeamupChart.options.tooltips={
      callbacks: {
        label: function(tooltipItem, data) {
          var label = data.datasets[tooltipItem.datasetIndex].label || '';
          if (label) {
            label += ': ';
          }
          if (tooltipItem.yLabel=="Holiday") {
            label += tooltipItem.xLabel.map(el=>dateLabels[el].format("DD-MMM")).join(" - ");
          }else {
            label += tooltipItem.yLabel+" hours"
          }
          return label;
        }
      }
    }
    pmTeamupChart.update()
    if (dateLabels.filter(el=>el.isSame(params.projStart,'day') || el.isSame(params.projEnd,'day')).length>0) {
      pmTeamupChart.annotation.elements['box1'].options.xMin = dateLabels.find(el=>el.isSame(params.projStart,'day'))?params.projStart.format("DD-MMM"):dateLabels[0].format("DD-MMM")
      pmTeamupChart.annotation.elements['box1'].options.xMax = dateLabels.find(el=>el.isSame(params.projEnd,'day'))?params.projEnd.format("DD-MMM"):dateLabels[dateLabels.length-1].format("DD-MMM")
      pmTeamupChart.annotation.elements['box1'].options.yMin = 0
      pmTeamupChart.annotation.elements['box1'].options.yMax = 9999
      pmTeamupChart.annotation.elements['box1'].options.backgroundColor = 'rgba(255, 0, 0, 0.1)'
    }else {
      pmTeamupChart.annotation.elements['box1'].options.backgroundColor = 'rgba(255, 0, 0, 0)'
    }
    pmTeamupChart.update()
    // console.log("rendered workload chart")
  }
  return {
    coachingEffectiveness:{
      title:'Coaching effectiveness',
      id:'coaching',
      info:'The change in % shifts on target after coaching. Looks at the average of the 5 shifts before each coaching session versus the average of the 5 shifts after.',
      visual:{
        type:'counter',
        format:"+%",
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['coaching']
          },
          onResponse:(resp)=>resp['coaching']
        },
        calc:(data)=>data.find(el=>isSqlGroup(el,[]))?(data.find(el=>isSqlGroup(el,[])).afterCoaching-data.find(el=>isSqlGroup(el,[])).beforeCoaching)*100:0
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'staffName',title:'TL'},
          {field:'beforeCoaching',title:'Before coaching',formatter:'%'},
          {field:'afterCoaching',title:'After coaching',formatter:'%'},
          {field:'shiftsAfter',title:'Shifts since coaching'},
          {field:'effectiveness',title:'Effectiveness',mutator:(val,d)=>d.afterCoaching-d.beforeCoaching,formatter:'%+'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grpstaff']) && row.shiftsAfter>0,
        trail:(row)=>row.staffName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'beforeCoaching',title:'Before coaching',formatter:'%'},
          {field:'afterCoaching',title:'After coaching',formatter:'%'},
          {field:'shiftsAfter',title:'Shifts since coaching'},
          {field:'effectiveness',title:'Effectiveness',mutator:(val,d)=>d.afterCoaching-d.beforeCoaching,formatter:'%+'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grpagent','grpstaff']) && row.shiftsAfter>0 && row.staffID==src.staffID,
        trail:(row)=>row.agentName
      },
      ]
    },
    dailyContribution:{
      title:`Contribution`,
      id:'cont',
      info:'',
      visual:{
        type:'line',
        format:"%",
        targets:[35,45],
        targetReverse:true,
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['cont'],
          },
          onResponse:(resp)=>resp['cont']
        },
        calc:(data)=>data.filter(el=>el.grpagent && el.grpjob).map(el=>Math.round(el.cont*100)),
        labels:(data)=>data.filter(el=>el.grpagent && el.grpjob).map(el=>moment(el.inputDate).format("DD/MM/YYYY")),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'inputDate',title:'Date',formatter:'d'},
          {field:'cont',title:'Contribution',formatter:'%'},
        ],
        filter:(src,row)=>isGroup(row,['grpdate']),
        trail:(row)=>moment(row.inputDate).format('DD/MM/YYYY')
      },
      {
        cols:(data)=>[
          {field:'jobName',title:'Job'},
          {field:'hrs',title:'Hours',formatter:'0.00'},
          {field:'ints',title:'Ints'},
          {field:'ahr',title:'AHR',mutator:(val,d)=>d.ints/d.hrs,formatter:'0.00'},
          {field:'cont',title:'Contribution',formatter:'%'},
        ],
        filter:(src,row)=>row.grpagent && !row.grpjob && src.x?moment(src.x,'DD/MM/YYYY').isSame(row.inputDate,'day'):src.inputDate==row.inputDate,
        trail:(row)=>row.jobName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'hrs',title:'Hours',formatter:'0.00'},
          {field:'ints',title:'Ints'},
          {field:'ahr',title:'AHR',mutator:(val,d)=>d.ints/d.hrs,formatter:'0.00'},
          {field:'cont',title:'Contribution',formatter:'%'},
        ],
        filter:(src,row)=>!row.grpagent && !row.grpjob && row.inputDate==src.inputDate && row.jobID==src.jobID,
        trail:(row)=>row.agentName
      },
      ]
    },
    weeklyAttendance:{
      title:`Attendance`,
      id:'attendance',
      info:'',
      visual:{
        type:'spark',
        format:"%",
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['attendance']
          },
          onResponse:(resp)=>resp['attendance']
        },
        total:(data)=>data.find(el=>isGroup(el,[])).shiftsWorked*100,
        line:(data)=>data.filter(el=>isGroup(el,['grpweek'])).map(el=>el.shiftsWorked*100),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'bookingWeek',title:'Week',formatter:'d'},
          {field:'shiftsWorked',title:'Attendance',formatter:'0.00%'},
        ],
        filter:(src,el)=>isGroup(el,['grpweek']),
        trail:(row)=>'w/c '+moment(row.bookingWeek).format("DD/MM/YYYY")
      },
      {
        cols:(data)=>[
          {field:'absenceType',title:'Absence'},
          {field:'shifts',title:'Shifts lost',formatter:'0.00'},
        ],
        filter:(src,row)=>isGroup(row,['grpweek','grpabsence']) && row.bookingWeek==src.bookingWeek && row.absenceType,
        trail:(row)=>row.absenceType
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'shifts',title:'Shifts lost',formatter:'0.00'},
        ],
        filter:(src,row)=>isGroup(row,['grpweek','grpabsence','grpagent']) && row.absenceType==src.absenceType && row.bookingWeek==src.bookingWeek,
        trail:(row)=>row.agentName
      },
      ]
    },
    weeklyAttendanceShift:{
      title:params.shift+` Attendance`,
      id:'attendance'+params.shift,
      info:'',
      visual:{
        type:'spark',
        format:"%",
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['attendanceShift']
          },
          onResponse:(resp)=>resp['attendanceShift']
        },
        total:(data)=>data.find(el=>isGroup(el,['grpshift']) && el['is'+params.shift]).hoursWorked*100,
        line:(data)=>data.filter(el=>isGroup(el,['grpweek','grpshift']) && el['is'+params.shift]).map(el=>el.hoursWorked*100),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'bookingWeek',title:'Week',formatter:'d'},
          {field:'appliedHours',title:'Hours',formatter:'0.00'},
          {field:'hoursWorked',title:'Worked',formatter:'0.00%'},
          {field:'hoursSick',title:'Sick',formatter:'0.00%'},
          {field:'hoursNoShow',title:'No show',formatter:'0.00%'},
          {field:'hoursCanx',title:'Canx',formatter:'0.00%'},
        ],
        filter:(src,el)=>isGroup(el,['grpweek','grpshift']) && el['is'+params.shift],
        trail:(row)=>'w/c '+moment(row.bookingWeek).format("DD/MM/YYYY")
      },
      {
        cols:(data)=>[
          {field:'absenceType',title:'Absence'},
          {field:'appliedHours',title:'Hours',formatter:'0.00'},
        ],
        filter:(src,row)=>isGroup(row,['grpweek','grpshift','grpabsence']) && row['is'+params.shift] && row.bookingWeek==src.bookingWeek,
        trail:(row)=>row.absenceType
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'appliedHours',title:'Hours',formatter:'0.00'},
        ],
        filter:(src,row)=>isGroup(row,['grpweek','grpshift','grpabsence','grpagent']) && row['is'+params.shift] && row.absenceType==src.absenceType && row.bookingWeek==src.bookingWeek,
        trail:(row)=>row.agentName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'appliedHours',title:'Hours',formatter:'0.00'},
          {field:'hoursWorked',title:'Worked',formatter:'0.00%'},
          {field:'hoursSick',title:'Sick',formatter:'0.00%'},
          {field:'hoursNoShow',title:'No show',formatter:'0.00%'},
          {field:'hoursCanx',title:'Canx',formatter:'0.00%'},
        ],
        filter:(src,row)=>isGroup(row,['grpagent','grpshift']) && row['is'+params.shift] && row.agentID==src.agentID,
        trail:(row)=>row.agentName
      },
      ]
    },
    annualSales:{
      title:`Sales (`+tsDates().busYear+`)`,
      id:'sales',
      info:'',
      visual:{
        type:'spark',
        format:"£big",
        data:{
          url:'/digest-data',
          query:{
            stDate:tsDates().busYearStart,
            enDate:tsDates().busYearEnd,
            queries:['sales']
          },
          onResponse:(resp)=>resp['sales']
        },
        total:(data)=>data.find(el=>isGroup(el,[])).sales,
        line:(data)=>data.filter(el=>isGroup(el,['grpdate'])).map((sum => el => sum += el.sales)(0)),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'qtr',title:'Quarter'},
          {field:'sales',title:'Sales',formatter:'money',formatterParams:{symbol:'£'}},
        ],
        filter:(src,el)=>isGroup(el,['grpqtr']),
        trail:(row)=>row.qtr
      },
      {
        cols:(data)=>[
          {field:'costTypeName',title:'Category'},
          {field:'sales',title:'Sales',formatter:'money',formatterParams:{symbol:'£'}},
        ],
        filter:(src,el)=>isGroup(el,['grpqtr','grpcost']) && src.qtr==el.qtr,
        trail:(row)=>row.costTypeName
      },
      {
        cols:(data)=>[
          {field:'projectName',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          {field:'sales',title:'Sales',formatter:'money',formatterParams:{symbol:'£'}},
        ],
        filter:(src,el)=>isGroup(el,['grpqtr','grpcost','grpjob']) && src.qtr==el.qtr && src.costTypeName==el.costTypeName,
        trail:(row)=>row.projectName
      },
      ]
    },
    qcChecksYday:{
      title:`QC checks yesterday`,
      id:'qcChecks',
      info:'',
      visual:{
        type:'pie',
        data:{
          url:'/digest-data',
          query:{
            stDate:moment().businessSubtract(1).format("YYYY-MM-DD"),
            enDate:moment().businessSubtract(1).format("YYYY-MM-DD"),
            queries:['qcChecks']
          },
          onResponse:(resp)=>resp['qcChecks']
        },
        total:(data)=>data.find(el=>isGroup(el,[])).qcCount,
        calc:(data)=>data.filter(el=>isGroup(el,['grptype'])).map(el=>el.qcCount),
        labels:(data)=>data.filter(el=>isGroup(el,['grptype'])).map(el=>el.type),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'type',title:'Type'},
          {field:'qcCount',title:'Checks'},
        ],
        filter:(src,el)=>isGroup(el,['grptype']),
        trail:(row)=>row.type
      },
      {
        cols:(data)=>[
          {field:'staffName',title:'Controller'},
          {field:'qcCount',title:'Checks'},
        ],
        filter:(src,el)=>isGroup(el,['grptype','grpstaff']) && (src.x?src.x:src.type)==el.type,
        trail:(row)=>row.staffName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Interviewer'},
          {field:'jobName',title:'Project'},
          {field:'score',title:'Score',formatter:'0.00'},
        ],
        filter:(src,el)=>isGroup(el,['grptype','grpstaff','grpcheck']) && src.type==el.type && src.staffName==el.staffName,
        trail:(row)=>row.agentName
      },
      ]
    },
    weeklyQCscores:{
      title:`QC scores`,
      id:'qcScores',
      info:'',
      visual:{
        type:'spark',
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['qcScores']
          },
          onResponse:(resp)=>resp['qcScores']
        },
        total:(data)=>data.find(el=>isGroup(el,[])).score,
        line:(data)=>data.filter(el=>isGroup(el,['grpwk'])).map(el=>el.score)
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'wk',title:'Week',formatter:'d'},
          {field:'score',title:'Avg score',formatter:'0.00'},
          {field:'qcCount',title:'# checks'},
        ],
        filter:(src,el)=>isGroup(el,['grpwk']),
        trail:(row)=>'w/c '+moment(row.wk).format("DD/MM/YYYY")
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'score',title:'Avg score',formatter:'0.00'},
          {field:'qcCount',title:'# checks'},
        ],
        filter:(src,el)=>isGroup(el,['grpagent','grpwk']) && el.wk==src.wk,
        trail:(row)=>row.agentName
      },
      {
        cols:(data)=>[
          {field:'interviewDate',title:'Date',formatter:'d'},
          {field:'jobName',title:'Project'},
          {field:'score',title:'Score'},
        ],
        filter:(src,el)=>{
          return isGroup(el,['grpagent','grpjob','grpdate','grpwk']) && src.agentID==el.agentID && src.wk==el.wk
        },
        trail:(row)=>moment(row.interviewDate).format("DD/MM/YYYY")+" - "+row.jobName
      },
      ]
    },
    qcScores:{
      title:`Average QC Score`,
      id:'qcScores',
      visual:{
        type:'bar',
        data:{
          url:'/board-report/',
          query:{stDate:params.stDate,enDate:params.enDate,queries:['qc']},
          onResponse:(resp)=>resp['qc']
        },
        labels:(data)=>data.filter(el=>isSqlGroup(el,['grpshift'])).map(el=>el.isEve==1?'Consumer':'B2B'),
        calc:(data)=>data.filter(el=>isSqlGroup(el,['grpshift'])).map(el=>Math.round(el.qcScore*100)/100),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'isEve',title:'Shift',formatter:(cell)=>(cell.getValue()==1?'Consumer':'B2B')},
          {field:'qcScore',title:'Avg score',formatter:'0.00'},
          {field:'qcCount',title:'# checks'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpshift']),
        trail:(row)=>row.isEve==1?'Consumer':'B2B'
      },
      {
        cols:(data)=>[
          {field:'teamName',title:'Team'},
          {field:'qcScore',title:'Avg score',formatter:'0.00'},
          {field:'qcCount',title:'# checks'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpshift','grpteam']) && el.isEve==(src.x?(src.x=='B2B'?0:1):src.isEve),
        trail:(row)=>row.teamName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'qcScore',title:'Avg score',formatter:'0.00'},
          {field:'qcCount',title:'# checks'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpshift','grpteam','grpagent']) && el.isEve==src.isEve && el.qcTeamID==src.qcTeamID,
        trail:(row)=>row.agentName
      },
      ]
    },
    absenceByType:{
      title:'Hours absent',
      id:'absence',
      visual:{
        type:'bar',
        data:{
          url:'/board-report/',
          query:{stDate:params.stDate,enDate:params.enDate,queries:['booking']},
          onResponse:(resp)=>resp['booking']
        },
        calc:(data)=>data.filter(el=>isSqlGroup(el,['grpab']) && el.absenceType).map(el=>el.bookedHours),
        labels:(data)=>data.filter(el=>isSqlGroup(el,['grpab']) && el.absenceType).map(el=>el.absenceType),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'absenceType',title:'Absence'},
          {field:'bookedHours',title:'Hours lost'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpab']) && el.absenceType,
        trail:(row)=>row.absenceType
      },
      {
        cols:(data)=>[
          {field:'isEve',title:'Shift',formatter:(cell)=>(cell.getValue()==1?'Consumer':'B2B')},
          {field:'bookedHours',title:'Hours lost'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpab','grpshift']) && el.absenceType==(src.x?src.x:src.absenceType),
        trail:(row)=>row.isEve==1?'Consumer':'B2B'
      },
      {
        cols:(data)=>[
          {field:'teamName',title:'Team'},
          {field:'bookedHours',title:'Hours lost'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpab','grpshift','grpteam']) && src.isEve==el.isEve && src.absenceType==el.absenceType,
        trail:(row)=>row.teamName
      },
      ]
    },
    dials:{
      title:`Dials per hour`,
      id:'dials',
      visual:{
        type:'counter',
        targets:[50,60,999],
        data:{
          url:'/board-report/',
          query:{stDate:params.stDate,enDate:params.enDate,queries:['shifts']},
          onResponse:(resp)=>resp['shifts']
        },
        calc:(data)=>{
          let d=data.find(el=>isSqlGroup(el,[]))
          return (d.calls+d.talktime)/d.dialHours
        },
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'isEve',title:'Shift',formatter:(cell)=>(cell.getValue()==1?'Consumer':'B2B')},
          {field:'dialHours',title:'Hours dialled',formatter:'0.00'},
          {field:'callsPH',title:'Calls made p/h',mutator:(v,d)=>d.calls/d.dialHours,formatter:'0.00'},
          {field:'talkTimePH',title:'Mins talk time p/h',mutator:(v,d)=>d.talktime/d.dialHours,formatter:'0.00'},
          {field:'dialsPH',title:'Dials p/h',mutator:(v,d)=>(d.calls+d.talktime)/d.dialHours,formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpshift']),
        trail:(row)=>row.isEve==1?'Consumer':'B2B'
      },
      {
        cols:(data)=>[
          {field:'teamName',title:'Team'},
          {field:'dialHours',title:'Hours dialled',formatter:'0.00'},
          {field:'callsPH',title:'Calls made p/h',mutator:(v,d)=>d.calls/d.dialHours,formatter:'0.00'},
          {field:'talkTimePH',title:'Mins talk time p/h',mutator:(v,d)=>d.talktime/d.dialHours,formatter:'0.00'},
          {field:'dialsPH',title:'Dials p/h',mutator:(v,d)=>(d.calls+d.talktime)/d.dialHours,formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpshift','grpteam']) && el.isEve==(src.x?(src.x=='B2B'?0:1):src.isEve),
        trail:(row)=>row.teamName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'dialHours',title:'Hours dialled',formatter:'0.00'},
          {field:'callsPH',title:'Calls made p/h',mutator:(v,d)=>d.calls/d.dialHours,formatter:'0.00'},
          {field:'talkTimePH',title:'Mins talk time p/h',mutator:(v,d)=>d.talktime/d.dialHours,formatter:'0.00'},
          {field:'dialsPH',title:'Dials p/h',mutator:(v,d)=>(d.calls+d.talktime)/d.dialHours,formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpshift','grpteam','grpagent']) && el.isEve==src.isEve && el.bookingTeamID==src.bookingTeamID,
        trail:(row)=>row.agentName
      },
      ]
    },
    coachingSessions:{
      title:'Coaching sessions',
      id:'sessions',
      visual:{
        type:'bar',
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['coaching']
          },
          onResponse:(resp)=>resp['coaching']
        },
        calc:(data)=>data.filter(el=>isSqlGroup(el,['grpstaff'])).map(el=>el.coachings),
        labels:(data)=>data.filter(el=>isSqlGroup(el,['grpstaff'])).map(el=>el.staffName)
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'staffName',title:'TL'},
          {field:'coachings',title:'Coaching sessions'},
          {field:'advisories',title:'Advisories'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grpstaff']),
        trail:(row)=>row.staffName
      },
      {
        cols:(data)=>[
          {field:'coachingType',title:'Type'},
          {field:'coachings',title:'Coaching sessions'},
          {field:'advisories',title:'Advisories'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grptype','grpstaff']) && row.staffName==(src.x?src.x:src.staffName),
        trail:(row)=>row.coachingType
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Agent'},
          {field:'coachings',title:'Coaching sessions'},
          {field:'advisories',title:'Advisories'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grptype','grpagent','grpstaff']) && row.staffName==src.staffName && row.coachingType==src.coachingType,
        trail:(row)=>row.agentName
      },
      ]
    },
    taskAudits:{
      title:'Project task completion',
      id:'taskAudits',
      visual:{
        type:'bar',
        format:"%",
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['taskAudits']
          },
          onResponse:(resp)=>resp['taskAudits']
        },
        calc:(data)=>data.filter(el=>isSqlGroup(el,['grpstaff'])).map(el=>Math.round(el.taskDonePerc*100)),
        labels:(data)=>data.filter(el=>isSqlGroup(el,['grpstaff'])).map(el=>el.staffName)
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'staffName',title:'Staff name'},
          {field:'taskCnt',title:'Tasks'},
          {field:'taskDonePerc',formatter:"%",title:'Done %'},
          {field:'taskOverduePerc',formatter:"%",title:'Overdue %'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grpstaff']),
        trail:(row)=>row.staffName
      },
      {
        cols:(data)=>[
          {field:'plannerGroup',title:'Project'},
          {field:'taskCnt',title:'Tasks'},
          {field:'taskDonePerc',formatter:"%",title:'Done %'},
          {field:'taskOverduePerc',formatter:"%",title:'Overdue %'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grpjob','grpstaff']) && row.staffName==(src.x?src.x:src.staffName),
        trail:(row)=>row.plannerGroup
      },
      {
        cols:(data)=>[
          {field:'taskName',title:'Task'},
          {field:'taskDoneCnt',formatter:'tickCross',title:'Done'},
          {field:'dueDate',formatter:'d',title:'Due date'},
          {field:'doneDate',formatter:'d',title:'Done date'},
        ],
        filter:(src,row)=>isSqlGroup(row,['grpjob','grptask','grpstaff']) && row.staffName==src.staffName && row.plannerGroup==src.plannerGroup,
        trail:(row)=>row.plannerGroup
      },
      ]
    },
    cmProjectWorkloads:{
      title:'CM Projects',
      id:'cmProjectWorkloads',
      visual:{
        type:'custom',
        chartConfig:JSON.parse(JSON.stringify(workloadLineSetup)),
        data:{
          promise:getWorkloadData,
          promiseParams:{
            stDate:moment.utc().startOf('day').format("YYYY-MM-DD"),
            enDate:moment.utc().startOf('day').add(2,'months').format("YYYY-MM-DD"),
            // projStart:moment.utc().startOf('day').add(1,'weeks'),
            // projEnd:moment.utc().startOf('day').add(3,'weeks'),
            jobTitleID:5
          }
        },
        onRendered:(dataConfig,data,chart,render)=>{
          getWorkloadJobChart(dataConfig.promiseParams,chart,data,render)
        },
      },
      drilldown:[
        {
          cols:(data)=>[
            {field:'dte',title:'Date',formatter:'d'},
            {field:'staffName',title:'CM'},
            {field:'jobCount',title:'Jobs'},
          ],
          data:(data)=>data.map(r=>r.days.map(d=>d.jobs)).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf()),
          filter:(src,row)=>isSqlGroup(row,['grpstaff']),
          trail:(row)=>moment(row.dte).format("DD/MM/YYYY")+" - "+row.staffName
        },
        {
          cols:(data)=>[
            {field:'job',title:'Job',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          ],
          data:(data)=>data.map(r=>r.days.map(d=>d.jobs)).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf()),
          filter:(src,row)=>isSqlGroup(row,['grpstaff','grpjob']) && (src.x?src.x:moment(src.dte).format("DD-MMM"))==moment(row.dte).format("DD-MMM") && (src.y?src.y:src.staffName)==row.staffName
        },
      ]
    },
    cmPlannerWorkloads:{
      title:'CM Planners',
      id:'cmPlannerWorkloads',
      visual:{
        type:'custom',
        chartConfig:JSON.parse(JSON.stringify(workloadLineSetup)),
        data:{
          promise:getWorkloadData,
          promiseParams:{
            stDate:moment.utc().startOf('day').format("YYYY-MM-DD"),
            enDate:moment.utc().startOf('day').add(2,'months').format("YYYY-MM-DD"),
            // projStart:moment.utc().startOf('day').add(1,'weeks'),
            // projEnd:moment.utc().startOf('day').add(3,'weeks'),
            jobTitleID:5
          }
        },
        onRendered:(dataConfig,data,chart,renderDrill)=>{
          getWorkloadTeamupChart(dataConfig.promiseParams,chart,data,renderDrill)
        },
      },
      drilldown:[
        {
          cols:(data)=>[
            {field:'dte',title:'Date',formatter:'d'},
            {field:'staffName',title:'CM'},
            {field:'mins',title:'Planned tasks duration (hrs)',formatter:c=>Math.round(c.getValue()/60*100)/100},
          ],
          data:(data)=>{
            return data.map(r=>r.days.map(d=>({dte:d.date,staffName:r.staffName,mins:d.teamup.reduce((a,b)=>a+b.mins,0)}))).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf())
          },
          filter:(src,row)=>row,
          trail:(row)=>moment(row.dte).format("DD/MM/YYYY")+" - "+row.staffName
        },
        {
          cols:(data)=>[
            {field:'taskName',title:'Task'},
            {field:'mins',title:'Planned duration (hrs)',formatter:c=>Math.round(c.getValue()/60*100)/100},
          ],
          data:(data)=>data.map(r=>r.days.map(d=>d.teamup.map(t=>({dte:d.date,staffName:r.staffName,taskName:t.task.title,mins:t.mins})))).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf()),
          filter:(src,row)=>isSqlGroup(row,['grpstaff','grpjob']) && (src.x?src.x:moment(src.dte).format("DD-MMM"))==moment(row.dte).format("DD-MMM") && (src.y?src.y:src.staffName)==row.staffName
        },
      ]
    },
    pmProjectWorkloads:{
      title:'PM Projects',
      id:'pmProjectWorkloads',
      visual:{
        type:'custom',
        chartConfig:JSON.parse(JSON.stringify(workloadLineSetup)),
        data:{
          promise:getWorkloadData,
          promiseParams:{
            stDate:moment.utc().startOf('day').format("YYYY-MM-DD"),
            enDate:moment.utc().startOf('day').add(2,'months').format("YYYY-MM-DD"),
            // projStart:moment.utc().startOf('day').add(1,'weeks'),
            // projEnd:moment.utc().startOf('day').add(3,'weeks'),
            jobTitleID:6
          }
        },
        onRendered:(dataConfig,data,chart,render)=>{
          getWorkloadJobChart(dataConfig.promiseParams,chart,data,render)
        },
      },
      drilldown:[
        {
          cols:(data)=>[
            {field:'dte',title:'Date',formatter:'d'},
            {field:'staffName',title:'PM'},
            {field:'jobCount',title:'Jobs'},
          ],
          data:(data)=>data.map(r=>r.days.map(d=>d.jobs)).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf()),
          filter:(src,row)=>isSqlGroup(row,['grpstaff']),
          trail:(row)=>moment(row.dte).format("DD/MM/YYYY")+" - "+row.staffName
        },
        {
          cols:(data)=>[
            {field:'job',title:'Job',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          ],
          data:(data)=>data.map(r=>r.days.map(d=>d.jobs)).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf()),
          filter:(src,row)=>isSqlGroup(row,['grpstaff','grpjob']) && (src.x?src.x:moment(src.dte).format("DD-MMM"))==moment(row.dte).format("DD-MMM") && (src.y?src.y:src.staffName)==row.staffName
        },
      ]
    },
    pmPlannerWorkloads:{
      title:'PM Planners',
      id:'pmPlannerWorkloads',
      visual:{
        type:'custom',
        chartConfig:JSON.parse(JSON.stringify(workloadLineSetup)),
        data:{
          promise:getWorkloadData,
          promiseParams:{
            stDate:moment.utc().startOf('day').format("YYYY-MM-DD"),
            enDate:moment.utc().startOf('day').add(2,'months').format("YYYY-MM-DD"),
            // projStart:moment.utc().startOf('day').add(1,'weeks'),
            // projEnd:moment.utc().startOf('day').add(3,'weeks'),
            jobTitleID:6
          }
        },
        onRendered:(dataConfig,data,chart,renderDrill)=>{
          getWorkloadTeamupChart(dataConfig.promiseParams,chart,data,renderDrill)
        },
      },
      drilldown:[
        {
          cols:(data)=>[
            {field:'dte',title:'Date',formatter:'d'},
            {field:'staffName',title:'PM'},
            {field:'mins',title:'Planned tasks duration (hrs)',formatter:c=>Math.round(c.getValue()/60*100)/100},
          ],
          data:(data)=>data.map(r=>r.days.map(d=>({dte:d.date,staffName:r.staffName,mins:d.teamup.reduce((a,b)=>a+b.mins,0)}))).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf()),
          filter:(src,row)=>row,
          trail:(row)=>moment(row.dte).format("DD/MM/YYYY")+" - "+row.staffName
        },
        {
          cols:(data)=>[
            {field:'taskName',title:'Task'},
            {field:'mins',title:'Planned duration (hrs)',formatter:c=>Math.round(c.getValue()/60*100)/100},
          ],
          data:(data)=>data.map(r=>r.days.map(d=>d.teamup.map(t=>({dte:d.date,staffName:r.staffName,taskName:t.task.title,mins:t.mins})))).flat(2).sort((a,b)=>moment(a.dte).valueOf()-moment(a.dte).valueOf()),
          filter:(src,row)=>isSqlGroup(row,['grpstaff','grpjob']) && (src.x?src.x:moment(src.dte).format("DD-MMM"))==moment(row.dte).format("DD-MMM") && (src.y?src.y:src.staffName)==row.staffName
        },
      ]
    },
    interviewsByMethod:{
      title:`Interviews by Methodology`,
      id:'interviewsByMethod',
      visual:{
        type:'bar',
        data:{
          url:'/digest-data/',
          query:{...params,queries:['interviews']},
          onResponse:data=>data.interviews
        },
        calc:(data)=>data.filter(el=>isSqlGroup(el,['grpmethod'])).map(el=>el.interviews),
        labels:(data)=>data.filter(el=>isSqlGroup(el,['grpmethod'])).map(el=>el.method)
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'method',title:'Methodology'},
          {field:'interviews',title:'Interviews'},
          {field:'hours',title:'Hours'},
          {field:'projects',title:'Jobs'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpmethod']),
        trail:(row)=>row.method
      },
      ]
    },
    quotesByMethod:{
      title:`Quotes by Methodology`,
      id:'quotesByMethod',
      visual:{
        type:'pie',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>Object.keys(resp['stats']).map(k=>resp['stats'][k].map(r=>({...r,method:k}))).flat(1)
        },
        calc:(data)=>data.filter(el=>isSqlGroup(el,[]) && el.method!='Total').map(el=>el.quoted),
        labels:(data)=>data.filter(el=>isSqlGroup(el,[]) && el.method!='Total').map(el=>el.method)
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'method',title:'Methodology'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,[]) && el.method!='Total',
        trail:(row)=>row.method
      },
      {
        cols:(data)=>[
          {field:'qtr',title:'Quarter'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr']) && el.method==(src.x?src.x:src.method),
        trail:(row)=>row.qtr
      },
      {
        cols:(data)=>[
          {field:'mnth',title:'Month'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method==src.method && el.qtr==src.qtr,
        trail:(row)=>row.mnth
      },
      {
        cols:(data)=>[
          {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          // {field:'clientName',title:'Client'},
          // {field:'contactName',title:'Contact'},
          {field:'quoteDate',title:'Quoted',formatter:'d'},
          {field:'commissionDate',title:'Commissioned',formatter:'d'},
          {field:'daysToCommission',title:'Days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth','grpjob','grpclient','grpcontact']) && el.method==src.method && el.qtr==src.qtr && el.mnth==src.mnth,
        trail:(row)=>row.project
      },
      ]
    },
    quotes:{
      title:`Quotes`,
      id:'quotes',
      visual:{
        type:'counter',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>Object.keys(resp['stats']).map(k=>resp['stats'][k].map(r=>({...r,method:k}))).flat(1)
        },
        calc:(data)=>checkFind(data.find(el=>isSqlGroup(el,[]) && el.method=='Total')).quoted,
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'method',title:'Methodology'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,[]) && el.method!='Total',
        trail:(row)=>row.method
      },
      {
        cols:(data)=>[
          {field:'qtr',title:'Quarter'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr']) && el.method==(src.x?src.x:src.method),
        trail:(row)=>row.qtr
      },
      {
        cols:(data)=>[
          {field:'mnth',title:'Month'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method==src.method && el.qtr==src.qtr,
        trail:(row)=>row.mnth
      },
      {
        cols:(data)=>[
          {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          // {field:'clientName',title:'Client'},
          // {field:'contactName',title:'Contact'},
          {field:'quoteDate',title:'Quoted',formatter:'d'},
          {field:'commissionDate',title:'Commissioned',formatter:'d'},
          {field:'daysToCommission',title:'Days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth','grpjob','grpclient','grpcontact']) && el.method==src.method && el.qtr==src.qtr && el.mnth==src.mnth,
        trail:(row)=>row.project
      },
      ]
    },
    quotesByMonth:{
      title:`Avg quotes per month`,
      id:'quotes',
      visual:{
        type:'spark',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>Object.keys(resp['stats']).map(k=>resp['stats'][k].map(r=>({...r,method:k}))).flat(1)
        },
        line:(data)=>data.filter(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Total').map(el=>el.quoted),
        total:(data)=>checkFind(data.find(el=>isSqlGroup(el,[]) && el.method=='Total')).quoted/data.filter(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Total').length,
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'qtrmnth',title:'Month',mutator:(v,d)=>d.qtr+" "+d.mnth},
          {field:'quoted',title:'Quoted'},
          // {field:'CATI',title:'CATI',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='CATI' && el.qtr==d.qtr && el.mnth==d.mnth)).quoted},
          // {field:'Online',title:'Online',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Online' && el.qtr==d.qtr && el.mnth==d.mnth)).quoted},
          // {field:'F2F',title:'F2F',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='F2F' && el.qtr==d.qtr && el.mnth==d.mnth)).quoted},
          // {field:'Recruit',title:'Recruit',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Recruit' && el.qtr==d.qtr && el.mnth==d.mnth)).quoted},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Total',
        trail:(row)=>row.qtrmnth
      },
      {
        cols:(data)=>[
          {field:'method',title:'Methodology'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionedPerc',title:'% commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth']) && el.qtr==src.qtr && el.mnth==src.mnth,
        trail:(row)=>row.method
      },
      {
        cols:(data)=>[
          {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          // {field:'clientName',title:'Client'},
          // {field:'contactName',title:'Contact'},
          {field:'quoteDate',title:'Quoted',formatter:'d'},
          {field:'commissionDate',title:'Commissioned',formatter:'d'},
          {field:'daysToCommission',title:'Days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth','grpjob','grpclient','grpcontact']) && el.method==src.method && el.qtr==src.qtr && el.mnth==src.mnth,
        trail:(row)=>row.project
      },
      ]
    },
    daysToCommission:{
      title:`Avg days to commission`,
      id:'daysToCommission',
      visual:{
        type:'spark',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>Object.keys(resp['stats']).map(k=>resp['stats'][k].map(r=>({...r,method:k}))).flat(1)
        },
        total:(data)=>checkFind(data.find(el=>isSqlGroup(el,[]) && el.method=='Total')).daysToCommission,
        line:(data)=>data.filter(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Total').map(el=>el.daysToCommission),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'qtrmnth',title:'Month',mutator:(v,d)=>d.qtr+" "+d.mnth},
          {field:'commissioned',title:'# Commissioned'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
          // {field:'CATI',title:'CATI',formatter:'0.00',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='CATI' && el.qtr==d.qtr && el.mnth==d.mnth)).daysToCommission},
          // {field:'Online',title:'Online',formatter:'0.00',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Online' && el.qtr==d.qtr && el.mnth==d.mnth)).daysToCommission},
          // {field:'F2F',title:'F2F',formatter:'0.00',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='F2F' && el.qtr==d.qtr && el.mnth==d.mnth)).daysToCommission},
          // {field:'Recruit',title:'Recruit',formatter:'0.00',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Recruit' && el.qtr==d.qtr && el.mnth==d.mnth)).daysToCommission},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Total' && el.commissioned,
        trail:(row)=>row.qtrmnth
      },
      {
        cols:(data)=>[
          {field:'method',title:'Methodology'},
          {field:'commissioned',title:'# Commissioned'},
          {field:'daysToCommission',title:'Avg. days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth']) && el.qtr==src.qtr && el.mnth==src.mnth,
        trail:(row)=>row.method
      },
      {
        cols:(data)=>[
          {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          // {field:'clientName',title:'Client'},
          // {field:'contactName',title:'Contact'},
          {field:'quoteDate',title:'Quoted',formatter:'d'},
          {field:'commissionDate',title:'Commissioned',formatter:'d'},
          {field:'daysToCommission',title:'Days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth','grpjob','grpclient','grpcontact']) && el.method==src.method && el.qtr==src.qtr && el.mnth==src.mnth && el.commissioned,
        trail:(row)=>row.project
      },
      ]
    },
    commissionRate:{
      title:`Commission rate`,
      id:'commissionRate',
      visual:{
        type:'polar',
        format:'%',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>Object.keys(resp['stats']).map(k=>resp['stats'][k].map(r=>({...r,method:k}))).flat(1)
        },
        labels:(data)=>data.filter(el=>isSqlGroup(el,[]) && el.method!='Total').map(el=>el.method),
        calc:(data)=>data.filter(el=>isSqlGroup(el,[]) && el.method!='Total').map(el=>Math.round(el.commissioned/el.quoted*1000)/10),
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'method',title:'Methodology'},
          {field:'quoted',title:'Quoted'},
          // {field:'commissioned',title:'# Commissioned'},
          {field:'commissionedPerc',title:'% Commissioned',mutator:(v,d)=>d.commissioned/d.quoted,formatter:'%'},
        ],
        filter:(src,el)=>isSqlGroup(el,[]),
        trail:(row)=>row.method
      },
      {
        cols:(data)=>[
          {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          // {field:'clientName',title:'Client'},
          // {field:'contactName',title:'Contact'},
          {field:'quoteDate',title:'Quoted',formatter:'d'},
          {field:'commissionDate',title:'Commissioned',formatter:'d'},
          {field:'daysToCommission',title:'Days to commission',formatter:'0.00'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth','grpjob','grpclient','grpcontact']) && el.method==(src.x?src.x:src.method),
        trail:(row)=>row.project
      },
      ]
    },
    quoteChaseResponse:{
      title:`Quote chase response rate`,
      id:'quoteChaseResponse',
      visual:{
        type:'spark',
        format:'%',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>Object.keys(resp['stats']).map(k=>resp['stats'][k].map(r=>({...r,method:k}))).flat(1)
        },
        line:(data)=>data.filter(el=>isSqlGroup(el,['grpmonth','grpqtr']) && el.method=='Total' && el.chasedCount).map(el=>el.responseRate),
        total:(data)=>Math.round(checkFind(data.find(el=>isSqlGroup(el,[]) && el.method=='Total' && el.chasedCount)).responseRate*1000)/10,
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'qtrmnth',title:'Month',mutator:(v,d)=>d.qtr+" "+d.mnth},
          {field:'chasedCount',title:'# Chased'},
          {field:'responded',title:'# Responded'},
          {field:'responseRate',title:'Response rate',formatter:'%'},
          // {field:'CATI',title:'CATI',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='CATI' && el.qtr==d.qtr && el.mnth==d.mnth)).responseRate},
          // {field:'Online',title:'Online',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Online' && el.qtr==d.qtr && el.mnth==d.mnth)).responseRate},
          // {field:'F2F',title:'F2F',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='F2F' && el.qtr==d.qtr && el.mnth==d.mnth)).responseRate},
          // {field:'Recruit',title:'Recruit',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Recruit' && el.qtr==d.qtr && el.mnth==d.mnth)).responseRate},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth']) && el.method=='Total' && el.chasedCount,
        trail:(row)=>row.qtrmnth
      },
      {
        cols:(data)=>[
          {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          // {field:'clientName',title:'Client'},
          // {field:'contactName',title:'Contact'},
          // {field:'contactEmail',title:'Email'},
          {field:'quoteDate',title:'Quoted',formatter:'d'},
          {field:'chased',title:'Chased',formatter:'d'},
          {field:'chaseOutcome',title:'Response'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth','grpjob','grpclient','grpcontact']) && el.method==src.method && el.qtr==src.qtr && el.mnth==src.mnth && el.chased && el.quoteNo,
        trail:(row)=>row.project
      },
      ]
    },
    quoteChaseOthOutcomes:{
      title:`Other responses`,
      id:'quoteChaseOthOutcomes',
      visual:{
        type:'cloud',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>resp.chaseWords
        },
        calc:(data)=>data.filter(el=>isSqlGroup(el,['grpwords']) && el.KeyWordCount>1 && el.Keywords.length>3 && !meaningless.includes(el.Keywords)),
      },
      drilldown:[
        {
          cols:(data)=>[
            {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
            {field:'chaseOutcome',title:'Response',widthGrow:4},
          ],
          filter:(src,el)=>isSqlGroup(el,['grpjob']) && (src.x?el.chaseOutcome.indexOf(src.x)>-1:el.chaseOutcome),
          trail:(row)=>row.project
        },
      ]
    },
    quoteChaseOutcomes:{
      title:`Quote chase responses`,
      id:'quoteChaseOutcomes',
      visual:{
        type:'pie',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>resp.chaseOutcomes
        },
        calc:(data)=>data.filter(el=>isSqlGroup(el,['grpoutcome']) && el.jobCount>1).map(el=>el.jobCount).concat(data.filter(el=>isSqlGroup(el,['grpoutcome']) && el.jobCount==1).length),
        labels:(data)=>data.filter(el=>isSqlGroup(el,['grpoutcome']) && el.jobCount>1).map(el=>el.chaseOutcome).concat('Other')
      },
      drilldown:[
        {
          cols:(data)=>[
            {field:'chaseOutcome',title:'Response',widthGrow:4},
            {field:'jobCount',title:'Responses'},
          ],
          filter:(src,el)=>isSqlGroup(el,['grpoutcome']),
          trail:(row)=>row.chaseOutcome
        },
        {
          cols:(data)=>[
            {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
            {field:'contactName',title:'Contact'},
            {field:'chaseOutcome',title:'Response',widthGrow:2},
          ],
          filter:(src,el)=>{
            let oc=(src.x?src.x:src.chaseOutcome)
            return isSqlGroup(el,['grpjob','grpoutcome']) && (el.chaseOutcome==oc && el.outcomeCount>1 || oc=='Other' && el.outcomeCount==1)
          },
          trail:(row)=>row.project
        },
      ]
    },
    quoteChaseEffectiveness:{
      title:`Commission rate`,
      id:'quoteChaseEffectiveness',
      visual:{
        type:'bar',
        format:'%',
        data:{
          url:'/quotes-report-data/',
          query:params,
          onResponse:(resp)=>Object.keys(resp['stats']).map(k=>resp['stats'][k].map(r=>({...r,method:k}))).flat(1)
        },
        labels:(data)=>['Chased','Not chased'],
        calc:(data)=>[Math.round(checkFind(data.find(el=>isSqlGroup(el,['grpchased']) && el.method=='Total' && el.isChased==1)).commissionRate*1000)/10,Math.round(checkFind(data.find(el=>isSqlGroup(el,['grpchased']) && el.method=='Total' && el.isChased==0)).commissionRate*1000)/10],
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'isChased',title:'Chased',formatter:c=>c.getValue()?'Y':'N'},
          {field:'quoted',title:'Quotes'},
          // {field:'commissioned',title:'Commissions'},
          {field:'commissionRate',title:'Commission rate',formatter:'%'},
          // {field:'CATI',title:'CATI',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpchased']) && el.method=='CATI' && el.isChased==d.isChased)).commissionRate},
          // {field:'Online',title:'Online',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpchased']) && el.method=='Online' && el.isChased==d.isChased)).commissionRate},
          // {field:'F2F',title:'F2F',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpchased']) && el.method=='F2F' && el.isChased==d.isChased)).commissionRate},
          // {field:'Recruit',title:'Recruit',formatter:'%',mutator:(v,d)=>checkFind(data.find(el=>isSqlGroup(el,['grpchased']) && el.method=='Recruit' && el.isChased==d.isChased)).commissionRate},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpchased']) && el.method=='Total',
        trail:(row)=>row.isChased?'Chased':'Not chased'
      },
      {
        cols:(data)=>[
          {field:'project',title:'Project',mutator:(v,d)=>d.quoteNo+" "+d.quoteName},
          // {field:'clientName',title:'Client'},
          // {field:'contactName',title:'Contact'},
          // {field:'contactEmail',title:'Email'},
          {field:'quoteDate',title:'Quoted',formatter:'d'},
          {field:'chased',title:'Chased',formatter:'d'},
          {field:'chaseOutcome',title:'Response'},
          {field:'commissionDate',title:'Commissioned',formatter:'d'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpqtr','grpmonth','grpjob','grpclient','grpcontact']) && el.method=='Total' && el.quoteNo && (src.isChased?!!el.chased:!el.chased),
        trail:(row)=>row.project
      },
      ]
    },
    timeOfDayCons:{
      title:`Consumer response`,
      id:'timeOfDayCons',
      visual:{
        type:'bubble',
        tooltip:(e,chart,data)=>{
          let hr=checkFind(data.find(j=>isSqlGroup(j,['grpaudience','grphour']) && j.reportHour==e.xLabel))
          return e.xLabel.toString().padStart(2,'0')+":00 - Hours worked: "+(hr?hr.hoursWorked:0)+" | Avg diff from target: "+(e.yLabel>0?'+':'')+Math.round(e.yLabel*1000)/10+"%"
        },
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['hourlyAHR']
          },
          onResponse:(resp)=>resp['hourlyAHR'].filter(el=>el.isJobConsumer==1 && el.hoursWorked>0)
        },
        labels:(data)=>_.range(9,21).map(el=>el.toString().padStart(2,'0')+":00"),
        calc:(data)=>{
          let maxHr=Math.max.apply(null,data.filter(el=>isSqlGroup(el,['grpaudience','grphour'])).map(j=>j.hoursWorked))
          return data.filter(el=>isSqlGroup(el,['grpaudience','grphour'])).map(el=>{
            let obj={}
            obj.x=el.reportHour
            obj.y=el.diffWeighted
            let maxRadius=30
            obj.r=(el.hoursWorked/maxHr)*maxRadius
            return obj
          })
        },
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'reportHour',title:'Hour',formatter:c=>c.getValue().toString().padStart(2,'0')+":00"},
          {field:'hoursWorked',title:'Hours worked'},
          {field:'diffWeighted',title:'Avg diff from target',formatter:'%'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpaudience','grphour']),
        trail:(row)=>row.reportHour.toString().padStart(2,'0')+":00"
      },
      {
        cols:(data)=>[
          {field:'jobName',title:'Job'},
          {field:'hoursWorked',title:'Hours worked'},
          {field:'hourlyTarget',title:'Target',formatter:'0.00'},
          {field:'ahr',title:'Avg AHR',formatter:'0.00'},
          {field:'diffWeighted',title:'Avg diff from target',formatter:'%'},
        ],
        filter:(src,el)=>{
          return isSqlGroup(el,['grpaudience','grphour','grpjob']) && (src.x?Number(src.x.replace(":00","")):src.reportHour)==el.reportHour
        },
        trail:(row)=>row.jobName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Job'},
          {field:'hoursWorked',title:'Hours worked'},
          {field:'hourlyTarget',title:'Target',formatter:'0.00'},
          {field:'ahr',title:'Avg AHR',formatter:'0.00'},
          {field:'diffWeighted',title:'Avg diff from target',formatter:'%'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpaudience','grphour','grpjob','grpagent']) && src.reportHour==el.reportHour && src.jobID==el.jobID,
        trail:(row)=>row.jobName
      },
      ]
    },
    timeOfDayB2B:{
      title:`B2B response`,
      id:'timeOfDayB2B',
      visual:{
        type:'bubble',
        tooltip:(e,chart,data)=>{
          let hr=checkFind(data.find(j=>isSqlGroup(j,['grpaudience','grphour']) && j.reportHour==e.xLabel))
          return e.xLabel.toString().padStart(2,'0')+":00 - Hours worked: "+(hr?hr.hoursWorked:0)+" | Avg diff from target: "+(e.yLabel>0?'+':'')+Math.round(e.yLabel*1000)/10+"%"
        },
        data:{
          url:'/digest-data',
          query:{
            stDate:params.stDate,
            enDate:params.enDate,
            queries:['hourlyAHR']
          },
          onResponse:(resp)=>resp['hourlyAHR'].filter(el=>el.isJobBusiness==1 && el.hoursWorked>0)
        },
        labels:(data)=>_.range(9,21).map(el=>el.toString().padStart(2,'0')+":00"),
        calc:(data)=>{
          let maxHr=Math.max.apply(null,data.filter(el=>isSqlGroup(el,['grpaudience','grphour'])).map(j=>j.hoursWorked))
          return data.filter(el=>isSqlGroup(el,['grpaudience','grphour'])).map(el=>{
            let obj={}
            obj.x=el.reportHour
            obj.y=el.diffWeighted
            let maxRadius=30
            obj.r=(el.hoursWorked/maxHr)*maxRadius
            return obj
          })
        },
      },
      drilldown:[
      {
        cols:(data)=>[
          {field:'reportHour',title:'Hour',formatter:c=>c.getValue().toString().padStart(2,'0')+":00"},
          {field:'hoursWorked',title:'Hours worked'},
          {field:'diffWeighted',title:'Avg diff from target',formatter:'%'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpaudience','grphour']),
        trail:(row)=>row.reportHour.toString().padStart(2,'0')+":00"
      },
      {
        cols:(data)=>[
          {field:'jobName',title:'Job'},
          {field:'hoursWorked',title:'Hours worked'},
          {field:'hourlyTarget',title:'Target',formatter:'0.00'},
          {field:'ahr',title:'Avg AHR',formatter:'0.00'},
          {field:'diffWeighted',title:'Avg diff from target',formatter:'%'},
        ],
        filter:(src,el)=>{
          return isSqlGroup(el,['grpaudience','grphour','grpjob']) && (src.x?Number(src.x.replace(":00","")):src.reportHour)==el.reportHour
        },
        trail:(row)=>row.jobName
      },
      {
        cols:(data)=>[
          {field:'agentName',title:'Job'},
          {field:'hoursWorked',title:'Hours worked'},
          {field:'hourlyTarget',title:'Target',formatter:'0.00'},
          {field:'ahr',title:'Avg AHR',formatter:'0.00'},
          {field:'diffWeighted',title:'Avg diff from target',formatter:'%'},
        ],
        filter:(src,el)=>isSqlGroup(el,['grpaudience','grphour','grpjob','grpagent']) && src.reportHour==el.reportHour && src.jobID==el.jobID,
        trail:(row)=>row.jobName
      },
      ]
    },
  }
}
