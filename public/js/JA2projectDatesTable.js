$(document).ready(function () {
  const datesTable = new Tabulator("#projectDatesTable", {
    ajaxURL:'/get-project-dates/'+projectID,
    autoResize:true,
    layout:"fitColumns",
    index:"dateID",
    headerSort:false,
    rowFormatter:function(row){
      rowStyle(row.getData().dateID,row)
    },
    movableRows: true,
    columns:[
      {title:"dateID", visible:false, field:"dateID",},
      {title:"datePos", visible:false, field:"datePos"},
      {title:"dateName", headerSort:false, field:"dateName", editor:"input", editable: true},
      {
        columns:[
        {title:"dateValue", field:"dateValue", formatter:"datetime", cssClass: 'noRightBorder', formatterParams:{
          inputFormat:"YYYY-MM-DD",
          outputFormat:"DD/MM/YY",
          invalidPlaceholder:"TBC",
        }, editor:dateEditor, sorter:"date", width:130, sorterParams:{format:"YYYY-MM-DD"}},
        {formatter:tbcIcon, field:"dateNA", width:70, hozAlign:"center", cellClick:tbcClick, cssClass:'naCol'},
        ],
      },
      {title:"note", headerSort:false, field:"note", editor:"input", widthGrow:3, editable: dateNoteEditCheck},
      {formatter:addRemIcon, width:60, hozAlign:"center", cellClick:addRemProjectDateClick, cssClass:'addRemCol'}
    ],
    rowUpdated:function(row){
      row.reformat()
      window.dispatchEvent(new CustomEvent("datesChanged"))
    },
    rowMoved:function(row){
      row.getTable().getRows().forEach((row2, i) => {
        if (row2.getData().dateID>-1) {
          row2.update({datePos:row2.getPosition(true)})
          updateJob('update','ProjectDates',['datePos'],[row2.getData().datePos],'dateID',row2.getData().dateID)
        }
      });
    },
    cellEdited:function(cell){
      var id=cell.getData().dateID
      if (id>-1) {
        var dateName=cell.getData().dateName
        var dateValue=cell.getData().dateValue
        if ((cell.getField()=='dateValue' || (cell.getField()=='dateName' && dateName))) {
          updateJob('update','ProjectDates',[cell.getField()],[cell.getValue()],'dateID',id)
        }else if (cell.getField()=='note') {
          updateNote('edit',id,cell.getData().note,'projectDatesTable',projectID)
        }
      }
    },
    dataLoaded:function(data){
      this.addRow({dateID:-1, projectID:projectID, dateName: "", dateValue: "", note: "", datePos:9999}, false).then(this.setSort("datePos", "asc"))
      window.dispatchEvent(new CustomEvent("datesChanged"))
    },
  })

  let ganttClick=function(e,cell){
    let thisDate=moment(cell.getField().split("_")[1])
    if ($(cell.getRow().getElement()).hasClass("editing")) {
      let stDate=moment(cell.getRow().getCells().find(el=>$(el.getElement()).hasClass("selected")).getField().split("_")[1])
      if (stDate<=thisDate) {
        cell.getRow().update({startDate:stDate.format("YYYY-MM-DD"),endDate:thisDate.format("YYYY-MM-DD")})
      }else {
        cell.getRow().reformat()
      }
      $('.tabulator-cell.selected').removeClass("selected")
      $('.tabulator-cell.editing').removeClass("editing")
      $('.tabulator-row.editing').removeClass("editing")
      $(document).off('mousemove')
    }else {
      $(cell.getElement()).addClass("selected")
      $(cell.getRow().getElement()).addClass("editing")
      cell.getRow().getCells().filter(el=>el.getField().indexOf('calDate')>-1).forEach((rcell, i) => {
        $(rcell.getElement()).css("background","initial")
        if (moment(rcell.getField().split("_")[1])>thisDate) {
          $(rcell.getElement()).addClass("editing")
        }
      });
      $(document).on('mousemove',function(e){
        let x=e.pageX
        cell.getRow().getCells().filter(el=>$(el.getElement()).hasClass("editing")).forEach((rcell, i) => {
          if (x>rcell.getElement().getBoundingClientRect().left) {
            $(rcell.getElement()).addClass("newDate")
          }else {
            $(rcell.getElement()).removeClass("newDate")
          }
        })
      })
    }
  }


  function makeInterval(arr,startField,newName,end,isEnd){
    if (isEnd) {
      let en=arr.find(el=>el.dateName==startField)
      let stDate=moment(addBusinessDays(st.dateValue, end)).format("YYYY-MM-DD")
      if (en) {
        let newEv=en
        newEv.dateName=newName
        newEv.endDate=newEv.dateValue
        newEv.dateValue=stDate
        arr.splice(arr.indexOf(en),1,newEv)
      }
    }else {
      let st=arr.find(el=>el.dateName==startField)
      let en=arr.find(el=>el.dateName==end)
      if (en) {
        arr.splice(arr.indexOf(en),1)
      }
      if (st) {
        let endDate=en?en.dateValue:moment(addBusinessDays(st.dateValue, end)).format("YYYY-MM-DD")
        let newEv=st
        newEv.dateName=newName
        newEv.endDate=endDate
        arr.splice(arr.indexOf(st),1,newEv)
      }
    }
    return arr
  }
  let dateVals
  let st
  let en
  const datesGantt = new Tabulator("#projectDatesGantt", {
    ajaxURL:'/get-project-dates/'+projectID,
    ajaxResponse:(url,params,response)=>{
      dateVals=response.filter(el=>el.dateValue).map(el=>new Date(el.dateValue))
      st=moment(Math.min.apply(null,dateVals))
      en=moment(Math.max.apply(null,dateVals))
      response=makeInterval(response,'Pilot start','Fieldwork pilot','Pilot end')
      response=makeInterval(response,'Field start','Fieldwork','Field end')
      response=makeInterval(response,'Scripting','Scripting',2)
      response=makeInterval(response,'Tabs','Data & Tabs creation',-3,true)
      if (en.diff(st,'d')>300) {
        alert("Cannot show dates chart, the period between earliest and latest date is too large.")
      }
      response=response.map(task=>{
        let obj={}
        obj.projectID=projectID
        obj.dateID=task.dateID
        obj.dateName=task.dateName
        obj.datePos=task.datePos
        let taskSt=new Date(task.dateValue).getTime()
        let taskEn=new Date(task.endDate).getTime()
        obj.startDate=task.dateValue
        obj.endDate=task.endDate
        let thisDte=new Date(task.dateValue)
        if (en.diff(st,'d')<300) {
          for (var i = 0; i <= Math.ceil(en.diff(st,'d')); i++) {
            thisDte.setDate(thisDte.getDate() + 1);
            if ((!task.endDate && thisDte.getTime()==taskSt) || (thisDte.getTime()>=taskSt && thisDte.getTime()<=taskEn)) {
              obj['calDate_'+moment(thisDte).format("YYYY-MM-DD")]=true
            }
          }
        }
        return obj
      })
      return response
    },
    autoColumns:true,
    autoColumnsDefinitions:defs=>{
      let ganttCols=[
        {field:'',frozen:true,formatter:addRemIcon, width:25, hozAlign:"center", cellClick:addRemProjectGanttClick, cssClass:'addRemCol'},
        {field:'datePos',frozen:true,visible:false},
        {field:'dateName',frozen:true, editor:"input",title:'',cssClass:'ganttTask',width:150},
        {field:'startDate',frozen:true, editor:dateTimeEditor,title:'',cssClass:'ganttTask',width:60,formatter:cell=>cell.getValue()?moment(cell.getValue()).format("DD/MMM"):'TBC'},
        {field:'endDate',frozen:true, editor:dateTimeEditor,title:'',cssClass:'ganttTask',width:60,formatter:cell=>cell.getValue()?moment(cell.getValue()).format("DD/MMM"):(cell.getData().startDate?moment(cell.getData().startDate).format("DD/MMM"):'TBC')},
        {formatter:tbcIcon,frozen:true, field:"dateNA", width:40, hozAlign:"center", cellClick:tbcClick, cssClass:'naCol'},
      ]
      st=moment(Math.min.apply(null,dateVals))
      en=moment(Math.max.apply(null,dateVals))
      if (en.diff(st,'d')<300) {
        for (var i = 0; i <= Math.ceil(en.diff(st,'d')/7); i++) {
          let mon=moment(st).add(i,'w').isoWeekday(1)
          let ganttWeek=[]
          for (var x = 0; x <= 4; x++) {
            let d=moment(mon).add(x,'d')
            ganttWeek.push({field:'calDate_'+d.format("YYYY-MM-DD"),title:d.format("dd"),width:25,cssClass:(d.isSame(moment(),'d')?'ganttToday':'ganttCell'),cellClick:ganttClick,formatter:cell=>'',mutator:(val,data)=>(d.valueOf()>=moment(data.startDate).valueOf() && d.valueOf()<=moment(data.endDate?data.endDate:data.startDate).valueOf())})
          }
          ganttCols.push({title:'w/c '+mon.format("DD/MM/YY"),columns:ganttWeek})
        }
      }
      return ganttCols
    },
    autoResize:false,
    layout:"fitColumns",
    headerSort:false,
    movableRows: true,
    rowFormatter:(row)=>{
      if (row.getData().dateID==-1) {
        row.getElement().style.backgroundColor = "rgb(255 255 255)";
        row.getElement().style['box-shadow'] = "rgb(102 142 212 / 33%) 0px 0px 20px 8px inset";
        row.getElement().style['color'] = "#253ace";
        row.getElement().style['margin-top']= "10px";
      }else {
        row.getElement().style.backgroundColor = "initial";
        row.getElement().style['box-shadow'] = "none";
        row.getElement().style['color'] = "initial";
        row.getElement().style['margin-top']= "initial";
        row.getCells().filter(cell=>cell.getField().indexOf('calDate')>-1).forEach((cell, i) => {
          if (cell.getValue()) {
            $(cell.getElement()).css("background","var(--primary)")
          }else {
            $(cell.getElement()).css("background","initial")
          }
        });
      }
    },
    rowMoved:function(row){
      row.getTable().getRows().forEach((row2, i) => {
        if (row2.getData().dateID>-1) {
          row2.update({datePos:row2.getPosition(true)})
          updateJob('update','ProjectDates',['datePos'],[row2.getData().datePos],'dateID',row2.getData().dateID)
        }
      });
    },
    rowUpdated:function(row){
      let data=row.getData()
      if (data.dateID>-1) {
        updateJob('update','ProjectDates',['dateName','datePos','dateValue','endDate'],[data.dateName,data.datePos,data.startDate,data.endDate],'dateID',data.dateID).then(e=>{
          datesTable.setData()
        })
      }
      row.reformat()
    },
    dataLoaded:function(data){
      this.addRow({dateID:-1, projectID:projectID, dateName: "", startDate: "", note: "", datePos:9999}, false).then(this.setSort("datePos", "asc"))
      let table=this
    },
    cellEdited:function(cell){
      let data=cell.getData()
      let obj={}
      cell.getRow().getCells().filter(cell=>cell.getField().indexOf('calDate')>-1).forEach((cell2, i) => {
        let d=moment(cell2.getField().split("_")[1])
        if (d.valueOf()>=moment(data.startDate).valueOf() && d.valueOf()<=moment(data.endDate?data.endDate:data.startDate).valueOf()) {
          obj[cell2.getField()]=true
        }else {
          obj[cell2.getField()]=false
        }
      });
      cell.getRow().update(obj).then(e=>{
        cell.getRow().reformat()
      })

    }
  })
})
