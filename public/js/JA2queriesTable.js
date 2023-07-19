$(document).ready(function () {
  const queriesTable = new Tabulator("#queriesTable", {
    ajaxURL:"/get-project-queries/"+projectID,
    autoResize:true,
    layout:"fitColumns",
    responsiveLayout:"hide",
    index:"queryID",
    height:'60vh',
    history:true,
    historyUndo:function(action, component, data){
      console.log(action,component, data)
    },
    initialSort:[
        {column:"queryPos", dir:"asc"},
    ],
    keybindings:{
      "scrollToStart" : false,
      "scrollToEnd" : false,
    },
    movableRows: true,
    clipboard:false,
    resizableRows:false,
    // selectableRangeMode:"click",
    selectable:true,
    clipboardPasteAction:function(rowData){
      console.log(rowData)
      rowData.forEach((row, i) => {
        var thisQuery=row.queryID
        row.query=thisQuery
        row.queryID=-1
      });
      return this.table.addData(rowData,false)
    },
    clipboardPasteError:function(clipboard){
      console.log("error",clipboard)
    },
    rowFormatter:function(row){
      // rowStyle(false,row)
    },
    ajaxResponse:function(url, params, response){
      let raw=JSON.parse(JSON.stringify(response))
      console.log("ajaxResponse",raw)
      response.forEach((row, r) => {
        if (row.replyData) {
          for (var i = 0; i < row.replyData.length; i++) {
            response[r]["reply"+i]=row.replyData[i].from+": "+row.replyData[i].reply
          }
        }
      });
      console.log("editedResponse",response)
      return response; //return the tableData property of a response json object
    },
    movableRows: true,
    autoResize:false,
    columns:[
      {rowHandle:true, formatter:"handle", headerSort:false, frozen:true, width:30, download:false},
      {formatter:"rowSelection", field:"rowSelection", titleFormatter:"rowSelection", cssClass:"rowSelection", download:false, vertAlign:"center", hozAlign:"center", headerSort:false, frozen:true, width:50, minWidth:50},
      {title:"queryID", visible:false, width:30, field:"queryID"},
      {title:"projectID", visible:false, field:"projectID"},
      {title:"queryPos", visible:false, width:20, field:"queryPos"},
      {title:"seenDate", visible:false, width:20, field:"seenDate"},
      {title:"Group", visible:false, widthGrow:1, widthShrink:1, field:"jobID", editor:"select", responsive:3, editorParams:{
        values:jobList
      }, formatter:function(cell, formatterParams, onRendered){return jobList[cell.getValue()]}},
      {title:"Raised by", sorter:sortStaff, widthGrow:1, widthShrink:1, editable:isUserAuthor, vertAlign:"center", accessorDownload:downloadStaffID, responsive:2, field:"raisedByID", editor:"select", headerFilter:"autocomplete", headerFilterPlaceholder:"Filter...", headerFilterParams:{
        values:true,
        sortValuesList:'asc',
        listItemFormatter:function(value, title){ //prefix all titles with the work "Mr"
          return staffInitials[value];
        },
        showListOnEmpty:true,
        allowEmpty:true,
      }, editorParams:{
        values:raisedByInitials,
        listItemFormatter:staffSelect,
        sortValuesList:'asc'
      }, formatter:function(cell, formatterParams, onRendered){return staffInitials[cell.getValue()]}},
      {title:"Raised for", sorter:sortStaff, widthGrow:1, widthShrink:1, vertAlign:"center", field:"raisedForID", accessorDownload:downloadStaffID, responsive:1, editor:"select", headerFilter:"autocomplete", headerFilterPlaceholder:"Filter...", headerFilterParams:{
        values:true,
        sortValuesList:'asc',
        listItemFormatter:function(value, title){ //prefix all titles with the work "Mr"
          return staffInitials[value];
        },
        showListOnEmpty:true,
        allowEmpty:true,
      }, editorParams:{
        values:staffInitials,
        listItemFormatter:staffSelect,
        sortValuesList:'asc'
      }, formatter:function(cell, formatterParams, onRendered){return staffInitials[cell.getValue()]}},
      {title:"Date raised", sorter:"date", sorterParams:{format:"YYYY-MM-DD HH:ii",alignEmptyValues:"bottom"}, widthGrow:1, widthShrink:1, vertAlign:"center", editable:isUserAuthor, accessorDownload:downloadDate, responsive:2, field:"raisedDate", formatter:"datetime", formatterParams:{
        inputFormat:"YYYY-MM-DD HH:ii",
        outputFormat:"DD/MMM",
        invalidPlaceholder:"TBC",
      }, editor:dateTimeEditor, sorter:"date"},
      {title:"Type", widthGrow:1, widthShrink:1, field:"queryCat", editor:"select", headerFilterPlaceholder:"Filter...", responsive:3, editorParams:{
        values:typeList
      }, headerFilter:"autocomplete", headerFilterParams:{
        values:true,
        sortValuesList:'asc',
        showListOnEmpty:true,
        allowEmpty:true,
      }},
      {title:"", width:30, formatter:urgentBtn, cellClick:urgentClick, download:false, cssClass:"noPadding noRightBorder", vertAlign:"center", widthShrink:1,field:"isUrgent", formatterParams:{allowTruthy:true}, hozAlign:"center"},
      {title:"Query", headerFilter:"input", headerFilterFunc:queryFilter, headerFilterPlaceholder:"Search queries & replies...", field:"query", formatter:queryFormatter, widthGrow:6, vertAlign:"center", cssClass:'queryCell noRightBorder', editable:isUserAuthor, editor:queryEditor, responsive:0},
      {title:"", widthGrow:1, formatter:queryImgFormat, cssClass:"queryImgCell", download:false, vertAlign:"center", widthShrink:1, field:"queryImages", hozAlign:"center"},
      {title:"Addressed", widthGrow:1, formatter:"tickCross", vertAlign:"center", widthShrink:1,field:"repliesCount", formatterParams:{allowTruthy:true}, hozAlign:"center", accessorDownload:downloadYN},
      {title:"Resolved", widthGrow:1, formatter:"tickCross", vertAlign:"center", widthShrink:1,field:"resolved", formatterParams:{allowTruthy:true}, hozAlign:"center", accessorDownload:downloadYN},
      {formatter:replyIcon, download:false, width:30, headerSort:false, hozAlign:"center", cssClass:"noPadding", cellClick:queryReplyClick},
      {title:"newRepliesCount", visible:false, width:20, field:"newRepliesCount"},
      {title:"", visible:false, field:"replyData"},
      {title:"Replies", visible:false, download:true, field:"replyDL", accessorDownload:downloadYN},
    ],
    groupHeader: function(value, count, data, group){
      var ret=value
      if (['raisedForID','raisedByID'].includes(group.getField())) {
        ret=staffInitials[value]
      }
      return ret + "<span style='margin-left:10px;'>(" + count + " items)</span>";
    },
    dataSorted:function(sorters, rows){
      rows.forEach((row, i) => {
        if (row.getData().queryID==-1) {
          row.move(rows[rows.length-1], false);
        }
      });
    },
    cellEditCancelled:function(cell){
      cell.getRow().reformat()
      // cell.getTable().redraw()
    },
    rowUpdated:function(row){
      row.reformat()
    },
    rowClick:function(e, row){
      // e.preventDefault()
      var table=row.getTable()
      if ($(e.path[0]).attr('tabulator-field')!='rowSelection') {
        row.toggleSelect()
      }
    },
    rowMoved:function(row){
      setPostitionsAfter(row)
    },
    cellEdited:function(cell){
      queryCellEdited(cell)
    },
    dataLoaded:function(data){
      console.log("dataLoaded",data)
      var table=this
      var unseen=data.filter(el=>el.seenDate==null)
      addEventSeen('ProjectQueries',unseen.map(el=>el.queryID),unseen.map(el=>projectID))
      updateQMcount(projectID)
      var obj={}
      Object.assign(obj, blankQueryRow)
      table.addRow(obj, false)
      table.redraw()
    },
  })
})
