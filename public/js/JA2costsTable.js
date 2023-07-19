var costTypeVals=getCostTypes()
$(document).ready(function () {
  const costsTable = new Tabulator("#costsTable", {
    data:costsData,
    autoResize:true,
    layout:"fitColumns",
    index:"costID",
    headerSort:false,
    rowFormatter:function(row){
      rowStyle(row.getData().costID,row)
    },
    columns:[
      {title:"projectID", visible:false, field:"projectID"},
      {title:"costID", visible:false, field:"costID"},
      {title:"sqlCol", visible:false, field:"sqlCol"},
      {title:"Name", headerSort:false, field:"costName", editor:"input", topCalc: function(){return 'Total budget'}, editable: costNameEditCheck},
      {title:"Type", headerSort:false, field:"costType", editor:"select", editable: costTypeEditCheck, editorParams:{values:costTypeVals}, formatter:function(cell, formatterParams, onRendered){return costTypeVals[cell.getValue()]}},
      {title:"costTypeCat", visible:false, field:"costTypeCat"},
      {
        columns:[
          {title:"Total", field:"costValue", topCalc:"sum", topCalcFormatter:"money", topCalcFormatterParams:{symbol:"£"}, formatter:"money", formatterParams:{symbol:"£"}, editor:false, width:100},
          {title:"Units", field:"costUnits", cssClass: 'noRightBorder', editor:"number", width:40},
          {title:"", formatter: xIcon, cssClass: 'noRightBorder', width:5},
          {title:"Price", field:"costUnitValue", formatter:"money", formatterParams:{symbol:"£"}, editor:"number", width:80}
        ],
      },
      {title:"note", headerSort:false, field:"note", editor:"input", editable: costNoteEditCheck},
      {formatter:costAddRemIcon, width:60, hozAlign:"center", cellClick:costAddRemClick, cssClass:'addRemCol'}
    ],
    rowUpdated:function(row){
      row.reformat()
    },
    cellEdited:function(cell){
      if (cell.getField()=='costType') {
        var label=costTypeVals[cell.getValue()]
        var cat=label.split("[")[1]?label.split("[")[1].replace("]",""):''
        cell.getRow().getCell('costTypeCat').setValue(cat)
      }else if (cell.getField()=='costUnits' || cell.getField()=='costUnitValue') {
        var val=cell.getData().costUnits*cell.getData().costUnitValue
        if (val>=0) {
          cell.getRow().getCell('costValue').setValue(val)
        }
      }else if (cell.getField()=='note') {
        updateNote('close-project',cell.getData().costID,cell.getValue(),'costsTable',cell.getData().projectID)
      }
      if (cell.getData().sqlCol=="" && cell.getData().costID>-1) {
        updateCost(cell.getData().costID,cell.getData().costName,cell.getData().costUnitValue,cell.getData().costUnits,cell.getData().projectID,cell.getData().costType)
      }else if (cell.getData().costID>-1) {
        updateJob('update','Projects',[cell.getData().sqlCol],[cell.getData().costValue],'projectID',cell.getData().projectID)
        updatePage(cell.getData().sqlCol,cell.getData().costValue)
      }
      if (cell.getData().costID>-1) {
        window.dispatchEvent(new CustomEvent("budgetSpendChanged", {data: cell.getData()}))
        window.dispatchEvent(new CustomEvent("budgetChanged", {data: cell.getData()}))
      }
    },
    dataLoaded:function(data){
      this.addRow({projectID:data[0].projectID, costID:-1, sqlCol: '', costName:'', costType:'', costTypeCat:'', costValue:0, costUnits:0, costUnitValue:0,note:''}, false).then(function(row){
        row.reformat()
      })
    },
  })
})
