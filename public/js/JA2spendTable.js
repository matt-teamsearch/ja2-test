var supplierVals=getSuppliers()
var jobList=getProjectJobs(projectID)
$(document).ready(function () {
  const spendTable = new Tabulator("#spendTable", {
    ajaxURL:'/get-project-spends/'+projectID,
    autoResize:true,
    layout:"fitColumns",
    index:"spendID",
    headerSort:false,
    selectable:true,
    rowFormatter:function(row){
      row.getCells().forEach((cell, i) => {
        // cell.getElement().style.height= "29px";
        cell.getElement().style.padding= "4px";
        cell.getElement().style.height= "29px";
      })
      if(row.getData().spendID == -1){
        row.getElement().style.backgroundColor = "rgb(255 255 255)";
        row.getElement().style.height= "30px";
        row.getElement().style['box-shadow'] = "rgb(102 142 212 / 33%) 0px 0px 20px 8px inset";
        row.getElement().style['color'] = "#253ace";
      }else {
        row.getElement().style.backgroundColor = "unset";
        row.getElement().style.height= "30px";
        row.getElement().style['box-shadow'] = "unset";
        row.getElement().style['color'] = "initial";
      }
    },
    columns:[
      // {formatter:"rowSelection", titleFormatter:"rowSelection", download:false, vertAlign:"center", hozAlign:"center", headerSort:false, width:50, minWidth:50},
      // {field:'isSelected',visible:false},
      {title:"projectID", visible:false, field:"projectID"},
      {title:"spendID", visible:false, field:"spendID"},
      {title:"Date", headerFilter:false, field:"spendDate", editor:dateEditor,editable:isTrackerSpend,cellClick:trackerSpendClick,formatter:function(cell){return cell.getValue()?moment(cell.getValue()).format("DD/MM/YYYY"):''}},
      {title:"Type", headerFilter:false, field:"typeID", editor:"select",editable:isTrackerSpend,cellClick:trackerSpendClick, editorParams:{values:costTypeVals}, formatter:function(cell, formatterParams, onRendered){return costTypeVals[cell.getValue()]}},
      {title:"Target Grp", visible:true, headerFilter:false, field:"jobID", editor:"select",editable:isTrackerSpend,cellClick:trackerSpendClick, editorParams:{values:jobList}, formatter:function(cell, formatterParams, onRendered){return jobList[cell.getValue()]}},
      {title:"spendTypeCat", visible:false, field:"spendTypeCat"},
      {title:"Supplier",headerFilter:"autocomplete",headerFilterParams:{values:supplierVals,showListOnEmpty:true,allowEmpty:true}, headerSort:false, field:"supplierID", editor:"autocomplete",editable:isTrackerSpend,cellClick:trackerSpendClick, editorParams:{values:supplierVals,freetext:false}, formatter:function(cell, formatterParams, onRendered){return supplierVals[cell.getValue()]}},
      {title:"PO", headerFilter:true, field:"PO", editor:"input", editable: true},
      {title:"Spend", headerFilter:false, field:"spendValue",cssClass: 'noRightBorder', topCalc:'sum', topCalcFormatter:'money', topCalcFormatterParams:{symbol:"£"}, formatter:"money", formatterParams:{symbol:"£"}, editor:false, width:100},
      {title:"", headerFilter:false, field:"spendUnits", cssClass: 'noRightBorder', editor:"number", width:40,editable:isTrackerSpend,cellClick:trackerSpendClick},
      {title:"", headerFilter:false, formatter: xIcon, cssClass: 'noRightBorder', width:5},
      {title:"", headerFilter:false, field:"spendUnitValue", formatter:"money", formatterParams:{symbol:"£"}, editor:"number", width:80,editable:isTrackerSpend,cellClick:trackerSpendClick},
      {title:"Inv. received", headerFilter:false, topCalc:function(values){return values.filter(el=>el==true).length},field:"invReceived", formatter:"tickCross",formatterParams:{allowEmpty:true}, editor:"tickCross", editable: function(cell){return isAccountsAdmin && cell.getData().spendID>-1}},
      {title:"Inv. correct", headerFilter:false, topCalc:function(values){return values.filter(el=>el==true).length}, field:"invCorrect", formatter:"tickCross",formatterParams:{allowEmpty:true}, editor:"tickCross", editable: function(cell){return isAccountsAdmin && cell.getData().spendID>-1 && cell.getData().invReceived}},
      {title:"Note", headerFilter:false, field:"note", editor:"input", editable: spendNoteEditCheck},
      {formatter:spendAddRemIcon, headerFilter:false, width:60, hozAlign:"center", cellClick:spendAddRemClick, cssClass:'addRemCol'}
    ],
    rowUpdated:function(row){
      row.reformat()
    },
    cellEdited:function(cell){
      if (cell.getField()=='typeID') {
        var label=costTypeVals[cell.getValue()]
        var cat=label.split("[")[1]?label.split("[")[1].replace("]",""):''
        cell.getRow().getCell('spendTypeCat').setValue(cat)
        callForRefresh()
      }else if (cell.getField()=='spendUnits' || cell.getField()=='spendUnitValue') {
        var val=cell.getData().spendUnits*cell.getData().spendUnitValue
        if (val) {
          cell.getRow().getCell('spendValue').setValue(cell.getData().spendUnits*cell.getData().spendUnitValue)
        }
        callForRefresh()
      }else if (cell.getField()=='note') {
        updateNote('overview',cell.getData().spendID,cell.getValue(),'spendTable',cell.getData().projectID)
      }else if (cell.getField()=='supplierID' && !isFinite(cell.getValue())) {
        if (confirm("Are you sure you want to add '"+cell.getValue()+"' as a new supplier?")) {
          var sid=addSupplier(cell.getValue())
          supplierVals[sid]=cell.getValue()
          cell.setValue(sid)
          cell.getRow().reformat()
        }else {
          cell.setValue('')
        }
      }
      if (cell.getData().spendID>-1) {
        updateSpend(cell.getData()).then(function(e){
          window.dispatchEvent(new CustomEvent("budgetSpendChanged"))
        })
      }
    },
    dataLoaded:function(data){
      this.addRow({projectID:projectID, spendID:-1, spendName:'', spendType:'', spendTypeCat:'', spendValue:0, spendUnits:0, spendUnitValue:0,note:'',supplierID:'',PO:'',invReceived:false}, false).then(function(row){row.reformat()})
    },
    // rowSelectionChanged:function(data, rows){
    //   this.getRows().forEach((row, i) => {
    //     row.update({isSelected:row.isSelected()})
    //   });
    //   this.recalc()
    // },
  })
})
