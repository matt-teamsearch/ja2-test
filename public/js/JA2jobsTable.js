var shiftVals=['Day','Eve']
var chargeVals={'0':'Interviews','1':'Hours'}
var audienceVals=['Business','Consumer']
var jobTypeVals=['CATI','Online','Face','DP','Recruitment','Validation','Recontacts','International','Confirmit']
var blankJobRow={projectID:projectID,isJobHourly:'0',isJobHourlyResource:'0', hourlyTarget:'', jobID:-1, isJobInHouse:true, jobName:'',startDate:'', endDate:'', dataDate:'', tablesDate:'', hoursTarget:'', interviewsTarget:'', jobCPIselect:'', expectedLOI:'',shiftSelect:'',audienceSelect:'',typeSelect:''}
var blankDrRow={projectID:projectID,isJobHourly:'0',isJobHourlyResource:'0', hourlyTarget:60, jobID:-1, isJobInHouse:true, expectedLOI:'1',typeSelect:['CATI','DeskResearch']}
let checkEditable=(c)=>{
  return ()=>{
    if (!c.getColumn().getDefinition().editable(c)) {
      $(c.getElement()).addClass("nonEditable")
    }
  }
}
let isRPjob=(c)=>!c.getData().resourceParent
$(document).ready(function () {
  const jobsTable = new Tabulator("#jobsTable", {
    data:jobsData,
    autoResize:false,
    layout:"fitColumns",
    layoutColumnsOnNewData:true,
    index:"jobID",
    rowFormatter:function(row){
      rowStyle(row.getData().jobID,row)
      if(row.getData().resourceParent){
        $(row.getElement()).addClass("resourceChild").attr('title','This is a resource target group and can only be edited using the resource planner')
      }
    },
    headerSort:false,
    columns:[
      {title:"projectID", visible:false, field:"projectID"},
      {title:"jobID", visible:false, field:"jobID"},
      {visible:false, field:"sponsorJobID"},
      {title:"Name", headerSort:false, field:"jobName", editor:"input", editorParams:{
          elementAttributes:{
              maxlength:"32", //set the maximum character length of the input element to 10 characters
          }
      }, editable:true, width:200},
      {title:"Type", field:"typeSelect", editor:"select", editable: isRPjob, editorParams:()=>({values:jobTypeVals,multiselect:true})},
      {title:"In house", headerSort:false, field:"isJobInHouse",editable:c=>isRPjob(c) && isCATI(c), formatter:checkFormatter, cellClick:checkClick, cssClass:'jobCheckCell', width:60},
      {title:"RingCentral", headerSort:false, field:"excludeFromDials",editable:c=>isRPjob(c) && isCATI(c), formatter:checkRevFormatter, cellClick:checkRevClick, cssClass:'jobCheckCell', width:80},
      {title:"Shift", field:"shiftSelect", editor:"select", editable: c=>isRPjob(c) && isCATI(c), editorParams:{values:shiftVals}},
      {title:"Audience", field:"audienceSelect", editor:"select", editable: isRPjob, editorParams:{values:audienceVals}},
      {title:"CPI", field:"jobCPIselect", editor:"select",accessor:v=>v?v.map(el=>el.toString()):[], editable:isRPjob, editorParams:function(cell){
        var vals
        if (cell.getData().typeSelect.filter(el=>['CATI','Online','Face'].includes(el)).length>0) {
          vals=getjobCPIs(projectID,'CPI')
        }else {
          vals=getjobCPIs(projectID,'DP')
        }
        return{values:vals,multiselect:true}
      }, formatter:cpiFormatter},
      {title:"CPI reduction", field:"CPIreduction", editor:"number", editable:isRPjob, editorParams:{step:0.01,min:0}, formatter:"money", formatterParams:{symbol:"£"}, mutator:function(value){return value>0?0-value:value}},
      {title:"Charge by", field:"isJobHourly", editor:"select",formatter:c=>c.getValue()?chargeVals[c.getValue()]:'', editable: isRPjob, editorParams:()=>({values:chargeVals})},
      {title:"Resource by", field:"isJobHourlyResource", editor:"select",formatter:c=>c.getValue()?chargeVals[c.getValue()]:'', editable: isRPjob, editorParams:()=>({values:chargeVals})},
      {title:"Ints", field:"interviewsTarget", editor:"number",formatter:(c,p,onR)=>{
        onR(checkEditable)
        return (c.getValue() || "")
      }, cssClass:'jobInts', editable:c=>isRPjob(c) && (c.getData().isJobHourlyResource=='0' || c.getData().isJobHourly=='0') && ((c.getData().hourlyTarget && c.getData().hoursTarget) || !c.getData().hoursTarget), width:80, editorParams:{step:1,min:0}},
      {title:"AHR", field:"hourlyTarget", editor:"number",formatter:(c,p,onR)=>{
        onR(checkEditable)
        return (c.getValue() || "")
      }, editable:c=>isRPjob(c) && isCATI(c) && c.getData().isJobHourlyResource!='1', width:40, editorParams:{step:0.01,min:0}},
      {title:"Hours", field:"hoursTarget", editor:"number",formatter:(c,p,onR)=>{
        onR(checkEditable)
        return (c.getValue() || "")
      }, cssClass:'jobInts', editable:c=>isRPjob(c) && isCATI(c) && (c.getData().isJobHourlyResource=='1' || c.getData().isJobHourly=='1') && ((c.getData().hourlyTarget && c.getData().interviewsTarget) || !c.getData().interviewsTarget), width:80, editorParams:{step:1,min:0}},
      {title:"Fieldwork dates",width:160,field:"fieldDates",formatter:c=>c.getData().startDate && c.getData().endDate?moment(c.getData().startDate).format("DD/MM/YYYY")+"-"+moment(c.getData().endDate).format("DD/MM/YYYY"):'',editor:dateRangePicker},
      {title:"Start", headerSort:false, field:"startDate",visible:false, editor:dateEditor, editable: isRPjob, formatter:"datetime", formatterParams:{
        inputFormat:"YYYY-MM-DD",
        outputFormat:"DD/MM/YY",
        invalidPlaceholder:"N/A",
      }},
      {title:"End", headerSort:false, field:"endDate",visible:false, editor:dateEditor, editable: isRPjob, formatter:"datetime", formatterParams:{
        inputFormat:"YYYY-MM-DD",
        outputFormat:"DD/MM/YY",
        invalidPlaceholder:"N/A",
      }},
      {title:"Data", headerSort:false, field:"dataDate",visible:false, editor:dateEditor, editable: isRPjob, formatter:"datetime", formatterParams:{
        inputFormat:"YYYY-MM-DD",
        outputFormat:"DD/MM/YY",
        invalidPlaceholder:"N/A",
      }},
      {title:"Tables", headerSort:false, field:"tablesDate", editor:dateEditor, editable: isRPjob, formatter:"datetime", formatterParams:{
        inputFormat:"YYYY-MM-DD",
        outputFormat:"DD/MM/YY",
        invalidPlaceholder:"N/A",
      }},
      {title:"LOI", field:"expectedLOI", editor:"number", cssClass:'jobLOI',editable:isRPjob, width:40, editorParams:{step:0.01,min:0}},
      {formatter:jobAddRemIcon, width:40, hozAlign:"center", cssClass:'addRemCol'}
    ],
    rowUpdated:function(row){
      console.log(row.getData())
      row.reformat()
    },
    cellEdited:function(cell){
      var rowData=cell.getRow().getData()
      if (cell.getField()=='hourlyTarget' && (rowData.interviewsTarget || rowData.hoursTarget)) {
        if (rowData.interviewsTarget) {
          cell.getRow().update({hoursTarget:Math.round(rowData.interviewsTarget/cell.getValue())})
        }else {
          cell.getRow().update({interviewsTarget:Math.round(rowData.hoursTarget*cell.getValue())})
        }
      }
      if (cell.getField()=='interviewsTarget' && rowData.hourlyTarget) {
        let hrs=Math.round(cell.getValue()/rowData.hourlyTarget)
        if (rowData.hoursTarget!=hrs) {
          cell.getRow().update({hoursTarget:hrs})
        }
      }
      if (cell.getField()=='hoursTarget' && rowData.hourlyTarget) {
        let ints=Math.round(cell.getValue()*rowData.hourlyTarget)
        if (rowData.interviewsTarget!=ints) {
          cell.getRow().update({interviewsTarget:ints})
        }
      }
      if (cell.getField()=='isJobHourlyResource' && !rowData.isJobHourly){
        cell.getRow().update({isJobHourly:cell.getValue()})
      }
      if (cell.getField()=='isJobHourly' && !rowData.isJobHourlyResource){
        cell.getRow().getCell("isJobHourlyResource").setValue(cell.getValue())
      }
      if (cell.getData().jobID>-1) {
        if ((cell.getValue()==='' || cell.getValue().length==0) && !['hourlyTarget','shiftSelect','tablesDate','CPIreduction'].includes(cell.getField())) {
          var obj={}
          obj[cell.getField()]=cell.getOldValue()
          cell.getRow().update(obj)
        }else if (['expectedLOI','hourlyTarget'].includes(cell.getField()) && rowData.expectedLOI && rowData.hourlyTarget && rowData.expectedLOI>60/rowData.hourlyTarget) {
          alert("Impossible to acheive AHR given LOI: Cannot get "+rowData.hourlyTarget+" per hour if interview is "+rowData.expectedLOI+" mins long.")
          var obj={}
          obj[cell.getField()]=cell.getOldValue()
          cell.getRow().update(obj)
        }else if (!['startDate','endDate','fieldDates'].includes(cell.getField())){
          var jobData=jobDataFromRow(cell.getRow())
          updateJob('update','Jobs',Object.keys(jobData),Object.values(jobData),'jobID',cell.getData().jobID).then(function(e){
            window.dispatchEvent(new CustomEvent("jobsChanged", {data: jobData}))
          })
          if (cell.getField()=='jobCPIselect') {
            updateCPIs(cell.getValue(),cell.getData().jobID).then(function(e){
              window.dispatchEvent(new CustomEvent("jobsChanged", {data: cell.getData()}))
            })
            cell.getElement().style.border="initial"
          }
        }
        // if (['endDate','startDate'].includes(cell.getField()) && cell.getValue()>cell.getOldValue()) {
        //   changeDate(cell.getField(),cell.getOldValue(),cell.getValue(),cell.getData().jobID)
        // }
      }
      // if (['endDate','startDate'].includes(cell.getField()) && rowData.startDate!=="" && rowData.endDate!=="" && rowData.startDate>rowData.endDate) {
      //   alert("Start date cannot be after end date")
      //   var obj={}
      //   obj[cell.getField()]=cell.getOldValue()
      //   cell.getRow().update(obj)
      // }
      // if (cell.getField()=='endDate') {
      //   cell.getRow().update({dataDate:dateIf(addBusinessDays(cell.getValue(),1),"-","r")})
      // }
      if (cell.getField()=='typeSelect') {
        if (!cell.getValue().includes("CATI")) {
          cell.getRow().update({isJobHourly:'0',isJobHourlyResource:null,hourlyTarget:"",shiftSelect:""})
        }
        cell.getRow().reformat()
      }
      if (cell.getField()=='isJobHourlyResource' || (rowData.typeSelect.includes("CATI") && rowData.shiftSelect && rowData.jobCPIselect && !rowData.hourlyTarget)) {
        getAvgWage().then(function(avgWage){
          var divisor=rowData.shiftSelect=="Day"?avgWage.day.avgWage:avgWage.eve.avgWage
          console.log(avgWage,avgWage.day.avgWage,divisor,divisor/0.35)
          divisor=divisor/0.35
          var avg=rowData.typeSelect.filter(el=>(['CATI','Online','Face']).includes(el)).length>0?getCPIavg(rowData.jobCPIselect,'CPI'):getCPIavg(rowData.jobCPIselect,'DP')
          var ahr=rowData.isJobHourlyResource=='1'?1:divisor/avg
          cell.getRow().getCell("hourlyTarget").setValue(Math.round(ahr/0.25)*0.25)
          if (cell.getData().jobID>-1) {
            updateJob('update','Jobs',['hourlyTarget'],[Math.round(ahr/0.25)*0.25],'jobID',cell.getData().jobID).then(function(e){
              window.dispatchEvent(new CustomEvent("jobsChanged", {data: cell.getData()}))
            })
          }
        })
      }
      if (rowData.expectedLOI && rowData.hourlyTarget && rowData.expectedLOI>60/rowData.hourlyTarget) {
        alert("Impossible to acheive AHR given LOI: Cannot get "+rowData.hourlyTarget+" per hour if interview is "+rowData.expectedLOI+" mins long.")
      }
      cell.getRow().reformat()
    },
    dataLoaded:function(data){
      var obj={}
      Object.assign(obj, blankJobRow)
      this.addRow(obj, false).then(function(row){
        row.reformat()
      })
      this.redraw()
      var invalidCPIs=this.getRows().filter(el=>{
        return el.getData().jobCPIselect.length==0 && el.getData().jobID>-1 && el.getData().typeSelect.filter(el=>(['CATI','Online','Face']).includes(el)).length>0
      })
      invalidCPIs.forEach((row, i) => {
        row.getCell('jobCPIselect').getElement().style.border="1px solid red"
      });
      if (invalidCPIs.length>0) {
        location.href = "#";
        invalidCPIs[0].getElement().scrollIntoView({block: "center"})
        alert('There are one or more target groups without CPIs set - please set them now')
      }
    },
  })
  const drJobsTable = new Tabulator("#drJobsTable", {
    data:drJobsData,
    autoResize:false,
    layout:"fitColumns",
    layoutColumnsOnNewData:true,
    index:"jobID",
    rowFormatter:function(row){
      rowStyle(row.getData().jobID,row)
    },
    headerSort:false,
    columns:[
      {title:"projectID", visible:false, field:"projectID"},
      {title:"jobID", visible:false, field:"jobID"},
      {title:"Name", headerSort:false, field:"jobName", editor:"input", editorParams:{
          elementAttributes:{
              maxlength:"32", //set the maximum character length of the input element to 10 characters
          }
      }, editable:true, width:200},
      {title:"Target Group", field:"sponsorJobID",formatter:(cell=>getProjectJobs(projectID)[cell.getValue()]), editor:"select", editorParams:{values:getProjectJobs(projectID)}},
      {title:"Type", field:"typeSelect", visible:false},
      {title:"In house", visible:false},
      {title:"Charge by", field:"isJobHourly", visible:false},
      {title:"Resource by", field:"isJobHourlyResource", visible:false},
      {title:"Shift", field:"shiftSelect", editor:"select", editorParams:{values:shiftVals}},
      {title:"Audience", field:"audienceSelect", editor:"select", editable: true, editorParams:{values:audienceVals}},
      {title:"Start", headerSort:false, field:"startDate", editor:dateEditor, editable: true, formatter:"datetime", formatterParams:{
        inputFormat:"YYYY-MM-DD",
        outputFormat:"DD/MM/YY",
        invalidPlaceholder:"N/A",
      }},
      {title:"End", headerSort:false, field:"endDate", editor:dateEditor, editable: true, formatter:"datetime", formatterParams:{
        inputFormat:"YYYY-MM-DD",
        outputFormat:"DD/MM/YY",
        invalidPlaceholder:"N/A",
      }},
      {title:"Data", visible:false},
      {title:"Tables", visible:false},
      {title:"Records", field:"interviewsTarget", editor:"number", cssClass:'jobInts', width:80, editorParams:{step:1,min:0}},
      {title:"CPI", visible:false, field:"jobCPI"},
      {title:"CPI reduction", visible:false},
      {title:"Target ph", editor:"number", field:"hourlyTarget"},
      {title:"LOI", visible:false},
      {formatter:jobAddRemIcon, width:40, hozAlign:"center", cssClass:'addRemCol'}
    ],
    rowUpdated:function(row){
      row.reformat()
    },
    cellEdited:function(cell){
      if (cell.getData().jobID>-1) {
        if ((cell.getValue()==='' || cell.getValue().length==0) && !['hourlyTarget','shiftSelect','tablesDate','CPIreduction'].includes(cell.getField())) {
          var obj={}
          obj[cell.getField()]=cell.getOldValue()
          cell.getRow().update(obj)
        }else {
          var jobData=jobDataFromRow(cell.getRow())
          updateJob('update','Jobs',Object.keys(jobData),Object.values(jobData),'jobID',cell.getData().jobID).then(function(e){
            window.dispatchEvent(new CustomEvent("jobsChanged", {data: jobData}))
          })
          if (cell.getField()=='jobCPIselect') {
            updateCPIs(cell.getValue(),cell.getData().jobID).then(function(e){
              window.dispatchEvent(new CustomEvent("jobsChanged", {data: cell.getData()}))
            })
            cell.getElement().style.border="initial"
          }
        }
      }
      var rowData=cell.getRow().getData()
      if (['endDate','startDate'].includes(cell.getField()) && rowData.startDate!=="" && rowData.endDate!=="" && rowData.startDate>rowData.endDate) {
        alert("Start date cannot be after end date")
        var obj={}
        obj[cell.getField()]=cell.getOldValue()
        cell.getRow().update(obj)
      }
      if (cell.getField()=='endDate') {
        cell.getRow().update({dataDate:dateIf(addBusinessDays(cell.getValue(),1),"-","r")})
      }
      if (cell.getField()=='shiftSelect' && rowData.shiftSelect) {
        let ph=rowData.hourlyTarget
        let cont=0.3
        getAvgWage().then(e=>{
          let avgWage=rowData.shiftSelect=="Day"?e.day.avgWage:e.eve.avgWage
          let cpi=(avgWage/cont)/ph
          cell.getRow().getCell('jobCPI').setValue(cpi.toFixed(2))
        })
      }
      if (cell.getField()=='typeSelect') {
        if (!cell.getValue().includes("CATI")) {
          cell.getRow().update({hourlyTarget:"",shiftSelect:""})
        }
        cell.getRow().reformat()
      }
      cell.getRow().reformat()
    },
    dataLoaded:function(data){
      var obj={}
      var tab=this
      Object.assign(obj, blankDrRow)
      this.addRow(obj, false).then(function(row){
        row.reformat()
        tab.redraw()
      })
    },
  })

})
