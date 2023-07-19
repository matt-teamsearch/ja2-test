$(document).ready(function () {
  const datesTable = new Tabulator("#datesTable", {
    data:datesData,
    autoResize:true,
    layout:"fitColumns",
    index:"dateID",
    headerSort:false,
    rowFormatter:function(row){
      if(row.getData().dateID == -1){
        row.getElement().style.backgroundColor = "rgb(255 255 255)";
        row.getElement().style['box-shadow'] = "rgb(102 142 212 / 33%) 0px 0px 20px 8px inset";
      }else {
        row.getElement().style.backgroundColor = "unset";
        row.getElement().style['box-shadow'] = "unset";
      }
    },
    columns:[
      {title:"dateID", visible:false, field:"dateID",},
      {title:"sqlCol", visible:false, field:"sqlCol",},
      {title:"dateName", headerSort:false, field:"dateName", editor:"input", editable: dateNameEditCheck},
      {
        columns:[
        {title:"dateValue", field:"dateValue", formatter:"datetime", cssClass: 'noRightBorder', formatterParams:{
          inputFormat:"YYYY-MM-DD",
          outputFormat:"DD/MM/YY",
          invalidPlaceholder:"N/A",
        }, editor:dateEditor, sorter:"date", width:130, sorterParams:{format:"YYYY-MM-DD"}},
        {formatter:naIcon, field:"dateNA", width:70, hozAlign:"center", cellClick:naClick},
        ],
      },
      {title:"note", headerSort:false, field:"note", editor:"input", widthGrow:3, editable: dateNoteEditCheck},
      {formatter:addRemIcon, width:60, hozAlign:"center", cellClick:addRemClick, cssClass:'addRemCol'}
    ],
    rowUpdated:function(row){
      row.reformat()
    },
    cellEdited:function(cell){
      var id=cell.getData().dateID
      var dateName=cell.getData().dateName
      var dateValue=cell.getData().dateValue
      if ((cell.getField()=='dateValue' || (cell.getField()=='dateName' && dateName)) && id>-1) {
        if (id==0) {
          var newDate=checkDate(cell.getValue(),cell.getData().jobID,"start")
          updateJob('update','Jobs',[cell.getData().sqlCol],[newDate],'jobID',cell.getData().jobID)
          if (cell.getValue()>cell.getOldValue()) {
            changeDate(cell.getData().sqlCol,cell.getOldValue(),cell.getValue(),cell.getData().jobID)
          }
          cell.getRow().update({dateValue:newDate})
          if (confirm("You have changed the start date. Would you like to move all other dates according to this change?")) {
            let newSt=new Date(dateValue)
            let oldSt=new Date(cell.getOldValue())
            let days=getBusinessDatesCount(oldSt,newSt)
            cell.getTable().getRows().forEach((row, i) => {
              if (row.getData().dateID>0 && row.getData().dateValue!="N/A" && row.getData().dateValue) {
                let thisDate=new Date(row.getData().dateValue)
                row.getCell('dateValue').setValue(dateIf(addBusinessDays(thisDate,days),"-","r"))
              }
            });
          }
        }else if (id==1) {
          var newDate=checkDate(cell.getValue(),cell.getData().jobID,"end")
          if (cell.getValue()>cell.getOldValue()) {
            changeDate(cell.getData().sqlCol,cell.getOldValue(),cell.getValue(),cell.getData().jobID)
          }
          updateJob('update','Jobs',[cell.getData().sqlCol],[newDate],'jobID',cell.getData().jobID)
          cell.getRow().update({dateValue:newDate})
        }else if (id<4) {
          updateJob('update','Jobs',[cell.getData().sqlCol],[cell.getValue()],'jobID',cell.getData().jobID)
        }else{
          updateJob('update','JobDates',[cell.getField()],[cell.getValue()],'dateID',id)
        }
      }else if (cell.getField()=='note') {
        updateNote('edit-group-page',id,cell.getData().note,'datesTable',cell.getData().jobID)
      }
    },
    dataLoaded:function(data){
      this.addRow({dateID:-1, jobID:data[0].jobID, sqlCol: '',dateName: "", dateValue: "", note: ""}, false)
    },
  })
})
